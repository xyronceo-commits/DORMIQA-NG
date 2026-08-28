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
  let isInitialLoad = true;
  const knownDocIds = new Set<string>();

  try {
    const notifQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(40)
    );

    unsubscribeFirestore = onSnapshot(
      notifQuery,
      (snapshot) => {
        const firestoreNotifs: AppNotification[] = [];

        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const targetUserId = data.userId || data.recipientId;
          const targetRecipientId = data.recipientId || data.userId;

          const isForUser = 
            targetUserId === userId || 
            targetRecipientId === userId || 
            targetUserId === 'all' || 
            (universityId && data.universityId === universityId);

          if (isForUser && change.type === 'added' && !knownDocIds.has(change.doc.id)) {
            const newNotifItem: AppNotification = {
              id: change.doc.id,
              userId: targetUserId,
              recipientId: targetRecipientId,
              title: data.title || 'Notification',
              body: data.body || data.message || '',
              message: data.message || data.body || '',
              type: data.type || 'system',
              read: Boolean(data.read),
              createdAt: data.createdAt || new Date().toISOString(),
              universityId: data.universityId,
              relatedId: data.relatedId,
              metadata: data.metadata || {}
            };

            // Trigger instant banner toast if notification arrives live after initial load
            if (!isInitialLoad && !data.read && onNewNotificationBanner) {
              onNewNotificationBanner(newNotifItem);
            }
          }
        });

        snapshot.docs.forEach((docSnap) => {
          knownDocIds.add(docSnap.id);
          const data = docSnap.data();
          const targetUserId = data.userId || data.recipientId;
          const targetRecipientId = data.recipientId || data.userId;

          const isForUser = 
            targetUserId === userId || 
            targetRecipientId === userId || 
            targetUserId === 'all' || 
            (universityId && data.universityId === universityId);

          if (isForUser) {
            firestoreNotifs.push({
              id: docSnap.id,
              userId: targetUserId,
              recipientId: targetRecipientId,
              title: data.title || 'Notification',
              body: data.body || data.message || '',
              message: data.message || data.body || '',
              type: data.type || 'system',
              read: Boolean(data.read),
              createdAt: data.createdAt || new Date().toISOString(),
              universityId: data.universityId,
              relatedId: data.relatedId,
              metadata: data.metadata || {}
            });
          }
        });

        isInitialLoad = false;

        const combined = [...firestoreNotifs].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        localList = combined;
        onNotificationsUpdated(combined);
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

/**
 * Triggers a system notification to an agent once the AI or admin review process is complete.
 * Includes explicit rejection reasons if the listing is unapproved.
 */
export const notifyAgentListingReviewComplete = async (params: {
  agentId: string;
  listingTitle: string;
  isApproved: boolean;
  rejectionReason?: string;
  listingId?: string;
  universityId?: string;
}): Promise<AppNotification> => {
  const { agentId, listingTitle, isApproved, rejectionReason, listingId, universityId } = params;

  if (isApproved) {
    return sendNotification({
      userId: agentId,
      title: `🎉 Listing Approved: ${listingTitle}`,
      body: `Review Complete: Your property "${listingTitle}" has passed AI verification and is now published live for students.`,
      type: 'system',
      universityId,
      metadata: {
        listingId,
        status: 'approved'
      }
    });
  } else {
    const reasonText = rejectionReason || 'Multiple duplicate listings detected or failed property verification criteria.';
    return sendNotification({
      userId: agentId,
      title: `⚠️ Listing Unapproved: ${listingTitle}`,
      body: `Review Complete: UNAPPROVED. Reason: ${reasonText}`,
      type: 'system',
      universityId,
      metadata: {
        listingId,
        status: 'unapproved',
        reason: reasonText
      }
    });
  }
};
