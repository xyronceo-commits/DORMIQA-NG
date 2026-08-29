import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Shield } from 'lucide-react';
import { 
  UserRole, 
  University, 
  Listing, 
  SearchFilters, 
  Inspection, 
  Conversation,
  User,
  AppNotification,
  AdminRole
} from './types';
import { subscribeUserNotifications, INITIAL_NOTIFICATIONS } from './services/notificationService';
import { NotificationCenter } from './components/NotificationCenter';
import { NotificationToast } from './components/NotificationToast';

const defaultInitialAccounts: User[] = [];
import { 
  fetchUniversities, 
  fetchListings, 
  fetchInspections, 
  fetchConversations, 
  fetchListingById,
  startConversation 
} from './services/api';
import { 
  parseRouteFromUrl, 
  pushPropertyUrl, 
  pushViewUrl, 
  ParsedRoute 
} from './utils/routing';
import { NotFoundPage } from './components/NotFoundPage';
import { 
  PropertyLoadingSkeleton, 
  PropertyErrorView, 
  PropertyUnavailableView 
} from './components/PropertyRouteStateViews';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { UniversitiesPage } from './components/UniversitiesPage';
import { getCampusesByUniversityId } from './data/campuses';
import { calculateHaversineDistanceKm } from './utils/distance';
import { SearchAndFilterBar } from './components/SearchAndFilterBar';
import { ListingCard } from './components/ListingCard';
import { TravelModeBar } from './components/TravelModeBar';
import { InteractiveMapView } from './components/InteractiveMapView';
import { ListingDetailModal } from './components/ListingDetailModal';
import { BookInspectionModal } from './components/BookInspectionModal';
import { ChatDrawer } from './components/ChatDrawer';
import { ReportListingModal } from './components/ReportListingModal';
import { AddListingModal } from './components/AddListingModal';
import { OnboardingPage } from './components/OnboardingPage';
import { OnboardingShowcaseModal } from './components/OnboardingShowcaseModal';
import { AppGuidedTour } from './components/AppGuidedTour';
import { BusinessVerificationPage } from './components/BusinessVerificationPage';
import { VerificationStatusPage } from './components/VerificationStatusPage';
import { AgentPortalLanding } from './components/AgentPortalLanding';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentDiscoverPage } from './components/StudentDiscoverPage';
import { SavedPage } from './components/SavedPage';
import { ChatsPage } from './components/ChatsPage';
import { InspectionsPage } from './components/InspectionsPage';
import { StudentProfilePage } from './components/StudentProfilePage';
import { BottomNav } from './components/BottomNav';
import { AgentDashboard } from './components/AgentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAccessScreen } from './components/AdminAccessScreen';
import { InfoPagesModal } from './components/InfoPagesModal';
import { ComingSoonPage } from './components/ComingSoonPage';
import { ListingGridSkeleton, ListItemRowSkeleton, DashboardSkeleton, ChatDrawerSkeleton } from './components/SkeletonLoader';
import { checkAdminSession, clearAdminToken } from './services/api';
import { 
  auth, 
  saveUserToFirestore, 
  logoutFirebase, 
  fetchUserProfileFromFirestore, 
  resendVerificationEmail, 
  db,
  initializeSuperAdminInFirestore,
  checkAdminAuthorizedInFirestore,
  signInAdminWithGoogle,
  setAdminSessionTimestamp,
  clearAdminSessionTimestamp,
  checkAdminSessionValid,
  ADMIN_SESSION_DURATION_MS
} from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';

export default function App() {
  const [activeView, setActiveView] = useState<'landing' | 'onboarding' | 'agent-landing' | 'business-verification' | 'search' | 'saved' | 'messages' | 'student-dash' | 'agent-dash' | 'admin-dash' | 'coming-soon' | 'inspections' | 'universities'>('landing');
  const [selectedComingSoonUniId, setSelectedComingSoonUniId] = useState<string>('unilag');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const [adminAuthStatus, setAdminAuthStatus] = useState<'AUTH_LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'ADMIN_CHECKING' | 'AUTHORIZED' | 'UNAUTHORIZED' | 'SESSION_EXPIRED' | 'SIGNED_OUT'>('AUTH_LOADING');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminRole, setAdminRole] = useState<AdminRole>('ADMIN');

  useEffect(() => {
    // Initialize Super Admin in Firestore
    initializeSuperAdminInFirestore();
  }, []);

  // Periodic 12-hour session expiration watcher
  useEffect(() => {
    const verifyAdminSessionExpiry = () => {
      if (isAdminAuthenticated && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const valid = checkAdminSessionValid(uid);
        if (!valid) {
          console.warn(`Admin 12-hour session expired for ${auth.currentUser.email}`);
          clearAdminSessionTimestamp(uid);
          signOut(auth).catch(() => {});
          setIsAdminAuthenticated(false);
          setAdminAuthStatus('SESSION_EXPIRED');
          setActiveView('admin-dash');
          pushViewUrl('admin-dash');
          setToastNotice('Your 12-hour administrator session has expired. Please sign in with Google again.');
          setTimeout(() => setToastNotice(null), 5000);
        }
      }
    };

    const interval = setInterval(verifyAdminSessionExpiry, 60000); // check every 60s
    window.addEventListener('focus', verifyAdminSessionExpiry);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', verifyAdminSessionExpiry);
    };
  }, [isAdminAuthenticated]);

  const handleAdminGoogleSignIn = async () => {
    setAdminAuthStatus('ADMIN_CHECKING');
    try {
      const res = await signInAdminWithGoogle();
      if (res.authorized) {
        setIsAdminAuthenticated(true);
        setAdminEmail(res.user.email || 'buildsafe247@gmail.com');
        setAdminRole(res.role || 'SUPER_ADMIN');
        setAdminAuthStatus('AUTHORIZED');
        setCurrentRole('admin');
        setActiveView('admin-dash');
        pushViewUrl('admin-dash');
        setToastNotice(`Authenticated as ${res.role}: ${res.user.email}`);
        setTimeout(() => setToastNotice(null), 4000);
      } else {
        setIsAdminAuthenticated(false);
        setAdminAuthStatus('UNAUTHORIZED');
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      setAdminAuthStatus('UNAUTHENTICATED');
      setToastNotice(err.message || 'Google sign-in failed. Please try again.');
      setTimeout(() => setToastNotice(null), 5000);
    }
  };

  const navigateView = (view: 'landing' | 'onboarding' | 'business-verification' | 'search' | 'saved' | 'messages' | 'student-dash' | 'agent-dash' | 'admin-dash' | 'coming-soon' | 'inspections' | 'universities') => {
    setIs404Route(false);
    setRoutePropertyError(null);
    setRoutePropertyUnavailableReason(null);
    setDetailListing(null);

    if (view === 'admin-dash') {
      setActiveView('admin-dash');
      pushViewUrl('admin-dash');
      return;
    }
    if (!isLoggedIn && view !== 'landing' && view !== 'onboarding' && view !== 'business-verification' && view !== 'search' && view !== 'coming-soon' && view !== 'universities') {
      setActiveView('onboarding');
      pushViewUrl('onboarding');
      setToastNotice('Please sign up or sign in to access verified accommodation.');
      setTimeout(() => setToastNotice(null), 4000);
      return;
    }

    const isVerified = auth.currentUser ? (auth.currentUser.emailVerified || auth.currentUser.providerData.some(p => p.providerId === 'google.com')) : true;

    if (isLoggedIn && !isVerified && (view === 'student-dash' || view === 'agent-dash' || view === 'saved' || view === 'messages' || view === 'inspections' || view === 'business-verification')) {
      setActiveView('onboarding');
      pushViewUrl('onboarding');
      setToastNotice('Please verify your email address before accessing portal features.');
      setTimeout(() => setToastNotice(null), 5000);
      return;
    }

    if (isLoggedIn && view === 'onboarding') {
      if (!isVerified) {
        setActiveView('onboarding');
        pushViewUrl('onboarding');
        return;
      }
      setActiveView('search');
      pushViewUrl('search');
      setToastNotice('You are already signed in!');
      setTimeout(() => setToastNotice(null), 3000);
      return;
    }
    setActiveView(view);
    pushViewUrl(view as any);
  };
  const [pendingAgentRegistration, setPendingAgentRegistration] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [universities, setUniversities] = useState<University[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isListingsLoading, setIsListingsLoading] = useState<boolean>(true);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  const [studentTab, setStudentTab] = useState<'inspections' | 'saved' | 'chats' | 'profile'>('inspections');
  const [agentTab, setAgentTab] = useState<'schedule' | 'availability' | 'requests' | 'profile'>('schedule');

  // Accounts Management State (populated exclusively from active Firebase Auth session)
  const [accounts, setAccounts] = useState<User[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');

  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const [filters, setFilters] = useState<SearchFilters>({
    universityId: 'uniosun',
    institutionType: 'all',
    stateFilter: 'all',
    minPrice: 0,
    maxPrice: 2000000,
    propertyTypes: [],
    facilities: [],
    maxWalkingMinutes: 20,
    genderPreference: 'all',
    billsIncludedOnly: false,
    sortBy: 'distance'
  });

  // Real-Time Notification Center State
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [activeToastNotification, setActiveToastNotification] = useState<AppNotification | null>(null);

  // First-Time User Onboarding Showcase & Guided App Tour State
  const [showOnboardingShowcase, setShowOnboardingShowcase] = useState<boolean>(false);
  const [showGuidedTour, setShowGuidedTour] = useState<boolean>(false);

  // Documentation & Legal Info Modal State
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedInfoDocId, setSelectedInfoDocId] = useState<string>('terms-and-conditions');

  const handleOpenInfoPage = (docId: string) => {
    setSelectedInfoDocId(docId);
    setIsInfoModalOpen(true);
  };

  // Firebase Auth State Listener & User Profile Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setIsLoggedIn(false);
        setAccounts([]);
        setActiveAccountId('');
        localStorage.removeItem('dormiqa_is_logged_in');
        localStorage.removeItem('campora_is_logged_in');
        localStorage.removeItem('dormiqa_user_accounts');
        localStorage.removeItem('dormiqa_active_account_id');
        localStorage.removeItem('dormiqa_admin_email');
        setIsAdminAuthenticated(false);
        setAdminAuthStatus('UNAUTHENTICATED');
        return;
      }

      try {
        await fbUser.reload();
      } catch (e) {
        // ignore reload errors
      }

      const uid = fbUser.uid;
      const email = fbUser.email?.toLowerCase() || '';

      // Check Admin authorization from Firestore & 12-hour session validity
      if (email) {
        setAdminAuthStatus('ADMIN_CHECKING');
        const adminCheck = await checkAdminAuthorizedInFirestore(email, uid);
        if (adminCheck.authorized) {
          const isSessionValid = checkAdminSessionValid(uid);
          if (isSessionValid) {
            setIsAdminAuthenticated(true);
            setAdminEmail(email);
            setAdminRole(adminCheck.role || (email === 'buildsafe247@gmail.com' ? 'SUPER_ADMIN' : 'ADMIN'));
            setAdminAuthStatus('AUTHORIZED');
            try {
              localStorage.setItem('dormiqa_admin_email', email);
            } catch {}
          } else {
            console.warn(`12-hour Admin session expired for ${email}`);
            clearAdminSessionTimestamp(uid);
            await signOut(auth);
            setIsAdminAuthenticated(false);
            setAdminAuthStatus('SESSION_EXPIRED');
          }
        } else {
          setIsAdminAuthenticated(false);
          setAdminAuthStatus('UNAUTHORIZED');
          clearAdminSessionTimestamp(uid);
        }
      } else {
        setIsAdminAuthenticated(false);
        setAdminAuthStatus('UNAUTHENTICATED');
      }

      let profile = await fetchUserProfileFromFirestore(uid);
      if (!profile && email) {
        profile = await fetchUserProfileFromFirestore(email);
      }

      const isVerified = fbUser.emailVerified || fbUser.providerData.some(p => p.providerId === 'google.com');

      const userAccount: User = {
        id: uid,
        name: profile?.name || fbUser.displayName || email.split('@')[0] || 'User',
        email: email,
        role: profile?.role || 'student',
        phone: profile?.phone || '',
        universityId: profile?.universityId || 'uniosun',
        universityName: profile?.universityName || 'Osun State University',
        agencyName: profile?.agencyName || '',
        isVerifiedAgent: profile?.businessVerificationStatus === 'approved' || profile?.isVerifiedAgent || false,
        isEmailVerified: isVerified,
        businessVerificationStatus: profile?.businessVerificationStatus || (profile?.isVerifiedAgent ? 'approved' : 'none'),
        businessVerificationDetails: profile?.businessVerificationDetails,
        rejectionReason: profile?.rejectionReason,
        avatarUrl: profile?.avatarUrl || fbUser.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        createdAt: profile?.createdAt || new Date().toISOString().split('T')[0]
      };

      if (profile?.savedListingIds && Array.isArray(profile.savedListingIds)) {
        setSavedIds(profile.savedListingIds);
      }

      if (userAccount.universityId) {
        setFilters(prev => ({ ...prev, universityId: userAccount.universityId || 'uniosun' }));
      }

      setAccounts([userAccount]);
      setActiveAccountId(uid);
      setCurrentRole(userAccount.role);
      setIsLoggedIn(true);
      localStorage.setItem('dormiqa_is_logged_in', 'true');

      // Real-Time Listener on User Document in Firestore
      const userDocRef = doc(db, 'users', uid);
      const unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const liveData = docSnap.data();
          const liveStatus = liveData.businessVerificationStatus || (liveData.isVerifiedAgent ? 'approved' : 'none');
          setAccounts(prev => prev.map(a => {
            if (a.id === uid) {
              return {
                ...a,
                name: liveData.name || a.name,
                agencyName: liveData.agencyName || a.agencyName,
                phone: liveData.phone || a.phone,
                universityId: liveData.universityId || a.universityId,
                universityName: liveData.universityName || a.universityName,
                licenseNumber: liveData.licenseNumber || a.licenseNumber,
                isVerifiedAgent: liveStatus === 'approved',
                businessVerificationStatus: liveStatus,
                businessVerificationDetails: liveData.businessVerificationDetails || a.businessVerificationDetails,
                rejectionReason: liveData.rejectionReason || a.rejectionReason,
                avatarUrl: liveData.avatarUrl || a.avatarUrl
              };
            }
            return a;
          }));

          if (liveData.universityId) {
            setFilters(prev => ({ ...prev, universityId: liveData.universityId }));
          }

          if (liveData.savedListingIds && Array.isArray(liveData.savedListingIds)) {
            setSavedIds(liveData.savedListingIds);
          }
        }
      }, (err) => console.warn('User doc snapshot error:', err));

      // Existing user auto-route: If authenticated user lands on onboarding or agent pages, route strictly
      const initialRoute = parseRouteFromUrl();
      if (initialRoute.type === 'view' && (initialRoute.view === 'onboarding' || initialRoute.view === 'agent-dash' || initialRoute.view === 'agent-landing')) {
        if (userAccount.role === 'agent') {
          if (!isVerified) {
            setActiveView('agent-landing');
            pushViewUrl('agent-landing');
          } else if (userAccount.businessVerificationStatus !== 'approved') {
            setActiveView('business-verification');
            pushViewUrl('business-verification');
          } else {
            setActiveView('agent-dash');
            pushViewUrl('agent-dash');
          }
        } else {
          setActiveView('search');
          pushViewUrl('search');
        }
      }

      if (!isVerified && email) {
        setToastNotice(`Notice: Your email address (${email}) is not verified yet. Check your inbox.`);
        setTimeout(() => setToastNotice(null), 6000);
      }
    });

    const handleFocus = async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.reload();
        } catch (e) {}
        if (auth.currentUser.emailVerified) {
          setAccounts(prev => prev.map(acc => {
            if (acc.id === auth.currentUser?.uid || acc.email.toLowerCase() === auth.currentUser?.email?.toLowerCase()) {
              return { ...acc, isEmailVerified: true };
            }
            return acc;
          }));
        }
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Client-Side Routing & Property Resolution State
  const [currentRoute, setCurrentRoute] = useState<ParsedRoute>(() => parseRouteFromUrl());
  const [routePropertyLoading, setRoutePropertyLoading] = useState<boolean>(false);
  const [routePropertyError, setRoutePropertyError] = useState<string | null>(null);
  const [routePropertyUnavailableReason, setRoutePropertyUnavailableReason] = useState<string | null>(null);
  const [is404Route, setIs404Route] = useState<boolean>(false);

  // Sync route state on popstate (browser navigation buttons)
  useEffect(() => {
    if (currentRole === 'agent' && activeView === 'search') {
      setActiveView('agent-dash');
      pushViewUrl('agent-dash');
    }
  }, [currentRole, activeView]);

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseRouteFromUrl();
      setCurrentRoute(parsed);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Helper to open property detail and push canonical property URL
  const handleOpenListingDetail = (l: Listing) => {
    setDetailListing(l);
    setIs404Route(false);
    setRoutePropertyError(null);
    setRoutePropertyUnavailableReason(null);
    pushPropertyUrl(l.id);
  };

  // Helper to close property detail and reset URL
  const handleCloseListingDetail = () => {
    setDetailListing(null);
    pushViewUrl(activeView);
  };

  // Property & Route Resolution Effect (Data-Driven Lookup)
  const resolveCurrentRoute = async (targetRoute: ParsedRoute) => {
    if (targetRoute.type === 'property' && targetRoute.propertyId) {
      setRoutePropertyLoading(true);
      setRoutePropertyError(null);
      setRoutePropertyUnavailableReason(null);
      setIs404Route(false);

      try {
        const foundListing = await fetchListingById(targetRoute.propertyId);

        if (!foundListing) {
          // Property genuinely does not exist in Firestore or API
          setIs404Route(true);
          setDetailListing(null);
        } else {
          // Check Visibility Rules (Requirement #6)
          const isUnavailableStatus = ['banned', 'rejected', 'deleted', 'inactive'].includes(foundListing.status || '');
          const isOwner = foundListing.agentId === activeAccountId || (auth.currentUser && foundListing.agentId === auth.currentUser.uid);
          const isAdmin = currentRole === 'admin';

          if (isUnavailableStatus && !isOwner && !isAdmin) {
            setRoutePropertyUnavailableReason('This property listing is currently unavailable or has been deactivated by the caretaker.');
            setDetailListing(null);
          } else {
            // Property is valid and viewable
            setDetailListing(foundListing);
            setActiveView('search');
          }
        }
      } catch (err: any) {
        // System / Network Error (Requirement #9)
        setRoutePropertyError(err.message || 'Failed to connect to property database. Please check your internet connection.');
        setDetailListing(null);
      } finally {
        setRoutePropertyLoading(false);
      }
    } else if (targetRoute.type === '404') {
      setIs404Route(true);
      setRoutePropertyLoading(false);
      setDetailListing(null);
    } else if (targetRoute.type === 'view') {
      setIs404Route(false);
      setRoutePropertyError(null);
      setRoutePropertyUnavailableReason(null);
      setRoutePropertyLoading(false);
      if (targetRoute.view) {
        setActiveView(targetRoute.view);
      }
    }
  };

  useEffect(() => {
    resolveCurrentRoute(currentRoute);
  }, [currentRoute, activeAccountId, currentRole]);

  useEffect(() => {
    const unsubscribe = subscribeUserNotifications(
      activeAccountId,
      filters.universityId,
      (updatedList) => setNotifications(updatedList),
      (newNotif) => setActiveToastNotification(newNotif)
    );
    return () => unsubscribe();
  }, [activeAccountId, filters.universityId]);

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleTogglePinNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const handleSelectNotification = (notif: AppNotification) => {
    setIsNotificationCenterOpen(false);
    setActiveToastNotification(null);

    if (notif.type === 'message') {
      const conv = conversations.find(c => c.id === notif.metadata?.conversationId) || conversations[0];
      if (conv) {
        setActiveConversation(conv);
      } else {
        setActiveView('student-dash');
        setStudentTab('chats');
      }
    } else if (notif.type === 'inspection') {
      if (currentRole === 'agent') {
        setActiveView('agent-dash');
        setAgentTab('schedule');
      } else {
        setActiveView('student-dash');
        setStudentTab('inspections');
      }
    } else if (notif.type === 'listing') {
      if (notif.metadata?.listingId) {
        const target = listings.find(l => l.id === notif.metadata?.listingId);
        if (target) {
          setDetailListing(target);
        } else {
          setActiveView('search');
        }
      } else {
        setActiveView('search');
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('dormiqa_user_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('dormiqa_active_account_id', activeAccountId);
    const activeAcc = accounts.find(a => a.id === activeAccountId);
    if (activeAcc) {
      setCurrentRole(activeAcc.role);
    }
  }, [activeAccountId, accounts]);

  const handleSignOut = async () => {
    try {
      await logoutFirebase();
    } catch (err) {
      console.warn("Firebase signout error:", err);
    }
    const currentAcc = accounts.find(a => a.id === activeAccountId);
    setIsLoggedIn(false);
    localStorage.removeItem('dormiqa_is_logged_in');
    localStorage.removeItem('campora_is_logged_in');
    localStorage.removeItem('dormiqa_user_accounts');
    localStorage.removeItem('dormiqa_active_account_id');
    setAccounts([]);
    setActiveAccountId('');
    setToastNotice(`Successfully signed out of ${currentAcc?.name || 'account'}`);
    setTimeout(() => setToastNotice(null), 4000);
    setActiveView('landing');
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await logoutFirebase();
    } catch (err) {
      console.warn("Firebase signout on delete error:", err);
    }
    const accToDelete = accounts.find(a => a.id === accountId);
    const remaining = accounts.filter(a => a.id !== accountId);

    setIsLoggedIn(false);
    localStorage.removeItem('dormiqa_is_logged_in');
    localStorage.removeItem('campora_is_logged_in');

    if (remaining.length === 0) {
      localStorage.removeItem('dormiqa_user_accounts');
      localStorage.removeItem('dormiqa_active_account_id');
      setAccounts([]);
      setActiveAccountId('');
      setCurrentRole('student');
      setActiveView('landing');
      setToastNotice(`Account deleted. Returned to home screen.`);
      setTimeout(() => setToastNotice(null), 4000);
      return;
    }

    setAccounts(remaining);
    setActiveAccountId(remaining[0].id);
    setCurrentRole(remaining[0].role);
    setActiveView('landing');
    setToastNotice(`Permanently deleted account for ${accToDelete?.name || 'user'}`);
    setTimeout(() => setToastNotice(null), 4000);
  };

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dormiqa_saved_ids') || localStorage.getItem('campora_saved_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Modal States
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [bookingListing, setBookingListing] = useState<Listing | null>(null);
  const [reportListing, setReportListing] = useState<Listing | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    loadUniversitiesData();
    loadInspectionsData();
    loadConversationsData();
  }, []);

  useEffect(() => {
    loadListingsData();

    // Real-Time Listener on Listings Collection in Firestore
    const listingsCol = collection(db, 'listings');
    const unsubscribeListings = onSnapshot(listingsCol, (snapshot) => {
      if (!snapshot.empty) {
        const liveListings: Listing[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || 'Accommodation',
            pricePerYear: data.pricePerYear || data.price || 0,
            pricePeriod: data.pricePeriod || data.period || 'year',
            universityId: data.universityId || '',
            universityName: data.universityName || '',
            state: data.state || '',
            city: data.city || '',
            area: data.area || '',
            propertyType: data.propertyType || data.type || 'self-contain',
            genderPreference: data.genderPreference || 'mixed',
            distanceMinutesWalk: data.distanceMinutesWalk || 5,
            vacanciesCount: data.vacanciesCount !== undefined ? data.vacanciesCount : (data.availableUnits !== undefined ? data.availableUnits : 1),
            photos: data.photos || data.imageUrls || ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'],
            videoUrl: data.videoUrl,
            facilities: data.facilities || data.features || [],
            description: data.description || '',
            address: data.address || '',
            agentId: data.agentId || data.userId || '',
            agentName: data.agentName || 'Agent',
            agentPhone: data.agentPhone || '',
            agentAvatar: data.agentAvatar || '',
            isVerified: Boolean(data.isVerified || data.status === 'approved' || data.verificationStatus === 'approved'),
            status: data.status || data.verificationStatus || 'pending',
            verificationStatus: data.verificationStatus || data.status || 'pending',
            rejectionReason: data.rejectionReason || data.aiBanReason || null,
            createdAt: data.createdAt || new Date().toISOString()
          } as unknown as Listing;
        });

        setListings(liveListings);
      }
    }, (err) => console.warn('Listings snapshot listener fallback:', err));

    return () => unsubscribeListings();
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('dormiqa_saved_ids', JSON.stringify(savedIds));
  }, [savedIds]);

  const loadUniversitiesData = async () => {
    const data = await fetchUniversities();
    setUniversities(data);
  };

  const loadListingsData = async () => {
    setIsListingsLoading(true);
    try {
      const params: any = {
        universityId: filters.universityId,
        maxPrice: filters.maxPrice,
        maxWalkingMinutes: filters.maxWalkingMinutes,
        sortBy: filters.sortBy
      };
      if (filters.propertyTypes.length > 0) params.propertyType = filters.propertyTypes.join(',');
      if (filters.facilities.length > 0) params.facilities = filters.facilities.join(',');
      if (filters.genderPreference !== 'all') params.genderPreference = filters.genderPreference;

      const data = await fetchListings(params);
      setListings(data);
    } catch (err) {
      console.error("Failed to load listings:", err);
    } finally {
      setIsListingsLoading(false);
    }
  };

  const loadInspectionsData = async () => {
    const currentUserId = auth.currentUser?.uid || activeAccountId;
    if (!currentUserId) return;
    const data = await fetchInspections({ studentId: currentUserId });
    setInspections(data);
  };

  const loadConversationsData = async () => {
    const currentUserId = auth.currentUser?.uid || activeAccountId;
    if (!currentUserId) return;
    const data = await fetchConversations(currentUserId);
    setConversations(data);
  };

  const toggleSave = async (listingId: string) => {
    const newSavedIds = savedIds.includes(listingId)
      ? savedIds.filter(id => id !== listingId)
      : [...savedIds, listingId];

    setSavedIds(newSavedIds);
    try {
      localStorage.setItem('dormiqa_saved_ids', JSON.stringify(newSavedIds));
    } catch (e) {}

    const uid = auth.currentUser?.uid || activeAccountId;
    if (uid) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('./services/firebase');
        await setDoc(doc(db, 'users', uid), { savedListingIds: newSavedIds }, { merge: true });
      } catch (err) {
        console.warn('Failed to sync saved hostels to Firestore:', err);
      }
    }
  };

  const handleSelectUniversity = (uniId: string) => {
    if (uniId !== 'uniosun') {
      setSelectedComingSoonUniId(uniId);
      setActiveView('coming-soon');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFilters(prev => ({ ...prev, universityId: 'uniosun' }));
    if (!isLoggedIn) {
      setActiveView('onboarding');
      setToastNotice('Please sign up or sign in to search verified accommodation.');
      setTimeout(() => setToastNotice(null), 4000);
    } else {
      setActiveView('search');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartChatWithAgent = async (agentId: string, listingId: string) => {
    if (!isLoggedIn) {
      setActiveView('onboarding');
      setToastNotice('Please sign up or sign in to message the caretaker directly.');
      setTimeout(() => setToastNotice(null), 4000);
      return;
    }

    try {
      const currentUserId = auth.currentUser?.uid || activeAccountId;
      const studentName = auth.currentUser?.displayName || 
                          (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Verified Student');
      const studentAvatar = auth.currentUser?.photoURL || undefined;

      const conv = await startConversation({
        studentId: currentUserId,
        studentName,
        studentAvatar,
        agentId,
        listingId
      });

      setActiveConversation(conv);
      loadConversationsData();
    } catch (err) {
      console.error('Error starting conversation:', err);
      setToastNotice('Unable to start direct chat. Please try again.');
      setTimeout(() => setToastNotice(null), 3000);
    }
  };

  const selectedUni = universities.find(u => u.id === filters.universityId) || universities[0];
  const availableCampuses = getCampusesByUniversityId(filters.universityId, universities);
  const selectedCampus = availableCampuses.find(c => c.id === filters.selectedCampusId) || availableCampuses[0];

  // Apply campus distance filtering and sorting
  const displayListings = listings
    .filter(l => {
      if (!filters.maxDistanceKm || filters.maxDistanceKm <= 0 || !selectedCampus) return true;
      const dist = calculateHaversineDistanceKm(l.lat, l.lng, selectedCampus.lat, selectedCampus.lng);
      return dist <= filters.maxDistanceKm;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'distance' && selectedCampus) {
        const distA = calculateHaversineDistanceKm(a.lat, a.lng, selectedCampus.lat, selectedCampus.lng);
        const distB = calculateHaversineDistanceKm(b.lat, b.lng, selectedCampus.lat, selectedCampus.lng);
        return distA - distB;
      }
      return 0;
    });

  const savedListings = listings.filter(l => savedIds.includes(l.id));

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* Global Navbar for Public/Student Pages without embedded header */}
      {(currentRole !== 'student' || ['landing', 'onboarding', 'coming-soon'].includes(activeView)) && 
       !['agent-dash', 'agent-landing', 'admin-dash'].includes(activeView) && (
        <Navbar
          activeView={activeView as any}
          setActiveView={navigateView as any}
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
          savedCount={savedIds.length}
          unreadCount={conversations.length}
          notificationUnreadCount={notifications.filter(n => !n.read).length}
          onOpenNotifications={() => setIsNotificationCenterOpen(true)}
          universities={universities}
          selectedUniversityId={filters.universityId}
          onSelectUniversity={handleSelectUniversity}
          onOpenAddModal={() => setAddModalOpen(true)}
          onNavigateStudentTab={(t) => setStudentTab(t)}
          onNavigateAgentTab={(t) => setAgentTab(t)}
          onOpenAdminAccess={() => navigateView('admin-dash')}
          studentTab={studentTab}
          agentTab={agentTab}
          onReplayTour={() => {
            setActiveView('search');
            setShowGuidedTour(true);
          }}
          onReplayOnboarding={() => setShowOnboardingShowcase(true)}
        />
      )}

      {/* Unverified Email Warning Banner for Existing Logged-In Users */}
      {isLoggedIn && auth.currentUser && !auth.currentUser.emailVerified && !auth.currentUser.providerData.some(p => p.providerId === 'google.com') && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/30 px-4 py-2.5 text-xs font-medium text-amber-900 dark:text-amber-200 transition-colors">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Email Verification Pending:</strong> Your email address <strong>({auth.currentUser.email})</strong> is not verified yet. Please check your inbox for the link.
              </span>
            </div>
            <button
              onClick={async () => {
                try {
                  await resendVerificationEmail();
                  setToastNotice('Verification link sent! Please check your email inbox and spam folder.');
                  setTimeout(() => setToastNotice(null), 5000);
                } catch (err: any) {
                  setToastNotice('Could not send verification email: ' + (err?.message || 'Try again'));
                  setTimeout(() => setToastNotice(null), 5000);
                }
              }}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              Resend Verification Link
            </button>
          </div>
        </div>
      )}

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {routePropertyLoading ? (
          <PropertyLoadingSkeleton />
        ) : routePropertyError ? (
          <PropertyErrorView
            errorMessage={routePropertyError}
            onRetry={() => resolveCurrentRoute(currentRoute)}
            onGoToSearch={() => navigateView('search')}
          />
        ) : routePropertyUnavailableReason ? (
          <PropertyUnavailableView
            reason={routePropertyUnavailableReason}
            onGoToSearch={() => navigateView('search')}
          />
        ) : is404Route ? (
          <NotFoundPage
            onGoHome={() => navigateView('landing')}
            onGoToSearch={() => navigateView('search')}
            requestedPath={typeof window !== 'undefined' ? window.location.pathname : undefined}
          />
        ) : (
          <>
            {/* 1. Landing Page */}
            {activeView === 'landing' && (
              <LandingPage
                universities={universities}
                onSearchUniversity={handleSelectUniversity}
                onOpenAgentPortal={() => {
                  if (!isLoggedIn) {
                    setActiveView('onboarding');
                  } else {
                    setCurrentRole('agent');
                    setActiveView('agent-dash');
                  }
                }}
                onOpenOnboarding={() => setActiveView('onboarding')}
                onOpenAllUniversities={() => navigateView('universities')}
              />
            )}

            {/* Dedicated Universities Directory Page */}
            {activeView === 'universities' && (
              <UniversitiesPage
                universities={universities}
                onSearchUniversity={(uniId) => handleSelectUniversity(uniId)}
                onBackToLanding={() => navigateView('landing')}
              />
            )}

        {/* Coming Soon Page for Universities outside UNIOSUN */}
        {activeView === 'coming-soon' && (
          <ComingSoonPage
            university={universities.find(u => u.id === selectedComingSoonUniId) || universities.find(u => u.id === 'unilag') || universities[0]}
            universities={universities}
            onSelectUniversity={(uniId) => {
              if (uniId === 'uniosun') {
                handleSelectUniversity('uniosun');
              } else {
                setSelectedComingSoonUniId(uniId);
              }
            }}
            onGoBackToUniosun={() => handleSelectUniversity('uniosun')}
          />
        )}

        {/* Onboarding Gateway Page */}
        {activeView === 'onboarding' && (
          <OnboardingPage
            universities={universities}
            onCompleteOnboarding={(userData) => {
              setIsLoggedIn(true);
              localStorage.setItem('dormiqa_is_logged_in', 'true');
              setCurrentRole(userData.role);

              const currentUid = auth.currentUser?.uid || `usr_${Date.now()}`;
              const currentEmail = auth.currentUser?.email || userData.email || '';
              const isVerified = auth.currentUser ? (auth.currentUser.emailVerified || auth.currentUser.providerData.some(p => p.providerId === 'google.com')) : (userData.isEmailVerified === true);

              const newAccount: User = {
                id: currentUid,
                name: userData.name || currentEmail.split('@')[0] || 'User',
                email: currentEmail,
                role: userData.role,
                avatarUrl: userData.avatarUrl || auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
                phone: userData.phone,
                universityName: userData.universityName,
                agencyName: userData.agencyName,
                isVerifiedAgent: false,
                isEmailVerified: isVerified,
                createdAt: new Date().toISOString().split('T')[0]
              };

              saveUserToFirestore(newAccount);

              setAccounts([newAccount]);
              setActiveAccountId(newAccount.id);

              const isSignup = Boolean(userData.isSignup);

              if (userData.role === 'agent') {
                setCurrentRole('agent');
                setShowOnboardingShowcase(false);
                if (!isSignup) {
                  // RETURNING AGENT SIGN IN -> Directly to Agent Caretaker Dashboard
                  setActiveView('agent-dash');
                  pushViewUrl('agent-dash');
                  setToastNotice(`Welcome back to your Caretaker Dashboard, ${newAccount.name}!`);
                  setTimeout(() => setToastNotice(null), 4000);
                } else {
                  // NEW AGENT SIGNUP -> Directly to Business Verification or Caretaker Dashboard
                  setPendingAgentRegistration(newAccount);
                  setActiveView('business-verification');
                  pushViewUrl('business-verification');
                  setToastNotice(`Agent account registered! Redirecting to business verification...`);
                  setTimeout(() => setToastNotice(null), 4000);
                }
              } else if (!isSignup) {
                // RETURNING STUDENT SIGN IN -> Directly to Student Discover (search) page
                setCurrentRole('student');
                setActiveView('search');
                pushViewUrl('search');
                setToastNotice(`Welcome back, ${newAccount.name}!`);
                setTimeout(() => setToastNotice(null), 4000);
              } else {
                // NEW STUDENT SIGNUP -> Directly to Student Discover page with showcase modal
                setCurrentRole('student');
                setActiveView('search');
                pushViewUrl('search');
                setShowOnboardingShowcase(true);
                setToastNotice(`Welcome to Dormiqa, ${newAccount.name}!`);
                setTimeout(() => setToastNotice(null), 4000);
              }
            }}
            onBackToLanding={() => setActiveView('landing')}
          />
        )}

        {/* Agent Portal Landing Page (Unauthenticated / Unverified Entry Point) */}
        {activeView === 'agent-landing' && (
          <AgentPortalLanding
            universities={universities}
            onAgentAuthenticated={(agentUser) => {
              setAccounts([agentUser]);
              setActiveAccountId(agentUser.id);
              setIsLoggedIn(true);
              setCurrentRole('agent');
              setPendingAgentRegistration(agentUser);

              if (!agentUser.isEmailVerified) {
                setActiveView('agent-landing');
              } else if (agentUser.businessVerificationStatus !== 'approved') {
                setActiveView('business-verification');
                pushViewUrl('business-verification');
              } else {
                setActiveView('agent-dash');
                pushViewUrl('agent-dash');
              }
            }}
            onOpenAdminAccess={() => navigateView('admin-dash')}
            onGoToStudentView={() => setActiveView('landing')}
          />
        )}

        {/* Business Verification Page for Agent Verification Gate */}
        {activeView === 'business-verification' && (
          <BusinessVerificationPage
            agentData={accounts.find(a => a.id === activeAccountId) || pendingAgentRegistration}
            onCompleteVerification={({ licenseNumber, avatarUrl }) => {
              const currentId = activeAccountId || pendingAgentRegistration?.id;
              if (currentId) {
                setAccounts(prev => prev.map(a => 
                  a.id === currentId
                    ? { 
                        ...a, 
                        licenseNumber, 
                        isVerifiedAgent: false,
                        businessVerificationStatus: 'pending',
                        avatarUrl: avatarUrl || a.avatarUrl,
                        isAvatarLocked: true,
                        verificationPhotoUrl: avatarUrl || a.avatarUrl
                      }
                    : a
                ));
              }
              setToastNotice('Business verification details submitted! Verification is now in progress.');
              setTimeout(() => setToastNotice(null), 4000);
            }}
            onSignOut={handleSignOut}
          />
        )}

        {/* 2. Redesigned Student Portal Views */}
        {activeView === 'search' && currentRole === 'student' && (
          <StudentDiscoverPage
            listings={displayListings}
            isListingsLoading={isListingsLoading}
            savedIds={savedIds}
            onToggleSave={toggleSave}
            onOpenDetail={(l) => handleOpenListingDetail(l)}
            onBookInspection={(l) => setBookingListing(l)}
            onStartChat={(agentId, listingId) => handleStartChatWithAgent(agentId, listingId)}
            universities={universities}
            selectedUniversityId={filters.universityId}
            onSelectUniversity={(uniId) => handleSelectUniversity(uniId)}
            selectedCampus={selectedCampus}
            notificationCount={notifications.filter(n => !n.read).length}
            onOpenNotifications={() => setIsNotificationCenterOpen(true)}
            onOpenProfile={() => navigateView('student-dash')}
            userAvatar={auth.currentUser?.photoURL || undefined}
            userName={auth.currentUser?.displayName || undefined}
          />
        )}

        {/* Saved Page */}
        {activeView === 'saved' && (
          <SavedPage
            savedListings={savedListings}
            savedIds={savedIds}
            onToggleSave={toggleSave}
            onOpenDetail={(l) => handleOpenListingDetail(l)}
            onBookInspection={(l) => setBookingListing(l)}
            onStartChat={(agentId, listingId) => handleStartChatWithAgent(agentId, listingId)}
            onGoBack={() => navigateView('search')}
            selectedCampus={selectedCampus}
          />
        )}

        {/* Messages / Chats Page */}
        {activeView === 'messages' && (
          <ChatsPage
            conversations={conversations}
            onOpenChat={(conv) => setActiveConversation(conv)}
            onGoBack={() => navigateView('search')}
            currentRole={currentRole}
          />
        )}

        {/* Inspections & Requests Page */}
        {activeView === 'inspections' && (
          <InspectionsPage
            inspections={inspections}
            allListings={listings}
            onOpenListing={(l) => handleOpenListingDetail(l)}
            onStartChat={(agentId, listingId) => handleStartChatWithAgent(agentId, listingId)}
            onGoBack={() => navigateView('search')}
          />
        )}

        {/* Student Profile Page */}
        {activeView === 'student-dash' && (
          <StudentProfilePage
            user={accounts.find(a => a.id === activeAccountId)}
            universities={universities}
            savedCount={savedIds.length}
            chatsCount={conversations.length}
            inspectionsCount={inspections.length}
            onNavigateView={(view) => navigateView(view)}
            onSignOut={handleSignOut}
            onGoBack={() => navigateView('search')}
          />
        )}

        {/* Mobile Bottom Navigation Bar for Student Portal */}
        {currentRole === 'student' && 
         ['search', 'landing', 'saved', 'messages', 'inspections', 'student-dash'].includes(activeView) && (
          <BottomNav
            activeView={activeView}
            onNavigate={(view) => navigateView(view)}
            savedCount={savedIds.length}
            unreadCount={conversations.length}
          />
        )}

        {/* 6. Agent Dashboard Gate & Rendering */}
        {activeView === 'agent-dash' && (() => {
          const currentAccount = accounts.find(a => a.id === activeAccountId);
          const isEmailVerified = auth.currentUser ? (auth.currentUser.emailVerified || auth.currentUser.providerData.some(p => p.providerId === 'google.com')) : currentAccount?.isEmailVerified;
          const isApproved = currentAccount?.businessVerificationStatus === 'approved';

          // Gate 1 & 2: Unauthenticated or Email unverified -> Agent Landing Page
          if (!isLoggedIn || !isEmailVerified) {
            return (
              <AgentPortalLanding
                universities={universities}
                onAgentAuthenticated={(agentUser) => {
                  setAccounts([agentUser]);
                  setActiveAccountId(agentUser.id);
                  setIsLoggedIn(true);
                  setCurrentRole('agent');
                  setPendingAgentRegistration(agentUser);
                }}
                onOpenAdminAccess={() => navigateView('admin-dash')}
                onGoToStudentView={() => setActiveView('landing')}
              />
            );
          }

          // Gate 3: Business verification pending / unsubmitted / rejected -> Business Verification Page
          if (!isApproved) {
            const status = currentAccount?.businessVerificationStatus;
            if (status === 'pending') {
              return (
                <VerificationStatusPage
                  agentData={currentAccount || pendingAgentRegistration}
                  onSignOut={handleSignOut}
                  onApproved={() => {
                    const currentId = activeAccountId || pendingAgentRegistration?.id;
                    if (currentId) {
                      setAccounts(prev => prev.map(a => 
                        a.id === currentId
                          ? { ...a, businessVerificationStatus: 'approved', isVerifiedAgent: true }
                          : a
                      ));
                    }
                  }}
                />
              );
            }

            return (
              <BusinessVerificationPage
                agentData={currentAccount || pendingAgentRegistration}
                onCompleteVerification={({ licenseNumber, avatarUrl }) => {
                  const currentId = activeAccountId || pendingAgentRegistration?.id;
                  if (currentId) {
                    setAccounts(prev => prev.map(a => 
                      a.id === currentId
                        ? { 
                            ...a, 
                            licenseNumber, 
                            isVerifiedAgent: false,
                            businessVerificationStatus: 'pending',
                            avatarUrl: avatarUrl || a.avatarUrl,
                            isAvatarLocked: true,
                            verificationPhotoUrl: avatarUrl || a.avatarUrl
                          }
                        : a
                    ));
                  }
                  setToastNotice('Business verification details submitted! Verification is now in progress.');
                  setTimeout(() => setToastNotice(null), 4000);
                }}
                onSignOut={handleSignOut}
              />
            );
          }

          // Fully Authenticated & Verified -> Render Agent Dashboard
          return (
            <AgentDashboard
              listings={listings}
              inspections={inspections}
              conversations={conversations}
              universities={universities}
              onOpenAddModal={() => setAddModalOpen(true)}
              onOpenChat={(conv) => setActiveConversation(conv)}
              onOpenListingDetail={(l) => handleOpenListingDetail(l)}
              onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
              onOpenAdminAccess={() => navigateView('admin-dash')}
              onOpenInfoPage={handleOpenInfoPage}
              activeTab={agentTab}
              onTabChange={setAgentTab}
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSignOut={handleSignOut}
              onDeleteAccount={handleDeleteAccount}
              onListingUpdate={(updatedListing) => {
                setListings(prev => prev.map(l => l.id === updatedListing.id ? updatedListing : l));
                if (detailListing?.id === updatedListing.id) {
                  setDetailListing(updatedListing);
                }
              }}
            />
          );
        })()}

        {/* 7. Admin Dashboard Gate & View */}
        {activeView === 'admin-dash' && (() => {
          if (adminAuthStatus === 'AUTHORIZED' && isAdminAuthenticated) {
            return (
              <AdminDashboard
                currentAdminEmail={adminEmail}
                currentAdminRole={adminRole}
                onRefresh={loadListingsData}
                onAdminLogout={async () => {
                  const uid = auth.currentUser?.uid;
                  clearAdminSessionTimestamp(uid);
                  await signOut(auth);
                  clearAdminToken();
                  setIsAdminAuthenticated(false);
                  setAdminAuthStatus('SIGNED_OUT');
                  setCurrentRole('student');
                  setActiveView('admin-dash');
                  pushViewUrl('admin-dash');
                  setToastNotice('Admin session logged out.');
                  setTimeout(() => setToastNotice(null), 3000);
                }}
              />
            );
          }

          return (
            <AdminAccessScreen
              status={adminAuthStatus}
              currentUserEmail={auth.currentUser?.email || undefined}
              onContinueWithGoogle={handleAdminGoogleSignIn}
              onBackToDormiqa={() => {
                signOut(auth).catch(() => {});
                setIsAdminAuthenticated(false);
                setAdminAuthStatus('UNAUTHENTICATED');
                setActiveView('landing');
                pushViewUrl('landing');
              }}
            />
          );
        })()}
          </>
        )}
      </main>

      {/* Global Toast Notification */}
      {toastNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {toastNotice}
        </div>
      )}

      {/* Footer */}
      <Footer
        onSelectUniversity={handleSelectUniversity}
        onOpenAgentPortal={() => {
          if (!isLoggedIn) {
            setActiveView('onboarding');
          } else {
            setCurrentRole('agent');
            setActiveView('agent-dash');
          }
        }}
        onOpenOnboarding={() => setActiveView('onboarding')}
        onOpenInfoPage={handleOpenInfoPage}
      />

      {/* MODALS & DRAWERS */}
      
      {/* Listing Detail Modal */}
      {detailListing && (
        <ListingDetailModal
          listing={detailListing}
          onClose={() => handleCloseListingDetail()}
          isSaved={savedIds.includes(detailListing.id)}
          onToggleSave={toggleSave}
          onBookInspection={(l) => {
            setDetailListing(null);
            setBookingListing(l);
          }}
          onStartChat={(agentId, listingId) => {
            setDetailListing(null);
            handleStartChatWithAgent(agentId, listingId);
          }}
          onReportListing={(l) => setReportListing(l)}
          relatedListings={listings.filter(l => l.id !== detailListing.id).slice(0, 3)}
          onSelectRelated={(l) => handleOpenListingDetail(l)}
          selectedCampus={selectedCampus}
          onListingUpdated={(updated) => {
            setListings(prev => prev.map(l => l.id === updated.id ? updated : l));
            setDetailListing(updated);
          }}
          isAgentView={currentRole === 'agent'}
        />
      )}

      {/* Inspection Booking Modal */}
      {bookingListing && (
        <BookInspectionModal
          listing={bookingListing}
          onClose={() => setBookingListing(null)}
          onSuccess={() => {
            setBookingListing(null);
            loadInspectionsData();
            setActiveView('student-dash');
          }}
        />
      )}

      {/* Report Listing Modal */}
      {reportListing && (
        <ReportListingModal
          listing={reportListing}
          onClose={() => setReportListing(null)}
        />
      )}

      {/* Add Listing Modal (Agent) */}
      {addModalOpen && (
        <AddListingModal
          universities={universities}
          onClose={() => setAddModalOpen(false)}
          onSuccess={(newListing) => {
            setAddModalOpen(false);
            loadListingsData();
          }}
          agentId={auth.currentUser?.uid || activeAccountId}
        />
      )}

      {/* Live Chat Drawer */}
      {activeConversation && (
        <ChatDrawer
          conversation={activeConversation}
          onClose={() => setActiveConversation(null)}
          currentRole={currentRole}
          currentUserId={auth.currentUser?.uid || activeAccountId}
        />
      )}

      {/* Real-Time Notification Center Drawer */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onClearAll={handleClearAllNotifications}
        onSelectNotification={handleSelectNotification}
        onTogglePin={handleTogglePinNotification}
      />

      {/* Incoming Push Notification Banner Toast */}
      <NotificationToast
        notification={activeToastNotification}
        onClose={() => setActiveToastNotification(null)}
        onClick={handleSelectNotification}
      />

      {/* Comprehensive Legal & Informational Center Modal */}
      <InfoPagesModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        defaultDocId={selectedInfoDocId}
        onNavigateToOnboarding={() => {
          setIsInfoModalOpen(false);
          setActiveView('onboarding');
        }}
      />

      {/* 5-Screen First-Time Feature Onboarding Showcase Modal */}
      <OnboardingShowcaseModal
        isOpen={showOnboardingShowcase}
        userName={accounts[0]?.name || auth.currentUser?.displayName || 'Student'}
        onClose={(startGuidedTour) => {
          setShowOnboardingShowcase(false);
          localStorage.setItem('dormiqa_has_seen_onboarding', 'true');
          if (startGuidedTour || !localStorage.getItem('dormiqa_guided_tour_completed')) {
            setActiveView('search');
            setShowGuidedTour(true);
          }
        }}
      />

      {/* Interactive Guided App Tour Overlay */}
      <AppGuidedTour
        isActive={showGuidedTour && activeView === 'search'}
        onComplete={() => {
          setShowGuidedTour(false);
          localStorage.setItem('dormiqa_guided_tour_completed', 'true');
          setToastNotice('Guided tour completed! Enjoy searching verified lodgings.');
          setTimeout(() => setToastNotice(null), 3000);
        }}
        onSkip={() => {
          setShowGuidedTour(false);
          localStorage.setItem('dormiqa_guided_tour_completed', 'true');
        }}
      />

    </div>
  );
}
