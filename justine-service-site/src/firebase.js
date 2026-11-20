import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBmm9nKCknpmgP8UpyU64mD52RrIUOy41k',
  authDomain: 'my-website-6f396.firebaseapp.com',
  projectId: 'my-website-6f396',
  storageBucket: 'my-website-6f396.firebasestorage.app',
  messagingSenderId: '242174998106',
  appId: '1:242174998106:web:01ed1eb94929409550ca63',
  measurementId: 'G-28YVVT23XD',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics only works in supported browsers; never let it break the site
isSupported().then((ok) => ok && getAnalytics(app)).catch(() => {});
