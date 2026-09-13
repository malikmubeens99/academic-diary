importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBZhcFXrC_16FLAQ32v9zhrxmg4uWH_g4Y',
  authDomain: 'academic-diary-3a12d.firebaseapp.com',
  projectId: 'academic-diary-3a12d',
  storageBucket: 'academic-diary-3a12d.firebasestorage.app',
  messagingSenderId: '654645926256',
  appId: '1:654645926256:web:872c7cb1ad3425af4e17b5'
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Academic Diary';
  const options = {body: payload.notification?.body || payload.data?.body || 'You have an update.'};
  self.registration.showNotification(title, options);
});
