import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCxPT3R3ItntkIlftK148tZpo1oC7_JHQk",
  authDomain: "family-finance-4571e.firebaseapp.com",
  projectId: "family-finance-4571e",
  storageBucket: "family-finance-4571e.firebasestorage.app",
  messagingSenderId: "1002432650197",
  appId: "1:1002432650197:web:b53b38bbae0eb865ecfb5c"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);
