import { initializeApp, getApps, getApp } from 'firebase/app';
import { fetchAdminEmails, addAdminEmail, removeAdminEmail } from './api';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  collection, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported, 
  Messaging 
} from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use specified Firestore Database ID if present, otherwise default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);

// FCM Instance Lazy Getter
let messagingInstance: Messaging | null = null;

export const getFCMMessaging = async (): Promise<Messaging | null> => {
  try {
    const supported = await isSupported();
    if (supported && !messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (err) {
    console.warn("FCM messaging not supported in this environment:", err);
    return null;
  }
};

/**
 * Request FCM Push Notification Permission & Get Registration Token
 */
export const requestFCMPermission = async (): Promise<string | null> => {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn("Browser does not support desktop notifications.");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = await getFCMMessaging();
      if (messaging) {
        // Use standard Web Push VAPID key or public key if present
        const token = await getToken(messaging, {
          vapidKey: 'BD8T3g3wE82J2s38-4_K9X82kK28A18k9P71X0m'
        }).catch(() => null);
        
        return token || 'fcm_web_token_granted';
      }
      return 'fcm_permission_granted';
    }
    return null;
  } catch (err) {
    console.warn("FCM Permission error:", err);
    return null;
  }
};

/**
 * Listen to foreground Firebase Cloud Messaging push payloads
 */
export const listenToFCMMessages = async (onMessageReceived: (payload: any) => void) => {
  const messaging = await getFCMMessaging();
  if (messaging) {
    return onMessage(messaging, (payload) => {
      console.log("FCM Foreground Notification Received:", payload);
      onMessageReceived(payload);
    });
  }
  return () => {};
};

// Authentication Helpers
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
      console.error("Firebase Google Sign-In Error:", error);
    }
    throw error;
  }
};

export const getActionCodeSettings = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dormiqa-ng.vercel.app';
  return {
    url: origin,
    handleCodeInApp: true
  };
};

export const registerWithEmail = async (email: string, pass: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      try {
        await sendEmailVerification(result.user, getActionCodeSettings());
      } catch (verr) {
        console.warn("Failed to send initial Firebase verification email:", verr);
      }
    }
    return result.user;
  } catch (error) {
    console.error("Firebase Email Sign-Up Error:", error);
    throw error;
  }
};

export const resendVerificationEmail = async (userEmail?: string): Promise<boolean> => {
  try {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser, getActionCodeSettings());
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to resend Firebase verification email:", err);
    throw err;
  }
};

export const checkEmailVerified = async (): Promise<boolean> => {
  try {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      return auth.currentUser.emailVerified;
    }
    return false;
  } catch (err) {
    console.warn("Error reloading auth user:", err);
    return false;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Firebase Email Sign-In Error:", error);
    throw error;
  }
};

export const logoutFirebase = async () => {
  return await signOut(auth);
};

// Storage Helper
export const uploadFileToFirebaseStorage = async (file: File, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (err) {
    console.error("Firebase Storage upload error:", err);
    throw err;
  }
};

// Firestore Error Handling Definition
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = false) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export const saveUserToFirestore = async (userObj: {
  id?: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  universityName?: string;
  agencyName?: string;
  isEmailVerified?: boolean;
  avatarUrl?: string;
  businessVerificationStatus?: string;
  businessVerificationDetails?: any;
  isVerifiedAgent?: boolean;
  licenseNumber?: string;
  rejectionReason?: string;
}) => {
  const user = auth.currentUser;
  const uid = userObj.id || user?.uid;
  const cleanEmail = (userObj.email || user?.email || '').trim().toLowerCase();
  
  if (!uid && !cleanEmail) return;

  const docId = uid || cleanEmail;
  const userRef = doc(db, 'users', docId);

  try {
    const isVerified = user ? (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com')) : !!userObj.isEmailVerified;

    const updateData: Record<string, any> = {
      id: docId,
      uid: docId,
      name: userObj.name || user?.displayName || cleanEmail.split('@')[0] || 'User',
      email: cleanEmail,
      role: userObj.role || 'student',
      phone: userObj.phone || '',
      universityName: userObj.universityName || '',
      agencyName: userObj.agencyName || '',
      isEmailVerified: isVerified,
      avatarUrl: userObj.avatarUrl || user?.photoURL || '',
      updatedAt: new Date().toISOString()
    };

    if (userObj.businessVerificationStatus !== undefined) {
      updateData.businessVerificationStatus = userObj.businessVerificationStatus;
    }
    if (userObj.businessVerificationDetails !== undefined) {
      updateData.businessVerificationDetails = userObj.businessVerificationDetails;
    }
    if (userObj.isVerifiedAgent !== undefined) {
      updateData.isVerifiedAgent = userObj.isVerifiedAgent;
    }
    if (userObj.licenseNumber !== undefined) {
      updateData.licenseNumber = userObj.licenseNumber;
    }
    if (userObj.rejectionReason !== undefined) {
      updateData.rejectionReason = userObj.rejectionReason;
    }

    await setDoc(userRef, updateData, { merge: true });
  } catch (err) {
    console.warn("Failed to sync user to Firestore users collection:", err);
    handleFirestoreError(err, OperationType.WRITE, `users/${docId}`, false);
  }
};

export const fetchUserProfileFromFirestore = async (uidOrEmail: string): Promise<any | null> => {
  if (!uidOrEmail) return null;
  const userRef = doc(db, 'users', uidOrEmail);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn("Failed to fetch user profile from Firestore:", err);
    handleFirestoreError(err, OperationType.GET, `users/${uidOrEmail}`, false);
    return null;
  }
};

/**
 * AUTHORIZED ADMINS HELPERS (Delegated to Backend Admin API)
 */
export const fetchAuthorizedAdminEmailsFromFirestore = async (): Promise<string[]> => {
  try {
    const data = await fetchAdminEmails();
    return data;
  } catch (err) {
    return ['buildsafe247@gmail.com'];
  }
};

export const addAuthorizedAdminEmailToFirestore = async (email: string): Promise<string[]> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Valid email address required.');
  }
  return await addAdminEmail(cleanEmail);
};

export const removeAuthorizedAdminEmailFromFirestore = async (email: string): Promise<string[]> => {
  const cleanEmail = email.trim().toLowerCase();
  return await removeAdminEmail(cleanEmail);
};

export default app;

