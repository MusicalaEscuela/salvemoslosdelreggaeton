import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmuC35w1AJyibk8I0ORZI1xT09agtBsxw",
  authDomain: "salvemoslos-del-reggaeton.firebaseapp.com",
  projectId: "salvemoslos-del-reggaeton",
  storageBucket: "salvemoslos-del-reggaeton.firebasestorage.app",
  messagingSenderId: "560669130775",
  appId: "1:560669130775:web:2c7174880df682880a5c52"
};

const app = initializeApp(firebaseConfig);
const provider = new GoogleAuthProvider();

export const auth = getAuth(app);
export const db = getFirestore(app);

export { GoogleAuthProvider, onAuthStateChanged, provider, signInWithPopup, signOut };
