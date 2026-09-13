const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const OpenAI = require('openai');

admin.initializeApp();
const db = admin.firestore();
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const ALLOWED_TYPES = new Set([
  'image/png','image/jpeg','image/webp','image/gif',
  'application/pdf'
]);

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const match = String(text).match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned invalid JSON');
  return JSON.parse(match[0]);
}

exports.parseTimetable = onCall({secrets:[OPENAI_API_KEY], timeoutSeconds:120, memory:'1GiB'}, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');
  const {fileData, mimeType, fileName} = request.data || {};
  if (!fileData || !mimeType || !ALLOWED_TYPES.has(mimeType)) {
    throw new HttpsError('invalid-argument', 'Upload a PNG/JPG/WEBP image or PDF timetable.');
  }
  if (fileData.length > 15_000_000) throw new HttpsError('invalid-argument', 'File is too large. Keep it under about 11 MB.');

  const client = new OpenAI({apiKey: OPENAI_API_KEY.value()});
  const dataUrl = `data:${mimeType};base64,${fileData}`;
  const prompt = `You are an expert university timetable parser. Read the uploaded timetable image/PDF carefully.
Return ONLY valid JSON in this exact shape:
{"classes":[{"day":"Monday","subject":"Principle of Marketing","start":"08:00","end":"11:00"}]}
Rules:
- Use 24-hour HH:MM times.
- Allowed day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
- Ignore breaks, empty cells, room numbers, teacher names and unrelated headings.
- If the same subject occupies consecutive timetable slots on the same day, MERGE them into one class from the first start to the last end. Example 08:00-09:00 + 09:00-10:00 + 10:00-11:00 becomes 08:00-11:00.
- Do not merge two classes separated by a different subject or a gap.
- Preserve labels such as (TH), (Lab), Section, etc. when they identify a different class.
- Do not invent missing times or subjects.
- Sort by day Monday-Sunday, then start time.
- If uncertain, omit the row rather than guessing.
Filename: ${fileName || 'timetable'}`;

  const content = mimeType === 'application/pdf'
    ? [{type:'input_file', file_data:dataUrl, filename:fileName || 'timetable.pdf'}, {type:'input_text', text:prompt}]
    : [{type:'input_image', image_url:dataUrl}, {type:'input_text', text:prompt}];

  try {
    const response = await client.responses.create({
      model: 'gpt-5-mini',
      input: [{role:'user', content}],
      text: {format: {type:'json_object'}}
    });
    const result = parseJson(response.output_text || '{}');
    const classes = Array.isArray(result.classes) ? result.classes : [];
    return {classes: classes.filter(c => c.day && c.subject && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.end))};
  } catch (err) {
    console.error(err);
    throw new HttpsError('internal', err.message || 'AI timetable parsing failed.');
  }
});

function localNow(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday:'long', hour:'2-digit', minute:'2-digit', hour12:false
  }).formatToParts(now);
  const get = type => parts.find(p => p.type === type)?.value;
  return {day:get('weekday'), hour:Number(get('hour')), minute:Number(get('minute'))};
}

function localDateKey(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
  const get = type => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function mins(hhmm) { const [h,m] = hhmm.split(':').map(Number); return h*60+m; }

async function sendToUser(uid, title, body, data, logKey) {
  const logRef = db.doc(`users/${uid}/notificationLog/${logKey}`);
  const log = await logRef.get();
  if (log.exists) return;

  const snap = await db.collection(`users/${uid}/tokens`).get();
  const tokens = snap.docs.map(d => ({id:d.id, token:d.data().token})).filter(x=>x.token);
  if (!tokens.length) { await logRef.set({sent:false, createdAt:admin.firestore.FieldValue.serverTimestamp()}); return; }

  for (let i=0; i<tokens.length; i += 500) {
    const batch = tokens.slice(i, i+500);
    const result = await admin.messaging().sendEachForMulticast({
      tokens: batch.map(x=>x.token),
      notification:{title, body},
      data:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,String(v)])),
      webpush:{fcmOptions:{link:'/'}},
    });
    const deletions=[];
    result.responses.forEach((r,index)=>{
      if (!r.success && ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code)) {
        deletions.push(db.doc(`users/${uid}/tokens/${batch[index].id}`).delete());
      }
    });
    await Promise.all(deletions);
  }
  await logRef.set({sent:true, createdAt:admin.firestore.FieldValue.serverTimestamp()});
}

exports.sendClassReminders = onSchedule({schedule:'every 1 minutes', timeZone:'UTC', memory:'512MiB'}, async () => {
  const users = await db.collection('users').get();
  const now = new Date();
  for (const u of users.docs) {
    const uid = u.id;
    const data = u.data();
    const p = data.preferences || {};
    const tz = data.timezone || 'Asia/Karachi';
    const local = localNow(tz, now);
    const dateKey = localDateKey(tz, now);
    const current = local.hour*60 + local.minute;
    const classSnap = await db.collection(`users/${uid}/classes`).where('day','==',local.day).get();
    for (const cdoc of classSnap.docs) {
      const c = cdoc.data();
      if (!c.start || !c.end) continue;
      const start = mins(c.start), end = mins(c.end);
      if (p.before !== false) {
        const before = Number(p.beforeMin || 10);
        if (current >= start-before && current < start-before+2) {
          await sendToUser(uid, 'Upcoming class', `${c.subject} starts in ${before} minutes.`, {type:'before', classId:cdoc.id}, `${dateKey}_${cdoc.id}_before_${before}`);
        }
      }
      if (p.after !== false && current >= end && current < end+2) {
        await sendToUser(uid, 'Class finished 📚', `How was your ${c.subject} class? Add today's notes and assignment.`, {type:'after', classId:cdoc.id}, `${dateKey}_${cdoc.id}_after`);
      }
    }
  }
});
