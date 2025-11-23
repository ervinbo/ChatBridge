import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase, ref, update } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
// @ts-ignore
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// TODO: Replace these values with your own Firebase project configuration
// You can get these from the Firebase Console > Project Settings > General > Your Apps
const firebaseConfig = {
  apiKey: "AIzaSyCrcDtuajgRuCm3ZO9or_LZ9fS04hMWzYQ",
  authDomain: "concrete-acre-467818-q5.firebaseapp.com",
  databaseURL: "https://concrete-acre-467818-q5-default-rtdb.firebaseio.com",
  projectId: "concrete-acre-467818-q5",
  storageBucket: "concrete-acre-467818-q5.firebasestorage.app",
  messagingSenderId: "538656707491",
  appId: "1:538656707491:web:68e4e0e9d3463c17f3c016"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);
export const dbFirestore = getFirestore(app); // Export Firestore

// Safe initialization of Messaging
let messagingInstance = null;
try {
  // Check if supported (optional, usually getMessaging throws if not)
  messagingInstance = getMessaging(app);
} catch (error) {
  console.warn("Firebase Messaging failed to initialize (likely not supported in this environment):", error);
}
export const messaging = messagingInstance;

// Wrapper for onMessage to safely use in components
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  try {
    return onMessage(messaging, callback);
  } catch (error) {
    console.warn("Failed to attach foreground message listener", error);
    return () => {};
  }
};

// NOTE: You must generate a Key Pair in Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration
// and paste the Public Key here.
const VAPID_KEY = "YOUR_PUBLIC_VAPID_KEY_FROM_FIREBASE_CONSOLE"; 

export const requestForToken = async (uid: string) => {
  try {
    if (!messaging) {
      console.log('Messaging is not supported/initialized.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Get the token
      // Note: If you haven't set up the VAPID key in console, this might fail or work with default depending on setup.
      // Ideally pass { vapidKey: VAPID_KEY } to getToken.
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY !== "YOUR_PUBLIC_VAPID_KEY_FROM_FIREBASE_CONSOLE" ? VAPID_KEY : undefined 
      });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        // Save token to database
        const tokenRef = ref(db, `users/${uid}/fcmTokens`);
        await update(tokenRef, { [currentToken]: true });
        return true;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return false;
      }
    } else {
      console.log('Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
    return false;
  }
};

export default app;