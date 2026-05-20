import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage'; // Uncomment when needed

const firebaseConfig = {
  apiKey: "AIzaSyABg-q_CrYZ2WFimVHE7PLyo_YMcRCEW_4",
  authDomain: "application-49ad2.firebaseapp.com",
  projectId: "application-49ad2",
  storageBucket: "application-49ad2.firebasestorage.app",
  messagingSenderId: "96320468720",
  appId: "1:96320468720:web:ecb0110f9bf5d8b6343435",
  measurementId: "G-VWF9S5G85F"
};

// Initialize Firebase (prevent multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const storage = getStorage(app); // Uncomment when needed

// Auth providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export default app;
