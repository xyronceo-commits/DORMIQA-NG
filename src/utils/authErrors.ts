/**
 * Shared Auth Error Mapper for Dormiqa Supabase Auth
 * Converts Supabase/network error codes and messages into user-friendly notices.
 */

export function mapAuthError(err: any): string {
  if (!err) return 'An unexpected error occurred. Please try again.';

  const code = String(err.code || err.error_code || '').toLowerCase();
  const msg = String(err.message || '').toLowerCase();

  if (
    code === 'user_already_exists' || 
    code === 'auth/email-already-in-use' ||
    msg.includes('user already registered') || 
    msg.includes('already exists')
  ) {
    return 'An account with this email already exists. Sign in instead.';
  }

  if (
    code === 'invalid_credentials' || 
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    msg.includes('invalid login credentials') || 
    msg.includes('invalid credentials')
  ) {
    return 'Incorrect email or password.';
  }

  if (
    code === 'email_not_confirmed' || 
    msg.includes('email not confirmed') || 
    msg.includes('not confirmed')
  ) {
    return 'Please confirm your email address before signing in.';
  }

  if (
    code === 'over_email_send_rate_limit' || 
    code === 'over_request_rate_limit' ||
    msg.includes('rate limit') || 
    msg.includes('too many emails') ||
    msg.includes('for security purposes')
  ) {
    return 'Too many emails sent. Please wait a few minutes and try again.';
  }

  if (
    code === 'weak_password' || 
    msg.includes('password should be at least') ||
    msg.includes('weak password')
  ) {
    return 'Password must be at least 6 characters long.';
  }

  if (
    code === 'email_address_invalid' || 
    code === 'validation_failed' ||
    msg.includes('invalid email')
  ) {
    return 'Please enter a valid email address.';
  }

  if (
    code === 'signup_disabled' || 
    msg.includes('signups are disabled')
  ) {
    return 'Sign ups are currently disabled.';
  }

  if (
    code === 'auth/network-request-failed' || 
    msg.includes('fetch failed') || 
    msg.includes('network') || 
    msg.includes('failed to fetch')
  ) {
    return 'Network request failed. Please check your internet connection.';
  }

  return err.message || 'An unexpected error occurred. Please try again.';
}
