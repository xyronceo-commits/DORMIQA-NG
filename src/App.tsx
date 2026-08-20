import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { 
  UserRole, 
  University, 
  Listing, 
  SearchFilters, 
  Inspection, 
  Conversation,
  User,
  AppNotification
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
import { StudentDashboard } from './components/StudentDashboard';
import { AgentDashboard } from './components/AgentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { InfoPagesModal } from './components/InfoPagesModal';
import { ComingSoonPage } from './components/ComingSoonPage';
import { ListingGridSkeleton, ListItemRowSkeleton, DashboardSkeleton, ChatDrawerSkeleton } from './components/SkeletonLoader';
import { checkAdminSession, clearAdminToken } from './services/api';
import { auth, saveUserToFirestore, logoutFirebase, fetchUserProfileFromFirestore, resendVerificationEmail } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [activeView, setActiveView] = useState<'landing' | 'onboarding' | 'business-verification' | 'search' | 'saved' | 'messages' | 'student-dash' | 'agent-dash' | 'admin-dash' | 'coming-soon'>('landing');
  const [selectedComingSoonUniId, setSelectedComingSoonUniId] = useState<string>('unilag');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    checkAdminSession().then(isAuth => {
      setIsAdminAuthenticated(isAuth);
      if (isAuth) {
        setCurrentRole('admin');
      }
    });
  }, []);

  const navigateView = (view: 'landing' | 'onboarding' | 'business-verification' | 'search' | 'saved' | 'messages' | 'student-dash' | 'agent-dash' | 'admin-dash' | 'coming-soon') => {
    setIs404Route(false);
    setRoutePropertyError(null);
    setRoutePropertyUnavailableReason(null);
    setDetailListing(null);

    if (view === 'admin-dash' && !isAdminAuthenticated) {
      setIsAdminLoginModalOpen(true);
      return;
    }
    if (!isLoggedIn && view !== 'landing' && view !== 'onboarding' && view !== 'business-verification' && view !== 'search' && view !== 'coming-soon') {
      setActiveView('onboarding');
      pushViewUrl('onboarding');
      setToastNotice('Please sign up or sign in to access verified accommodation.');
      setTimeout(() => setToastNotice(null), 4000);
      return;
    }
    if (isLoggedIn && view === 'onboarding') {
      // Existing logged-in user -> Do NOT show onboarding page, take straight to Explore page!
      setActiveView('search');
      pushViewUrl('search');
      const isVerified = auth.currentUser ? (auth.currentUser.emailVerified || auth.currentUser.providerData.some(p => p.providerId === 'google.com')) : true;
      if (!isVerified && auth.currentUser?.email) {
        setToastNotice(`Notice: Your email address (${auth.currentUser.email}) is not verified yet. Please check your inbox.`);
        setTimeout(() => setToastNotice(null), 5000);
      } else {
        setToastNotice('You are already signed in!');
        setTimeout(() => setToastNotice(null), 3000);
      }
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
        return;
      }

      try {
        await fbUser.reload();
      } catch (e) {
        // ignore reload errors
      }

      const uid = fbUser.uid;
      const email = fbUser.email?.toLowerCase() || '';

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
        universityName: profile?.universityName || '',
        agencyName: profile?.agencyName || '',
        isVerifiedAgent: profile?.isVerifiedAgent || false,
        isEmailVerified: isVerified,
        avatarUrl: profile?.avatarUrl || fbUser.photoURL || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        createdAt: profile?.createdAt || new Date().toISOString().split('T')[0]
      };

      setAccounts([userAccount]);
      setActiveAccountId(uid);
      setCurrentRole(userAccount.role);
      setIsLoggedIn(true);
      localStorage.setItem('dormiqa_is_logged_in', 'true');

      // Existing user auto-route: If authenticated user lands on onboarding page, skip straight to Explore ('search') page
      const initialRoute = parseRouteFromUrl();
      if (initialRoute.type === 'view' && initialRoute.view === 'onboarding') {
        setActiveView('search');
        pushViewUrl('search');
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

  const toggleSave = (listingId: string) => {
    setSavedIds(prev => 
      prev.includes(listingId) ? prev.filter(id => id !== listingId) : [...prev, listingId]
    );
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
      
      {/* Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={navigateView}
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
        onOpenAdminLoginModal={() => setIsAdminLoginModalOpen(true)}
        studentTab={studentTab}
        agentTab={agentTab}
        onReplayTour={() => {
          setActiveView('search');
          setShowGuidedTour(true);
        }}
        onReplayOnboarding={() => setShowOnboardingShowcase(true)}
      />

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
                featuredListings={listings.filter(l => l.featured).slice(0, 3)}
                recentListings={listings.slice(0, 6)}
                onSearchUniversity={handleSelectUniversity}
                onOpenListingDetail={(l) => handleOpenListingDetail(l)}
                onBookInspection={(l) => {
                  if (!isLoggedIn) {
                    setActiveView('onboarding');
                    setToastNotice('Please sign up or sign in to book an inspection.');
                    setTimeout(() => setToastNotice(null), 4000);
                  } else {
                    setBookingListing(l);
                  }
                }}
                onStartChat={(agentId, listingId) => handleStartChatWithAgent(agentId, listingId)}
                savedIds={savedIds}
                onToggleSave={(id) => {
                  if (!isLoggedIn) {
                    setActiveView('onboarding');
                    setToastNotice('Please sign up or sign in to save listings.');
                    setTimeout(() => setToastNotice(null), 4000);
                  } else {
                    toggleSave(id);
                  }
                }}
                onOpenAgentPortal={() => {
                  if (!isLoggedIn) {
                    setActiveView('onboarding');
                  } else {
                    setCurrentRole('agent');
                    setActiveView('agent-dash');
                  }
                }}
                onOpenOnboarding={() => setActiveView('onboarding')}
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

              if (!isSignup) {
                // RETURNING USER SIGN IN (Agent or Student) -> Directly to Explore (search) page, no onboarding page or modal
                setActiveView('search');
                pushViewUrl('search');
                setToastNotice(`Welcome back, ${newAccount.name}!`);
                setTimeout(() => setToastNotice(null), 4000);
              } else if (userData.role === 'agent') {
                // NEW AGENT SIGNUP
                setPendingAgentRegistration(newAccount);
                setActiveView('business-verification');
                pushViewUrl('business-verification');
                setShowOnboardingShowcase(true);
                setToastNotice(`Account registered! Redirecting to business verification...`);
                setTimeout(() => setToastNotice(null), 4000);
              } else {
                // NEW STUDENT SIGNUP
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

        {/* Business Verification Page for Agent Post-Signup */}
        {activeView === 'business-verification' && (
          <BusinessVerificationPage
            agentData={pendingAgentRegistration}
            onCompleteVerification={({ licenseNumber, avatarUrl }) => {
              if (pendingAgentRegistration?.id) {
                setAccounts(prev => prev.map(a => 
                  a.id === pendingAgentRegistration.id
                    ? { 
                        ...a, 
                        licenseNumber, 
                        isVerifiedAgent: true,
                        avatarUrl: avatarUrl || a.avatarUrl,
                        isAvatarLocked: true,
                        verificationPhotoUrl: avatarUrl || a.avatarUrl
                      }
                    : a
                ));
              }
              setToastNotice('Identity & Business verification submitted! Verified photo set as profile picture.');
              setTimeout(() => setToastNotice(null), 4000);
              setActiveView('agent-dash');
            }}
            onSkip={() => {
              setToastNotice('Verification skipped for now. You can verify anytime in settings.');
              setTimeout(() => setToastNotice(null), 4000);
              setActiveView('agent-dash');
            }}
          />
        )}

        {/* 2. Search & Discover Experience */}
        {activeView === 'search' && (
          <div className="flex flex-col min-h-[calc(100vh-4rem)]">
            <SearchAndFilterBar
              filters={filters}
              setFilters={setFilters}
              universities={universities}
              viewMode={viewMode}
              setViewMode={setViewMode}
              totalResults={displayListings.length}
              onSelectNonUniosun={(uniId) => handleSelectUniversity(uniId)}
            />

            {/* View Mode: Grid Cards vs Interactive Map */}
            {viewMode === 'grid' ? (
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 w-full space-y-4 sm:space-y-6">
                
                {/* Clean Uncluttered Results Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pb-2 border-b border-neutral-200/60 dark:border-neutral-800">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>Verified Accommodations</span>
                      <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full border border-neutral-200 dark:border-neutral-700">
                        {displayListings.length} {displayListings.length === 1 ? 'lodge' : 'lodges'} available
                      </span>
                    </h2>
                    <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Showing student housing near <span className="font-semibold text-neutral-800 dark:text-neutral-200">{selectedCampus ? selectedCampus.name : 'campus'}</span>
                    </p>
                  </div>
                </div>

                {isListingsLoading ? (
                  <ListingGridSkeleton count={6} />
                ) : displayListings.length === 0 ? (
                  <div className="text-center py-12 sm:py-16 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 max-w-md mx-auto space-y-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No properties match your current filter</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Try widening your maximum budget, campus distance radius, or clearing filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 lg:gap-8">
                    {displayListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        isSaved={savedIds.includes(listing.id)}
                        onToggleSave={toggleSave}
                        onOpenDetail={(l) => handleOpenListingDetail(l)}
                        onBookInspection={(l) => setBookingListing(l)}
                        onStartChat={(agentId, listingId) => handleStartChatWithAgent(agentId, listingId)}
                        selectedCampus={selectedCampus}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Map View (Split screen layout) */
              <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-10rem)] min-h-[600px]">
                {/* Left Listing Scroll list */}
                <div className="lg:col-span-5 overflow-y-auto space-y-3 pr-1">
                  {isListingsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <ListItemRowSkeleton key={i} />
                    ))
                  ) : (
                    displayListings.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => handleOpenListingDetail(l)}
                        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-slate-900 dark:hover:border-emerald-600 transition-all cursor-pointer flex gap-3 shadow-2xs"
                      >
                        <img src={l.photos[0]} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">{l.title}</h4>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white shrink-0 ml-1">₦{(l.pricePerYear || (l.pricePerWeek ? l.pricePerWeek * 52 : 300000)).toLocaleString()}/yr</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{l.address}</p>
                          <TravelModeBar
                            propertyId={l.id}
                            propertyLat={l.lat}
                            propertyLng={l.lng}
                            selectedCampus={selectedCampus}
                            compact={true}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Right Leaflet Map */}
                <div className="lg:col-span-7 h-full">
                  {selectedUni && (
                    <InteractiveMapView
                      listings={displayListings}
                      selectedUniversity={selectedUni}
                      selectedCampus={selectedCampus}
                      activeListingId={detailListing?.id || null}
                      onSelectListing={(l) => handleOpenListingDetail(l)}
                      onBookInspection={(l) => setBookingListing(l)}
                      savedIds={savedIds}
                      onToggleSave={toggleSave}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Saved Wishlist */}
        {activeView === 'saved' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <h1 className="text-2xl font-black text-slate-900">Saved Accommodation Wishlist</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isSaved={true}
                  onToggleSave={toggleSave}
                  onOpenDetail={(l) => handleOpenListingDetail(l)}
                  onBookInspection={(l) => setBookingListing(l)}
                  onStartChat={(agentId, listingId) => handleStartChatWithAgent(agentId, listingId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 4. Messages / Chats View */}
        {activeView === 'messages' && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
            <h1 className="text-2xl font-black text-slate-900">Agent Conversations</h1>
            <div className="bg-white rounded-3xl border border-neutral-200 divide-y overflow-hidden shadow-xs">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className="p-5 hover:bg-neutral-50 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <img src={currentRole === 'student' ? conv.agentAvatar : conv.studentAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        {currentRole === 'student' ? conv.agentName : conv.studentName}
                      </h3>
                      <p className="text-xs text-neutral-500 font-medium">{conv.listingTitle}</p>
                      <p className="text-xs text-neutral-700 italic mt-0.5 line-clamp-1">"{conv.lastMessage}"</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-semibold">{conv.lastMessageTime}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Student Dashboard */}
        {activeView === 'student-dash' && (
          <StudentDashboard
            savedListings={savedListings}
            inspections={inspections}
            conversations={conversations}
            allListings={listings}
            onOpenListing={(l) => handleOpenListingDetail(l)}
            onOpenChat={(conv) => setActiveConversation(conv)}
            onStartChat={(agentId, listingId) => handleStartChatWithAgent(agentId, listingId)}
            onRemoveSaved={toggleSave}
            activeTab={studentTab}
            onTabChange={setStudentTab}
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSignOut={handleSignOut}
            onDeleteAccount={handleDeleteAccount}
          />
        )}

        {/* 6. Agent Dashboard */}
        {activeView === 'agent-dash' && (
          <AgentDashboard
            listings={listings}
            inspections={inspections}
            conversations={conversations}
            onOpenAddModal={() => setAddModalOpen(true)}
            onOpenChat={(conv) => setActiveConversation(conv)}
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
        )}

        {/* 7. Admin Dashboard */}
        {activeView === 'admin-dash' && (
          <AdminDashboard
            onRefresh={loadListingsData}
            onAdminLogout={() => {
              setIsAdminAuthenticated(false);
              clearAdminToken();
              setCurrentRole('student');
              setActiveView('landing');
              setToastNotice('Admin session logged out.');
              setTimeout(() => setToastNotice(null), 3000);
            }}
          />
        )}
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

      {/* Discreet Secure Admin Access Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setCurrentRole('admin');
          setActiveView('admin-dash');
          setToastNotice('Authenticated successfully as Dormiqa Administrator.');
          setTimeout(() => setToastNotice(null), 3000);
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
