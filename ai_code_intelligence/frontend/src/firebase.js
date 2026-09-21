import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";

// TODO: Replace this with your actual Firebase project config.
// You can find this in the Firebase Console -> Project Settings -> General -> Your apps (Web app)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-code-intelligence-2026.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-code-intelligence-2026",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-code-intelligence-2026.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "931387003390",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:931387003390:web:6cc9c3629c05843b2d30af",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WNSS1M5L0N"
};

let app = null;
let auth = null;
let db = null;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("Firebase initialization skipped or failed:", e.message);
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

// --- Firestore Helpers ---

export const saveReportToFirestore = async (userId, resultData, streamPanels = {}) => {
  try {
    // In streaming mode, resultData.outputs is undefined — use streamPanels instead
    const outputs = resultData.outputs || streamPanels || {};
    // Strip any undefined values (Firestore rejects them)
    const cleanOutputs = Object.fromEntries(
      Object.entries(outputs).filter(([, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, "reports"), {
      userId,
      timestamp: new Date().toISOString(),
      language_detected: resultData.language_detected,
      files_analyzed: resultData.files_analyzed,
      ast_summary: resultData.ast_summary || null,
      outputs: cleanOutputs,
      code_context: resultData.code_context || ""
    });
    console.log("Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const getUserReports = async (userId) => {
  try {
    const q = query(
      collection(db, "reports"), 
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );
    const querySnapshot = await getDocs(q);
    const reports = [];
    querySnapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    return reports;
  } catch (e) {
    console.error("Error fetching reports: ", e);
    throw e;
  }
};
