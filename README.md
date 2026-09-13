# Academic Diary — AI + Push Notifications

This version includes:
- Firebase Auth + Firestore
- Mobile responsive diary/timetable/assignments
- AI timetable parsing for PDF/PNG/JPG/WEBP
- AI preview + edit before saving
- Firebase Cloud Messaging web push
- Before-class reminders
- After-class diary prompts
- Firebase scheduled Cloud Function running every minute

## 1) Frontend VAPID key
Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair.
Copy the PUBLIC key into `app.js`:

```js
const VAPID_PUBLIC_KEY='YOUR_PUBLIC_VAPID_KEY';
```

The public VAPID key is safe to put in the frontend. Never put the VAPID private key or OpenAI API key in frontend code.

## 2) Deploy backend
Install Firebase CLI, login, then from this folder:

```bash
cd functions
npm install
cd ..
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions,firestore
```

When prompted for `OPENAI_API_KEY`, paste your OpenAI API key. It is stored as a Firebase secret and is NOT sent to the browser.

## 3) Deploy frontend
Upload the root frontend files to GitHub and deploy the repo on Vercel.

## 4) Enable notifications
Open the deployed site → Login → Settings → **Enable phone notifications** → Allow browser notifications.
Do this once on every phone/browser you want to receive reminders on.

## 5) AI timetable
Open Timetable → upload timetable PDF/image → Analyze timetable → review/edit → Save.

## Important
- Firebase Cloud Functions + scheduled reminders require a billing-enabled Firebase/Google Cloud project.
- Web push requires HTTPS. Vercel provides HTTPS.
- Scheduled function creates a Cloud Scheduler job automatically.
