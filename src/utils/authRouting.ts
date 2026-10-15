/**
* DORMIQA Centralized Auth Routing & Flow State Machine
* Implements the exact mermaid flow and single decision function resolveDestination(state).
*/

export type SessionStatus = 'loading' | 'none' | 'expired' | 'valid';
export type UserRole = 'admin' | 'student' | 'agent' | null;

export interface AuthRoutingState {
  sessionStatus: SessionStatus;
  emailConfirmed: boolean;
  role: UserRole;
  isAdmin: boolean;
  profileComplete: boolean;
  businessVerified: boolean;
  onboardingSeen: boolean;
  roleLoadError: boolean;
  currentPath?: string;
  hasRecovery?: boolean;
  hasConfirm?: boolean;
  hasAuthError?: boolean;
}

export type DestinationRoute = 
  | 'splash'
  | 'reset-password'
  | 'auth-confirmed'
  | 'onboarding'
  | 'landing'
  | 'auth'
  | 'auth-verify'
  | 'role-error'
  | 'admin-dash'
  | 'complete-profile'
  | 'student-home'
  | 'business-verification'
  | 'agent-dashboard'
  | 'property-detail'
  | 'search'
  | 'saved'
  | 'messages'
  | 'student-dash'
  | 'agent-dash'
  | 'universities'
  | 'coming-soon';

/**
* Single pure function taking the current auth state and returning the correct destination route.
*/
export function resolveDestination(state: AuthRoutingState): DestinationRoute {
  // 1. Reset or confirm or error link in URL
  if (state.hasRecovery || state.currentPath?.includes('reset-password')) {
    return 'reset-password';
  }
  if (state.hasConfirm || state.currentPath?.includes('auth/confirmed') || state.currentPath?.includes('confirmed')) {
    return 'auth-confirmed';
  }

  // 2. While session is loading, show splash/skeleton
  if (state.sessionStatus === 'loading') {
    return 'splash';
  }

  // 3. Valid session check
  if (state.sessionStatus === 'none' || state.sessionStatus === 'expired') {
    if (!state.onboardingSeen) {
      return 'onboarding';
    }
    // If on auth or onboarding already, respect guest paths if requested, otherwise landing or onboarding
    if (state.currentPath?.startsWith('/auth') || state.currentPath === '/onboarding') {
      return state.currentPath === '/onboarding' ? 'onboarding' : 'landing';
    }
    return 'landing';
  }

  // 4. Session is valid
  // Email confirmed?
  if (!state.emailConfirmed) {
    return 'auth-verify';
  }

  // Role load error check
  if (state.roleLoadError) {
    return 'role-error';
  }

  // Role from backend
  if (state.isAdmin || state.role === 'admin') {
    return 'admin-dash';
  }

  if (state.role === 'student') {
    if (!state.profileComplete) {
      return 'complete-profile';
    }
    // If user requested a specific public/student subpath (like /search, /saved, /messages, /property/), allow if valid
    if (state.currentPath && ['/search', '/explore', '/discover', '/saved', '/messages', '/chats', '/universities', '/coming-soon'].some(p => state.currentPath?.startsWith(p))) {
      if (state.currentPath.includes('search') || state.currentPath.includes('explore') || state.currentPath.includes('discover')) return 'search';
      if (state.currentPath.includes('saved')) return 'saved';
      if (state.currentPath.includes('messages') || state.currentPath.includes('chats')) return 'messages';
      if (state.currentPath.includes('universities')) return 'universities';
      if (state.currentPath.includes('coming-soon')) return 'coming-soon';
    }
    return 'student-home';
  }

  if (state.role === 'agent') {
    if (!state.businessVerified) {
      return 'business-verification';
    }
    if (state.currentPath && (state.currentPath.startsWith('/agent') || state.currentPath.startsWith('/agent-dashboard'))) {
      return 'agent-dashboard';
    }
    return 'agent-dashboard';
  }

  // Fallback for valid session with unknown role -> student home or complete profile
  return 'student-home';
}
