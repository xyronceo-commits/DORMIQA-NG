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
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
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
 * AUTHORIZED ADMINS HELPERS & GOOGLE AUTHENTICATION
 */

// Ensure initial Super Admin is present in Firestore
export const initializeSuperAdminInFirestore = async (): Promise<void> => {
  const defaultEmail = 'buildsafe247@gmail.com';
  try {
    const adminRef = doc(db, 'authorized_admins', defaultEmail);
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        email: defaultEmail,
        role: 'SUPER_ADMIN',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      });
    } else {
      const data = snap.data();
      if (data.role !== 'SUPER_ADMIN' || data.status !== 'active') {
        await setDoc(adminRef, {
          role: 'SUPER_ADMIN',
          status: 'active'
        }, { merge: true });
      }
    }
  } catch (err) {
    console.warn("Failed to initialize super admin in firestore:", err);
  }
};

export const checkAdminAuthorizedInFirestore = async (emailOrUid: string, uidOverride?: string): Promise<{ authorized: boolean; role?: 'SUPER_ADMIN' | 'ADMIN'; message?: string; data?: any }> => {
  const cleanInput = emailOrUid.trim().toLowerCase();
  if (!cleanInput) {
    return { authorized: false, message: 'Invalid administrator identity.' };
  }

  // Initial Super Admin check
  if (cleanInput === 'buildsafe247@gmail.com') {
    if (uidOverride) {
      try {
        await setDoc(doc(db, 'admins', uidOverride), {
          email: 'buildsafe247@gmail.com',
          role: 'SUPER_ADMIN',
          status: 'active',
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          uid: uidOverride
        }, { merge: true });
      } catch (e) {
        console.warn('Error linking initial super admin uid:', e);
      }
    }
    return { authorized: true, role: 'SUPER_ADMIN' };
  }

  try {
    // 1. Check admins/{uid} directly if uidOverride is present or if cleanInput looks like a UID
    if (uidOverride) {
      const uidRef = doc(db, 'admins', uidOverride);
      const uidSnap = await getDoc(uidRef);
      if (uidSnap.exists()) {
        const data = uidSnap.data();
        if (data.status === 'disabled') {
          return { authorized: false, message: 'This administrator account has been disabled.' };
        }
        if (data.status === 'active') {
          return { authorized: true, role: data.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN', data };
        }
      }
    }

    // 2. Query authorized_admins collection by email
    const legacyRef = doc(db, 'authorized_admins', cleanInput);
    let snap = await getDoc(legacyRef);

    if (!snap.exists()) {
      const colRef = collection(db, 'authorized_admins');
      const q = query(colRef, where('email', '==', cleanInput));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        snap = qSnap.docs[0];
      }
    }

    if (!snap.exists()) {
      const adminsCol = collection(db, 'admins');
      const q = query(adminsCol, where('email', '==', cleanInput));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        snap = qSnap.docs[0];
      }
    }

    if (snap.exists()) {
      const data = snap.data();
      if (data.status === 'disabled') {
        return { authorized: false, message: 'This administrator account has been disabled.' };
      }
      const role: 'SUPER_ADMIN' | 'ADMIN' = data.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';

      if (uidOverride) {
        try {
          await setDoc(doc(db, 'admins', uidOverride), {
            email: cleanInput,
            role,
            status: 'active',
            createdAt: data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || 'super_admin',
            uid: uidOverride
          }, { merge: true });
        } catch (e) {
          console.warn('Error syncing admin record to admins/{uid}:', e);
        }
      }

      return { authorized: true, role, data };
    }

    return { authorized: false, message: 'This Google account is not authorized to access the Dormiqa Admin Portal.' };
  } catch (err) {
    console.warn("Firestore admin check error:", err);
    if (cleanInput === 'buildsafe247@gmail.com') {
      return { authorized: true, role: 'SUPER_ADMIN' };
    }
    return { authorized: false, message: 'This Google account is not authorized to access the Dormiqa Admin Portal.' };
  }
};

export const ADMIN_SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 Hours

export const setAdminSessionTimestamp = (uid: string) => {
  try {
    const sessionData = {
      loginTime: Date.now(),
      uid
    };
    localStorage.setItem(`dormiqa_admin_session_${uid}`, JSON.stringify(sessionData));
    localStorage.setItem('dormiqa_admin_active_uid', uid);
  } catch (e) {
    console.warn('Error setting admin session timestamp:', e);
  }
};

export const clearAdminSessionTimestamp = (uid?: string) => {
  try {
    if (uid) {
      localStorage.removeItem(`dormiqa_admin_session_${uid}`);
    }
    const activeUid = localStorage.getItem('dormiqa_admin_active_uid');
    if (activeUid) {
      localStorage.removeItem(`dormiqa_admin_session_${activeUid}`);
      localStorage.removeItem('dormiqa_admin_active_uid');
    }
    localStorage.removeItem('dormiqa_admin_email');
  } catch (e) {
    console.warn('Error clearing admin session timestamp:', e);
  }
};

export const checkAdminSessionValid = (uid: string): boolean => {
  try {
    const raw = localStorage.getItem(`dormiqa_admin_session_${uid}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.loginTime) return false;
    const elapsed = Date.now() - Number(parsed.loginTime);
    return elapsed >= 0 && elapsed < ADMIN_SESSION_DURATION_MS;
  } catch (e) {
    return false;
  }
};

export const signInAdminWithGoogle = async (): Promise<{ user: FirebaseUser; authorized: boolean; role?: 'SUPER_ADMIN' | 'ADMIN'; message?: string }> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const fbUser = result.user;
  const email = (fbUser.email || '').trim().toLowerCase();
  const uid = fbUser.uid;

  if (!email) {
    throw new Error('No email address associated with this Google account.');
  }

  const authCheck = await checkAdminAuthorizedInFirestore(email, uid);
  
  if (!authCheck.authorized) {
    // Note: Do NOT create admin record automatically for unauthorized accounts
    return {
      user: fbUser,
      authorized: false,
      message: authCheck.message || 'This Google account is not authorized to access the Dormiqa Admin Portal.'
    };
  }

  // Set 12-hour admin session timestamp for authorized administrator
  setAdminSessionTimestamp(uid);

  return {
    user: fbUser,
    authorized: true,
    role: authCheck.role || (email === 'buildsafe247@gmail.com' ? 'SUPER_ADMIN' : 'ADMIN'),
    message: authCheck.message
  };
};

export const fetchAuthorizedAdminEmailsFromFirestore = async (): Promise<string[]> => {
  try {
    const colRef = collection(db, 'authorized_admins');
    const snap = await getDocs(colRef);
    const emails: string[] = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.status !== 'disabled') {
        emails.push((data.email || d.id).trim().toLowerCase());
      }
    });
    if (!emails.includes('buildsafe247@gmail.com')) {
      emails.unshift('buildsafe247@gmail.com');
    }
    return emails;
  } catch (err) {
    return await fetchAdminEmails();
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

export const sendPasswordReset = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

/**
 * Perform real-time Agent verification status update & write notification document to Firestore
 */
export const updateAgentVerificationInFirestore = async (
  agentId: string, 
  status: 'approved' | 'rejected', 
  adminEmail: string, 
  reason?: string
) => {
  const isApproved = status === 'approved';
  const now = new Date().toISOString();
  
  const agentRef = doc(db, 'users', agentId);
  const updatePayload: Record<string, any> = {
    verificationStatus: status,
    businessVerificationStatus: status,
    isVerifiedAgent: isApproved,
    status: isApproved ? 'approved' : 'rejected',
    verificationUpdatedAt: now
  };
  
  if (isApproved) {
    updatePayload.verifiedAt = now;
    updatePayload.verifiedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.rejectionReason = null;
  } else {
    updatePayload.rejectedAt = now;
    updatePayload.rejectedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.rejectionReason = reason || 'Verification documents require updating.';
  }

  await setDoc(agentRef, updatePayload, { merge: true });

  try {
    const agentColRef = doc(db, 'agents', agentId);
    await setDoc(agentColRef, updatePayload, { merge: true });
  } catch (err) {
    // Ignore if optional collection
  }

  // Create real-time notification document in Firestore
  const notifRef = collection(db, 'notifications');
  const notifTitle = isApproved ? 'Agent verification approved' : 'Agent verification update';
  const notifMsg = isApproved
    ? 'Your Dormiqa agent account has been verified.'
    : `Your agent verification was not approved.${reason ? ` Reason: ${reason}` : ''}`;

  await addDoc(notifRef, {
    recipientId: agentId,
    userId: agentId,
    type: 'agent_verification',
    title: notifTitle,
    message: notifMsg,
    body: notifMsg,
    read: false,
    createdAt: now,
    relatedId: agentId,
    metadata: {
      rejectionReason: isApproved ? null : (reason || null),
      verificationStatus: status,
      adminEmail: adminEmail || 'admin'
    }
  });

  return { success: true, status, agentId };
};

/**
 * Perform real-time Property verification status update & write notification document to Firestore
 */
export const updatePropertyVerificationInFirestore = async (
  propertyId: string, 
  status: 'approved' | 'rejected', 
  adminEmail: string, 
  reason?: string,
  agentId?: string
) => {
  const isApproved = status === 'approved';
  const now = new Date().toISOString();

  let targetAgentId = agentId;
  const listingRef = doc(db, 'listings', propertyId);
  
  if (!targetAgentId) {
    try {
      const snap = await getDoc(listingRef);
      if (snap.exists()) {
        const data = snap.data();
        targetAgentId = data.agentId || data.userId || data.ownerId;
      }
    } catch (e) {
      console.warn("Could not fetch listing doc before status update:", e);
    }
  }

  const updatePayload: Record<string, any> = {
    verificationStatus: status,
    status: isApproved ? 'approved' : 'rejected',
    verificationUpdatedAt: now
  };

  if (isApproved) {
    updatePayload.verifiedAt = now;
    updatePayload.verifiedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.rejectionReason = null;
    updatePayload.aiBanReason = null;
  } else {
    updatePayload.rejectedAt = now;
    updatePayload.rejectedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.rejectionReason = reason || 'Listing details require update.';
    updatePayload.aiBanReason = reason || 'Listing details require update.';
  }

  await setDoc(listingRef, updatePayload, { merge: true });

  if (targetAgentId) {
    const notifRef = collection(db, 'notifications');
    const notifTitle = isApproved ? 'Hostel approved' : 'Hostel verification update';
    const notifMsg = isApproved
      ? 'Your hostel listing has been approved and is now eligible to appear on Dormiqa.'
      : `Your hostel listing was not approved.${reason ? ` Reason: ${reason}` : ''}`;

    await addDoc(notifRef, {
      recipientId: targetAgentId,
      userId: targetAgentId,
      type: 'hostel_verification',
      title: notifTitle,
      message: notifMsg,
      body: notifMsg,
      read: false,
      createdAt: now,
      relatedId: propertyId,
      metadata: {
        rejectionReason: isApproved ? null : (reason || null),
        verificationStatus: status,
        propertyId,
        adminEmail: adminEmail || 'admin'
      }
    });
  }

  return { success: true, status, propertyId };
};

export default app;

