import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with configured databaseId (CRITICAL)
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn("Firestore Operation Notice: ", JSON.stringify(errInfo));
  return errInfo;
}

// Test initial connection as required by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore connection check: client is offline or starting up");
    }
    return false;
  }
}

// Trigger initial test
testFirestoreConnection().catch(() => {});

// Google Sign-In helper with popup & redirect fallback
export async function signInWithGoogle(): Promise<User | null> {
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Google signInWithPopup notice:", error?.code, error?.message);

    // If popup was blocked or closed on mobile/PWA standalone, fallback to redirect
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/cancelled-popup-request" ||
      (isStandalone && error.code === "auth/popup-closed-by-user")
    ) {
      console.log("Triggering signInWithRedirect fallback for Google login...");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
}

// Check redirect login result if user redirected back
export async function checkRedirectAuth(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (error) {
    console.warn("Error checking redirect auth result:", error);
    return null;
  }
}

// Email/Password Sign-In helper
export async function signInWithEmail(email: string, pass: string): Promise<User | null> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error: any) {
    console.error("Email sign in error:", error);
    throw error;
  }
}

// Email/Password Registration helper
export async function registerWithEmail(email: string, pass: string, displayName?: string): Promise<User | null> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    return result.user;
  } catch (error: any) {
    console.error("Email registration error:", error);
    throw error;
  }
}

// Sign-Out helper
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Auth state listener helper
export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

