# Academic Diary — AI Timetable + Phone Notifications

Includes:
- AI timetable parsing from PDF/image
- Editable timetable preview
- Separate BEFORE-class and AFTER-class notification toggles
- Custom before-class reminder time
- Firebase Cloud Messaging web push
- Firebase scheduled class-reminder function
- User timezone support
- Firestore security rules

## Setup

1. In `app.js`, replace `PASTE_YOUR_PUBLIC_VAPID_KEY_HERE` with the PUBLIC Web Push key from:
Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair.

2. Add the OpenAI key from the project root:
```bash
cd functions
npm install
cd ..
firebase functions:secrets:set OPENAI_API_KEY
```

3. Deploy backend:
```bash
firebase deploy --only functions,firestore
```

4. Deploy the project to HTTPS hosting.

5. In the app, open Settings → Enable phone notifications, then independently switch Before class and After class notifications ON/OFF.

6. Upload your timetable from Timetable → Analyze timetable.

The OpenAI API key stays server-side and must not be put in `app.js`.
