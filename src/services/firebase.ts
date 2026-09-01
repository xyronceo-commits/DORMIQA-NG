import { initializeApp, getApps, getApp } from 'firebase/app';
import { fetchAdminEmails, addAdminEmail, removeAdminEmail } from './api';
import { University } from '../types';
import { clientCache } from './cache';
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
  onSnapshot,
  arrayUnion
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
  deleteUser,
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
  try {
    const messaging = await getFCMMessaging();
    if (messaging) {
      return onMessage(messaging, (payload) => {
        console.log("FCM Foreground Notification Received:", payload);
        onMessageReceived(payload);
      });
    }
  } catch (err) {
    console.warn("FCM listen error:", err);
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

export function validateAndNormalizePhoneNumber(input: string): { isValid: boolean; normalized: string; error?: string } {
  if (!input || !input.trim()) {
    return { isValid: false, normalized: '', error: 'Phone number is required.' };
  }
  const cleaned = input.trim().replace(/[\s\-\(\)]/g, '');
  const digitOnly = cleaned.replace(/\+/g, '');
  if (!/^\d+$/.test(digitOnly)) {
    return { isValid: false, normalized: '', error: 'Phone number must contain digits only.' };
  }
  if (digitOnly.length < 10 || digitOnly.length > 14) {
    return { isValid: false, normalized: '', error: 'Please enter a valid phone number with 10 to 11 digits (e.g. 08012345678 or +2348012345678).' };
  }

  let normalized = cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    normalized = '+234' + cleaned.substring(1);
  } else if (cleaned.startsWith('234') && cleaned.length === 13) {
    normalized = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    normalized = '+' + cleaned;
  }

  return { isValid: true, normalized };
}

export interface StudentProfilePayload {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  avatarUrl?: string;
  phoneNumber: string;
  phone?: string;
  universityId: string;
  universityName: string;
  profileCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const saveStudentProfileToFirestore = async (data: StudentProfilePayload) => {
  const user = auth.currentUser;
  const uid = data.uid || user?.uid;
  if (!uid) {
    throw new Error("We couldn't save your profile. User authentication is missing.");
  }

  const cleanEmail = (data.email || user?.email || '').trim().toLowerCase();
  const photo = data.photoURL || data.avatarUrl || user?.photoURL || '';
  const phoneVal = data.phoneNumber || data.phone || '';
  const now = new Date().toISOString();

  const studentRef = doc(db, 'students', uid);
  const userRef = doc(db, 'users', uid);

  let existingCreatedAt = data.createdAt;
  if (!existingCreatedAt) {
    try {
      const snap = await getDoc(studentRef);
      if (snap.exists()) {
        existingCreatedAt = snap.data().createdAt;
      }
    } catch {}
  }

  const payload = {
    id: uid,
    uid: uid,
    name: data.name.trim(),
    email: cleanEmail,
    photoURL: photo,
    avatarUrl: photo,
    phoneNumber: phoneVal,
    phone: phoneVal,
    universityId: data.universityId,
    universityName: data.universityName,
    profileCompleted: data.profileCompleted === true,
    createdAt: existingCreatedAt || now,
    updatedAt: now
  };

  try {
    // Write directly to students/{uid}
    await setDoc(studentRef, payload, { merge: true });

    // Sync to users/{uid}
    await setDoc(userRef, {
      ...payload,
      role: 'student',
      isEmailVerified: true
    }, { merge: true });

    return payload;
  } catch (err) {
    console.error("Firestore saveStudentProfileToFirestore error:", err);
    throw new Error("We couldn't save your profile. Please try again.");
  }
};

export const fetchStudentProfileFromFirestore = async (uid: string): Promise<StudentProfilePayload | null> => {
  if (!uid) return null;
  try {
    const studentRef = doc(db, 'students', uid);
    const snap = await getDoc(studentRef);
    if (snap.exists()) {
      const data = snap.data();
      const phoneVal = data.phoneNumber || data.phone || '';
      const uniId = data.universityId || '';
      const isCompleted = data.profileCompleted === true || (Boolean(uniId) && Boolean(phoneVal));
      return {
        uid: uid,
        name: data.name || '',
        email: data.email || '',
        photoURL: data.photoURL || data.avatarUrl || '',
        avatarUrl: data.photoURL || data.avatarUrl || '',
        phoneNumber: phoneVal,
        phone: phoneVal,
        universityId: uniId,
        universityName: data.universityName || '',
        profileCompleted: isCompleted,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    }
    // Fallback check in users/{uid}
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.role === 'student' || !data.role) {
        const phoneVal = data.phoneNumber || data.phone || '';
        const uniId = data.universityId || '';
        const isCompleted = data.profileCompleted === true || (Boolean(uniId) && Boolean(phoneVal));
        return {
          uid: uid,
          name: data.name || '',
          email: data.email || '',
          photoURL: data.photoURL || data.avatarUrl || '',
          avatarUrl: data.photoURL || data.avatarUrl || '',
          phoneNumber: phoneVal,
          phone: phoneVal,
          universityId: uniId,
          universityName: data.universityName || '',
          profileCompleted: isCompleted,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      }
    }
    return null;
  } catch (err) {
    console.warn("Failed to fetch student profile from Firestore:", err);
    return null;
  }
};

export const saveUserToFirestore = async (userObj: {
  id?: string;
  name: string;
  email: string;
  role?: string;
  phone?: string;
  universityId?: string;
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
      universityId: userObj.universityId || 'uniosun',
      universityName: userObj.universityName || 'Osun State University',
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

    // Sync to role-specific Firestore collections students/{uid} or agents/{uid}
    if (updateData.role === 'student') {
      const studentRef = doc(db, 'students', docId);
      await setDoc(studentRef, {
        id: docId,
        uid: docId,
        name: updateData.name,
        email: cleanEmail,
        phone: updateData.phone,
        universityId: updateData.universityId,
        universityName: updateData.universityName,
        avatarUrl: updateData.avatarUrl,
        updatedAt: updateData.updatedAt
      }, { merge: true });
    } else if (updateData.role === 'agent') {
      const agentRef = doc(db, 'agents', docId);
      await setDoc(agentRef, {
        id: docId,
        uid: docId,
        name: updateData.name,
        email: cleanEmail,
        phone: updateData.phone,
        agencyName: updateData.agencyName,
        universityId: updateData.universityId,
        universityName: updateData.universityName,
        businessVerificationStatus: updateData.businessVerificationStatus || 'none',
        isVerifiedAgent: updateData.isVerifiedAgent || false,
        avatarUrl: updateData.avatarUrl,
        updatedAt: updateData.updatedAt
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Failed to sync user to Firestore users collection:", err);
    handleFirestoreError(err, OperationType.WRITE, `users/${docId}`, false);
  }
};

export const fetchUserProfileFromFirestore = async (uidOrEmail: string): Promise<any | null> => {
  if (!uidOrEmail) return null;
  try {
    const userRef = doc(db, 'users', uidOrEmail);
    const snap = await getDoc(userRef);
    let data = snap.exists() ? snap.data() : null;

    // Merge role-specific document (students/{uid} or agents/{uid}) if needed
    if (data) {
      if (data.role === 'student' || !data.role) {
        const studentSnap = await getDoc(doc(db, 'students', uidOrEmail));
        if (studentSnap.exists()) {
          data = { ...studentSnap.data(), ...data };
        }
      } else if (data.role === 'agent') {
        const agentSnap = await getDoc(doc(db, 'agents', uidOrEmail));
        if (agentSnap.exists()) {
          data = { ...agentSnap.data(), ...data };
        }
      }
    } else {
      const studentSnap = await getDoc(doc(db, 'students', uidOrEmail));
      if (studentSnap.exists()) {
        data = studentSnap.data();
      } else {
        const agentSnap = await getDoc(doc(db, 'agents', uidOrEmail));
        if (agentSnap.exists()) {
          data = agentSnap.data();
        }
      }
    }

    return data;
  } catch (err) {
    console.warn("Failed to fetch user profile from Firestore:", err);
    handleFirestoreError(err, OperationType.GET, `users/${uidOrEmail}`, false);
    return null;
  }
};

/**
 * Fetch & Seed Universities Collection in Firestore
 */
export const fetchUniversitiesFromFirestore = async (): Promise<University[]> => {
  try {
    const colRef = collection(db, 'universities');
    const snap = await getDocs(colRef);
    
    if (!snap.empty) {
      const list: University[] = [];
      snap.forEach(d => {
        const data = d.data();
        const isUniosun = d.id === 'uniosun';
        list.push({
          id: d.id,
          name: data.name || '',
          shortName: data.shortName || data.code || data.name,
          city: data.city || data.location?.split(',')[0] || '',
          state: data.state || data.location?.split(',')[1] || '',
          country: data.country || 'Nigeria',
          code: data.code || data.shortName || d.id.toUpperCase(),
          type: data.type || 'federal',
          lat: data.lat || 7.7821,
          lng: data.lng || 4.5621,
          popularAreas: data.popularAreas || [],
          totalListings: data.totalListings || 0,
          imageUrl: data.imageUrl || '',
          description: data.description || '',
          status: data.status || (isUniosun ? 'active' : 'coming_soon'),
          isActive: data.isActive !== undefined ? data.isActive : (data.status === 'active' || isUniosun),
          waitlistUrl: data.waitlistUrl || 'https://dormiqa-waitlist.vercel.app'
        } as University);
      });

      // Guarantee UNIOSUN appears first
      list.sort((a, b) => {
        if (a.id === 'uniosun') return -1;
        if (b.id === 'uniosun') return 1;
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return a.name.localeCompare(b.name);
      });

      return list;
    }

    // Seed Firestore with default universities if collection is empty
    const { UNIVERSITIES } = await import('../data/mockData');
    for (const uni of UNIVERSITIES) {
      try {
        const isUniosun = uni.id === 'uniosun';
        const uniStatus = isUniosun ? 'active' : 'coming_soon';
        await setDoc(doc(db, 'universities', uni.id), {
          id: uni.id,
          name: uni.name,
          shortName: uni.code || uni.name,
          code: uni.code,
          location: `${uni.city}, ${uni.state}`,
          city: uni.city,
          state: uni.state,
          country: uni.country,
          type: uni.type,
          status: uniStatus,
          isActive: isUniosun,
          waitlistUrl: 'https://dormiqa-waitlist.vercel.app',
          description: uni.description,
          imageUrl: uni.imageUrl,
          popularAreas: uni.popularAreas,
          totalListings: uni.totalListings
        }, { merge: true });
      } catch (seedErr) {
        console.warn(`Failed to seed university ${uni.id}:`, seedErr);
      }
    }

    return UNIVERSITIES;
  } catch (err) {
    console.warn("Firestore fetchUniversities error, falling back to local data:", err);
    const { UNIVERSITIES } = await import('../data/mockData');
    return UNIVERSITIES;
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

export const USER_SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

export const setUserSessionTimestamp = (uid: string) => {
  try {
    const payload = {
      uid,
      loginTime: Date.now(),
      expiresAt: Date.now() + USER_SESSION_DURATION_MS
    };
    localStorage.setItem(`dormiqa_user_session_${uid}`, JSON.stringify(payload));
  } catch (e) {
    console.warn('Error setting user session timestamp:', e);
  }
};

export const clearUserSessionTimestamp = (uid?: string) => {
  try {
    if (uid) {
      localStorage.removeItem(`dormiqa_user_session_${uid}`);
    } else {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dormiqa_user_session_')) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (e) {
    console.warn('Error clearing user session timestamp:', e);
  }
};

export const checkUserSessionValid = (uid: string): boolean => {
  try {
    const raw = localStorage.getItem(`dormiqa_user_session_${uid}`);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.loginTime) return true;
    const elapsed = Date.now() - Number(parsed.loginTime);
    return elapsed >= 0 && elapsed < USER_SESSION_DURATION_MS;
  } catch (e) {
    return true;
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
  status: 'approved' | 'rejected' | 'removed', 
  adminEmail: string, 
  reason?: string
) => {
  const isApproved = status === 'approved';
  const isRemoved = status === 'removed';
  const now = new Date().toISOString();
  
  const historyEntry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    action: isApproved ? 'Agent Verified' : isRemoved ? 'Agent Status Revoked' : 'Agent Rejected',
    status: status === 'approved' ? 'verified' : status,
    timestamp: now,
    adminEmail: adminEmail || 'buildsafe247@gmail.com',
    reason: reason || null
  };

  const agentRef = doc(db, 'users', agentId);
  const updatePayload: Record<string, any> = {
    verificationStatus: isApproved ? 'approved' : status,
    businessVerificationStatus: isApproved ? 'approved' : isRemoved ? 'removed' : 'rejected',
    isVerifiedAgent: isApproved,
    status: isApproved ? 'verified' : isRemoved ? 'removed' : 'rejected',
    verificationUpdatedAt: now,
    verificationHistory: arrayUnion(historyEntry)
  };
  
  if (isApproved) {
    updatePayload.verifiedAt = now;
    updatePayload.verifiedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.rejectionReason = null;
  } else if (isRemoved) {
    updatePayload.removedAt = now;
    updatePayload.removedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.removalReason = reason || 'Agent status revoked by administrator.';
  } else {
    updatePayload.rejectedAt = now;
    updatePayload.rejectedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.rejectionReason = reason || 'Verification documents require updating.';
  }

  try {
    await setDoc(agentRef, updatePayload, { merge: true });
  } catch (err) {
    console.warn("Failed to sync agent status to Firestore users collection:", err);
    handleFirestoreError(err, OperationType.WRITE, `users/${agentId}`, false);
  }

  try {
    const agentColRef = doc(db, 'agents', agentId);
    await setDoc(agentColRef, updatePayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `agents/${agentId}`, false);
  }

  // Create real-time notification document in Firestore
  const notifRef = collection(db, 'notifications');
  const notifTitle = isApproved ? 'Agent verification approved' : isRemoved ? 'Agent access revoked' : 'Agent verification update';
  const notifMsg = isApproved
    ? 'Your Dormiqa agent account has been verified.'
    : isRemoved
    ? `Your Dormiqa agent privileges have been revoked.${reason ? ` Reason: ${reason}` : ''}`
    : `Your agent verification was not approved.${reason ? ` Reason: ${reason}` : ''}`;

  try {
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
  } catch (err) {
    console.warn("Failed to sync notification to Firestore:", err);
    handleFirestoreError(err, OperationType.WRITE, 'notifications', false);
  }

  return { success: true, status, agentId };
};

/**
 * Perform real-time Property verification status update & write notification document to Firestore
 */
export const updatePropertyVerificationInFirestore = async (
  propertyId: string, 
  status: 'approved' | 'changes_requested' | 'rejected' | 'removed', 
  adminEmail: string, 
  reason?: string,
  agentId?: string
) => {
  const isApproved = status === 'approved';
  const isRemoved = status === 'removed';
  const isChangesRequested = status === 'changes_requested';
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

  const actionText = isApproved 
    ? 'Listing Approved' 
    : isChangesRequested 
    ? 'Changes Requested' 
    : isRemoved 
    ? 'Listing Removed' 
    : 'Listing Rejected';

  const historyEntry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    action: actionText,
    status: status,
    timestamp: now,
    adminEmail: adminEmail || 'buildsafe247@gmail.com',
    reason: reason || null
  };

  const updatePayload: Record<string, any> = {
    verificationStatus: status,
    status: status,
    isVerified: isApproved,
    verificationUpdatedAt: now,
    verificationHistory: arrayUnion(historyEntry)
  };

  if (isApproved) {
    updatePayload.verifiedAt = now;
    updatePayload.verifiedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.rejectionReason = null;
    updatePayload.aiBanReason = null;
  } else if (isRemoved) {
    updatePayload.removedAt = now;
    updatePayload.removedBy = adminEmail || 'buildsafe247@gmail.com';
  } else {
    updatePayload.rejectedAt = now;
    updatePayload.rejectedBy = adminEmail || 'buildsafe247@gmail.com';
    updatePayload.rejectionReason = reason || 'Listing details require update.';
    updatePayload.aiBanReason = reason || 'Listing details require update.';
  }

  try {
    await setDoc(listingRef, updatePayload, { merge: true });
    clientCache.invalidate('listings_query:');
    clientCache.invalidate(`listing_detail:${propertyId}`);
  } catch (err) {
    console.warn("Failed to sync property status to Firestore listings collection:", err);
    handleFirestoreError(err, OperationType.WRITE, `listings/${propertyId}`, false);
  }

  if (targetAgentId) {
    const notifRef = collection(db, 'notifications');
    const notifTitle = isApproved 
      ? 'Hostel approved' 
      : isChangesRequested 
      ? 'Hostel changes requested' 
      : isRemoved 
      ? 'Hostel listing removed' 
      : 'Hostel verification update';

    const notifMsg = isApproved
      ? 'Your hostel listing has been approved and is now eligible to appear on Dormiqa.'
      : isChangesRequested
      ? `Changes requested for your hostel listing.${reason ? ` Reason: ${reason}` : ''}`
      : isRemoved
      ? 'Your hostel listing was removed from Dormiqa by administrators.'
      : `Your hostel listing was not approved.${reason ? ` Reason: ${reason}` : ''}`;

    try {
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
    } catch (err) {
      console.warn("Failed to sync notification to Firestore:", err);
      handleFirestoreError(err, OperationType.WRITE, 'notifications', false);
    }
  }

  return { success: true, status, propertyId };
};

export const deleteUserAccountData = async (uid: string) => {
  if (!uid) return;

  // 1. Delete user doc from users collection
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    console.warn("Could not delete user doc from 'users':", err);
  }

  // 2. Delete student doc from students collection
  try {
    await deleteDoc(doc(db, 'students', uid));
  } catch (err) {
    console.warn("Could not delete student doc from 'students':", err);
  }

  // 3. Delete agent doc from agents collection
  try {
    await deleteDoc(doc(db, 'agents', uid));
  } catch (err) {
    console.warn("Could not delete agent doc from 'agents':", err);
  }

  // 4. Delete agent listings
  try {
    const listingsSnap1 = await getDocs(query(collection(db, 'listings'), where('agentId', '==', uid)));
    for (const d of listingsSnap1.docs) {
      try { await deleteDoc(d.ref); } catch {}
    }
    const listingsSnap2 = await getDocs(query(collection(db, 'listings'), where('agent.id', '==', uid)));
    for (const d of listingsSnap2.docs) {
      try { await deleteDoc(d.ref); } catch {}
    }
  } catch (err) {
    console.warn("Error wiping user listings:", err);
  }

  // 5. Delete user inspections
  try {
    const inspSnap1 = await getDocs(query(collection(db, 'inspections'), where('studentId', '==', uid)));
    for (const d of inspSnap1.docs) {
      try { await deleteDoc(d.ref); } catch {}
    }
    const inspSnap2 = await getDocs(query(collection(db, 'inspections'), where('agentId', '==', uid)));
    for (const d of inspSnap2.docs) {
      try { await deleteDoc(d.ref); } catch {}
    }
  } catch (err) {
    console.warn("Error wiping user inspections:", err);
  }

  // 6. Delete user conversations
  try {
    const convSnap1 = await getDocs(query(collection(db, 'conversations'), where('studentId', '==', uid)));
    for (const d of convSnap1.docs) {
      try { await deleteDoc(d.ref); } catch {}
    }
    const convSnap2 = await getDocs(query(collection(db, 'conversations'), where('agentId', '==', uid)));
    for (const d of convSnap2.docs) {
      try { await deleteDoc(d.ref); } catch {}
    }
  } catch (err) {
    console.warn("Error wiping user conversations:", err);
  }

  // 7. Delete Auth user if active
  try {
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
    }
  } catch (err) {
    console.warn("Auth user deletion note:", err);
  }
};

export default app;

