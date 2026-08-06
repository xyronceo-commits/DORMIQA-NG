import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, requestFCMPermission, listenToFCMMessages } from './firebase';
import { AppNotification, NotificationType } from '../types';

/**
 * Initial notifications list (empty by default for a clean brand new app)
 */
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

/**
 * Dispatch a real-time notification to Firestore and/or local subscribers
 */
export const sendNotification = async (
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): Promise<AppNotification> => {
  const newNotif: AppNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    read: false,
    createdAt: new Date().toISOString()
  };

  try {
    // Attempt Firestore write
    await addDoc(collection(db, 'notifications'), {
      userId: newNotif.userId,
      title: newNotif.title,
      body: newNotif.body,
      type: newNotif.type,
      read: false,
      universityId: newNotif.universityId || null,
      metadata: newNotif.metadata || {},
      createdAt: newNotif.createdAt
    });
  } catch (err) {
    console.warn("Firestore notification save warning (using local event dispatch):", err);
  }

  // Dispatch custom window event for instant local UI update across all active tabs/components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_notification_received', { detail: newNotif }));
  }

  return newNotif;
};

/**
 * Subscribe to real-time notification changes (Firestore onSnapshot + window events)
 */
export const subscribeUserNotifications = (
  userId: string,
  universityId: string | undefined,
  onNotificationsUpdated: (notifications: AppNotification[]) => void,
  onNewNotificationBanner?: (notif: AppNotification) => void
) => {
  let localList: AppNotification[] = [...INITIAL_NOTIFICATIONS];

  // Listener for custom in-app real-time events
  const handleLocalEvent = (e: Event) => {
    const customEvt = e as CustomEvent<AppNotification>;
    const notif = customEvt.detail;

    // Filter by user or broadcast
    if (notif.userId === userId || notif.userId === 'all' || (universityId && notif.universityId === universityId)) {
      localList = [notif, ...localList];
      onNotificationsUpdated(localList);
      if (onNewNotificationBanner) {
        onNewNotificationBanner(notif);
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('app_notification_received', handleLocalEvent);
  }

  // Firestore real-time listener
  let unsubscribeFirestore = () => {};
  try {
    const notifQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    unsubscribeFirestore = onSnapshot(
      notifQuery,
      (snapshot) => {
        const firestoreNotifs: AppNotification[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              userId: data.userId,
              title: data.title,
              body: data.body,
              type: data.type || 'system',
              read: data.read || false,
              createdAt: data.createdAt || new Date().toISOString(),
              universityId: data.universityId,
              metadata: data.metadata || {}
            };
          })
          .filter(
            (n) => n.userId === userId || n.userId === 'all' || (universityId && n.universityId === universityId)
          );

        if (firestoreNotifs.length > 0) {
          // Merge with initial mock items to ensure full display
          const existingIds = new Set(firestoreNotifs.map((n) => n.id));
          const filteredInitial = localList.filter((n) => !existingIds.has(n.id));
          const combined = [...firestoreNotifs, ...filteredInitial].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          localList = combined;
          onNotificationsUpdated(combined);
        }
      },
      (err) => {
        console.warn("Firestore notification subscription fallback to local state:", err);
      }
    );
  } catch (err) {
    console.warn("Firestore subscription failed:", err);
  }

  // Initialize FCM foreground listener
  listenToFCMMessages((payload) => {
    if (payload?.notification) {
      const fcmNotif: AppNotification = {
        id: `fcm_${Date.now()}`,
        userId: userId,
        title: payload.notification.title || '🔔 Real-Time Alert',
        body: payload.notification.body || 'You have a new update.',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      };
      localList = [fcmNotif, ...localList];
      onNotificationsUpdated(localList);
      if (onNewNotificationBanner) {
        onNewNotificationBanner(fcmNotif);
      }
    }
  });

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('app_notification_received', handleLocalEvent);
    }
    unsubscribeFirestore();
  };
};
