
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 👇 Substitua pelos seus dados do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCE6HwzQiWo0gyBCpfpBtkrg_rfm3vMdwM",
  authDomain: "bolao-copa-2026-cyber.firebaseapp.com",
  projectId: "bolao-copa-2026-cyber",
  storageBucket: "bolao-copa-2026-cyber.firebasestorage.app",
  messagingSenderId: "653410503457",
  appId: "1:653410503457:web:74df2360b2ae6dfee20c60"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);