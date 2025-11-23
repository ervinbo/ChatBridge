// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyCrcDtuajgRuCm3ZO9or_LZ9fS04hMWzYQ",
  authDomain: "concrete-acre-467818-q5.firebaseapp.com",
  databaseURL: "https://concrete-acre-467818-q5-default-rtdb.firebaseio.com",
  projectId: "concrete-acre-467818-q5",
  storageBucket: "concrete-acre-467818-q5.firebasestorage.app",
  messagingSenderId: "538656707491",
  appId: "1:538656707491:web:68e4e0e9d3463c17f3c016"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png' // Ensure you have an icon if possible
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});