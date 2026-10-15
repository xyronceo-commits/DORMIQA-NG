/**
 * Unit tests for resolveDestination covering every row of the outcome table and diagram branches.
 */
import { resolveDestination, AuthRoutingState } from './authRouting';

function assertEq(name: string, actual: any, expected: any) {
  if (actual !== expected) {
    throw new Error(`TEST FAILED [${name}]: expected ${expected}, got ${actual}`);
  }
  console.log(`PASS: ${name}`);
}

function runTests() {
  console.log('Running resolveDestination unit tests...');

  // 1. Reset link in URL
  assertEq(
    'Reset link',
    resolveDestination({ sessionStatus: 'none', emailConfirmed: false, role: null, isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: true, roleLoadError: false, hasRecovery: true }),
    'reset-password'
  );

  // 2. Confirm link in URL
  assertEq(
    'Confirm link',
    resolveDestination({ sessionStatus: 'none', emailConfirmed: false, role: null, isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: true, roleLoadError: false, hasConfirm: true }),
    'auth-confirmed'
  );

  // 3. Session loading
  assertEq(
    'Session loading -> splash',
    resolveDestination({ sessionStatus: 'loading', emailConfirmed: false, role: null, isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: false, roleLoadError: false }),
    'splash'
  );

  // 4. No session, onboarding not seen -> onboarding
  assertEq(
    'No session, onboarding not seen -> onboarding',
    resolveDestination({ sessionStatus: 'none', emailConfirmed: false, role: null, isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: false, roleLoadError: false }),
    'onboarding'
  );

  // 5. No session, onboarding seen -> landing
  assertEq(
    'No session, onboarding seen -> landing',
    resolveDestination({ sessionStatus: 'none', emailConfirmed: false, role: null, isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: true, roleLoadError: false }),
    'landing'
  );

  // 6. Expired session -> onboarding / landing
  assertEq(
    'Expired session, onboarding seen -> landing',
    resolveDestination({ sessionStatus: 'expired', emailConfirmed: false, role: null, isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: true, roleLoadError: false }),
    'landing'
  );

  // 7. Valid session, unconfirmed email -> auth-verify
  assertEq(
    'Valid session, unconfirmed email -> auth-verify',
    resolveDestination({ sessionStatus: 'valid', emailConfirmed: false, role: 'student', isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: true, roleLoadError: false }),
    'auth-verify'
  );

  // 8. Admin signs in -> admin-dash
  assertEq(
    'Admin signs in -> admin-dash',
    resolveDestination({ sessionStatus: 'valid', emailConfirmed: true, role: 'admin', isAdmin: true, profileComplete: true, businessVerified: true, onboardingSeen: true, roleLoadError: false }),
    'admin-dash'
  );

  // 9. Student signs up with email (profile complete) -> student-home
  assertEq(
    'Student profile complete -> student-home',
    resolveDestination({ sessionStatus: 'valid', emailConfirmed: true, role: 'student', isAdmin: false, profileComplete: true, businessVerified: false, onboardingSeen: true, roleLoadError: false }),
    'student-home'
  );

  // 10. Student signs in with Google, first time (profile incomplete) -> complete-profile
  assertEq(
    'Student profile incomplete -> complete-profile',
    resolveDestination({ sessionStatus: 'valid', emailConfirmed: true, role: 'student', isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: true, roleLoadError: false }),
    'complete-profile'
  );

  // 11. Agent verification not done -> business-verification
  assertEq(
    'Agent verification incomplete -> business-verification',
    resolveDestination({ sessionStatus: 'valid', emailConfirmed: true, role: 'agent', isAdmin: false, profileComplete: true, businessVerified: false, onboardingSeen: true, roleLoadError: false }),
    'business-verification'
  );

  // 12. Agent verification done -> agent-dashboard
  assertEq(
    'Agent verification complete -> agent-dashboard',
    resolveDestination({ sessionStatus: 'valid', emailConfirmed: true, role: 'agent', isAdmin: false, profileComplete: true, businessVerified: true, onboardingSeen: true, roleLoadError: false }),
    'agent-dashboard'
  );

  // 13. Role load error -> role-error
  assertEq(
    'Role load error -> role-error',
    resolveDestination({ sessionStatus: 'valid', emailConfirmed: true, role: null, isAdmin: false, profileComplete: false, businessVerified: false, onboardingSeen: true, roleLoadError: true }),
    'role-error'
  );

  console.log('ALL RESOLVE DESTINATION TESTS PASSED SUCCESSFULLY!');
}

runTests();
