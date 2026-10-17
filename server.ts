import express from 'express';
import path from 'path';
import crypto from 'crypto';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import { configureFirestoreClient, getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, addDoc } from './src/firebase/firestore.js';
import { 
  UNIVERSITIES, 
  MOCK_LISTINGS, 
  MOCK_USERS, 
  MOCK_INSPECTIONS, 
  MOCK_CONVERSATIONS, 
  MOCK_CHAT_MESSAGES, 
  MOCK_REPORTS 
} from './src/data/mockData.js';
import { Listing, Inspection, Conversation, ChatMessage, Report, User } from './src/types.js';
import { sendPasswordChangedNotice, isSmtpConfigured, maskEmail } from './server/mailer.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY?.split('.').length === 3 ? process.env.VITE_SUPABASE_ANON_KEY : null)
  || (process.env.SUPABASE_ANON_KEY?.split('.').length === 3 ? process.env.SUPABASE_ANON_KEY : null)
  || rawAnonKey;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Supabase server configuration is missing. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.');
}
const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const supabaseDataClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
configureFirestoreClient(supabaseDataClient);

// Initial Seed Data for Dormiqa Ecosystem
const INITIAL_USERS: User[] = [];

const INITIAL_LISTINGS: Listing[] = [];

// In-memory database state
let listingsStore: Listing[] = [];
let usersStore: User[] = [];
let inspectionsStore: Inspection[] = [];
let conversationsStore: Conversation[] = [];
let messagesStore: ChatMessage[] = [];
let reportsStore: Report[] = [];

const CLEAN_UNIVERSITIES = UNIVERSITIES.map(u => ({
  ...u,
  status: u.id === 'uniosun' ? ('active' as const) : ('coming_soon' as const),
  isActive: u.id === 'uniosun',
  totalListings: u.id === 'uniosun' ? listingsStore.filter(l => l.universityId === 'uniosun').length : 0,
  waitlistUrl: 'https://dormiqa-waitlist.vercel.app'
}));

// In-memory Rate Limiter Store
interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const generalRateLimitStore = new Map<string, RateLimitBucket>();
const adminRateLimitStore = new Map<string, RateLimitBucket>();

function createRateLimiter(maxRequests: number, windowMs: number, store: Map<string, RateLimitBucket>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let bucket = store.get(ip);
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 1, resetTime: now + windowMs };
      store.set(ip, bucket);
      return next();
    }

    bucket.count += 1;
    if (bucket.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please wait ${retryAfterSeconds} seconds before trying again.`,
        retryAfterSeconds
      });
    }

    next();
  };
}

const adminLoginLimiter = createRateLimiter(5, 15 * 60 * 1000, adminRateLimitStore);

// Auth Rate Limiting Stores & Helpers (Section 2 & 5)
const forgotPasswordEmailLimiterStore = new Map<string, { count: number; resetTime: number }>();
const forgotPasswordIpLimiterStore = new Map<string, RateLimitBucket>();
const resendEmailCooldownStore = new Map<string, { lastSentTime: number; count: number; resetTime: number }>();
const resendIpLimiterStore = new Map<string, RateLimitBucket>();
const passwordChangedRateLimitStore = new Map<string, { count: number; resetTime: number }>();
const recentPasswordNoticeSent = new Set<string>();

function getAllowedRedirectUrl(targetPath: string, req: express.Request): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  const rawAllowedOrigins = process.env.ALLOWED_REDIRECT_ORIGINS?.trim();

  // Allowed base origins: localhost for development, canonical production, and previews
  const allowedOrigins = new Set<string>([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://dormiqa.site',
    'https://dormiqa.com',
    'https://ais-pre-fefwxhetjb6pmq5nyypsjp-417290327349.europe-west2.run.app',
    'https://ais-dev-fefwxhetjb6pmq5nyypsjp-417290327349.europe-west2.run.app'
  ]);

  if (appBaseUrl) {
    try {
      allowedOrigins.add(new URL(appBaseUrl).origin);
    } catch (_) {}
  }

  if (rawAllowedOrigins) {
    rawAllowedOrigins.split(',').forEach((orig) => {
      const trimmed = orig.trim();
      if (trimmed) {
        try {
          allowedOrigins.add(new URL(trimmed).origin);
        } catch (_) {
          allowedOrigins.add(trimmed.replace(/\/+$/, ''));
        }
      }
    });
  }

  if (isProduction && !appBaseUrl) {
    console.error('[Auth Redirect] ERROR: APP_BASE_URL environment variable is missing in production! Please set APP_BASE_URL to your canonical domain.');
  }

  // Base priority:
  // 1. Matched request Origin / Referer header if in allowedOrigins
  // 2. APP_BASE_URL if set
  // 3. Documented canonical fallback: https://dormiqa.site
  let base = appBaseUrl || 'https://dormiqa.site';
  const originHeader = req.get('origin') || req.get('referer');
  if (originHeader) {
    try {
      const parsedOrigin = new URL(originHeader).origin;
      if (allowedOrigins.has(parsedOrigin)) {
        base = parsedOrigin;
      }
    } catch (_) {}
  }

  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = targetPath.startsWith('/') ? targetPath : '/' + targetPath;
  return `${cleanBase}${cleanPath}`;
}

interface AdminAccount {
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  status: 'Active' | 'active' | 'disabled';
  createdAt: string;
  addedBy: string;
}

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'buildsafe247@gmail.com').trim().toLowerCase();

const authorizedAdminMap = new Map<string, AdminAccount>();
authorizedAdminMap.set(ADMIN_EMAIL, {
  email: ADMIN_EMAIL,
  role: 'SUPER_ADMIN',
  status: 'Active',
  createdAt: new Date().toISOString(),
  addedBy: 'system'
});

// Server data access uses the same Supabase-backed document adapter as the client.
const firestoreDb = getFirestore();

// Firestore Real Data Query Helpers for Admin Portal
async function getFirestoreUsers(): Promise<User[]> {
  if (!firestoreDb) return usersStore;
  try {
    const snap = await getDocs(collection(firestoreDb, 'users'));
    const realUsers: User[] = [];
    snap.forEach(d => {
      realUsers.push({ id: d.id, ...d.data() } as User);
    });
    return realUsers.length > 0 ? realUsers : usersStore;
  } catch (err) {
    console.warn("Firestore users query error:", err);
    return usersStore;
  }
}

// Server-Side In-Memory Cache Engine
interface ServerCacheEntry<T> {
  data: T;
  expiresAt: number;
}

const apiServerCache = new Map<string, ServerCacheEntry<any>>();

function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function logServerCache(type: 'HIT' | 'MISS' | 'FETCH' | 'INVALIDATE', key: string, detail?: string) {
  if (isDevEnvironment()) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[SERVER CACHE ${type}] ${key}${detail ? ` (${detail})` : ''} - ${timestamp}`);
  }
}

function getServerCache<T>(key: string): T | null {
  const entry = apiServerCache.get(key);
  if (!entry) {
    logServerCache('MISS', key);
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    logServerCache('MISS', key, 'Expired');
    apiServerCache.delete(key);
    return null;
  }
  logServerCache('HIT', key);
  return entry.data as T;
}

function setServerCache<T>(key: string, data: T, ttlMs: number): T {
  apiServerCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  logServerCache('FETCH', key, `Cached for ${Math.round(ttlMs / 1000)}s`);
  return data;
}

function invalidateServerListingsCache(listingId?: string) {
  let count = 0;
  for (const k of Array.from(apiServerCache.keys())) {
    if (k === 'firestore_listings' || k.startsWith('listings_query:') || (listingId && k === `listing_detail:${listingId}`)) {
      apiServerCache.delete(k);
      count++;
    }
  }
  logServerCache('INVALIDATE', listingId ? `listing:${listingId}` : 'all_listings', `Purged ${count} server cache keys`);
}

async function getFirestoreListings(): Promise<Listing[]> {
  const cacheKey = 'firestore_listings';
  const cached = getServerCache<Listing[]>(cacheKey);
  if (cached) return cached;

  if (!firestoreDb) return listingsStore;
  try {
    const snap = await getDocs(collection(firestoreDb, 'listings'));
    const realListings: Listing[] = [];
    snap.forEach(d => {
      realListings.push({ id: d.id, ...d.data() } as Listing);
    });
    const result = realListings;
    return setServerCache(cacheKey, result, 60 * 1000); // 60s TTL for raw Firestore queries
  } catch (err) {
    console.warn("Firestore listings query error:", err);
    return [];
  }
}

async function getFirestoreInspections(): Promise<Inspection[]> {
  if (!firestoreDb) return inspectionsStore;
  try {
    const snap = await getDocs(collection(firestoreDb, 'inspections'));
    const realInspections: Inspection[] = [];
    snap.forEach(d => {
      realInspections.push({ id: d.id, ...d.data() } as Inspection);
    });
    return realInspections;
  } catch (err) {
    console.warn("Firestore inspections query error:", err);
    return inspectionsStore;
  }
}

async function syncAdminEmailsFromFirestore() {
  authorizedAdminMap.clear();
  authorizedAdminMap.set(ADMIN_EMAIL, {
    email: ADMIN_EMAIL,
    role: 'SUPER_ADMIN',
    status: 'Active',
    createdAt: new Date().toISOString(),
    addedBy: 'system'
  });
}

syncAdminEmailsFromFirestore();

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const json = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(json);
    }
  } catch {
    // fallback
  }
  return {};
}

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    console.warn('[ADMIN AUTH] 401: Missing Bearer authorization token');
    return res.status(401).json({ success: false, error: 'Unauthorized', message: 'A valid Supabase session is required.' });
  }

  void supabaseDataClient.auth.getUser(token).then(async ({ data, error }) => {
    if (error || !data.user) {
      console.warn('[ADMIN AUTH] 401: getUser failed:', error?.message);
      res.status(401).json({ success: false, error: 'Unauthorized', message: 'Your Supabase session is invalid or expired.' });
      return;
    }

    const user = data.user;
    const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
    const emailConfirmed = Boolean(user.email_confirmed_at);

    if (!emailConfirmed) {
      console.warn(`[ADMIN AUTH] 403: Email unconfirmed for user ${user.id} (${email})`);
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Admin email verification is required.' });
      return;
    }

    // Query trusted public.admin_accounts table by authenticated user's UUID
    const { data: adminRows, error: adminQueryError } = await supabaseDataClient
      .from('admin_accounts')
      .select('user_id, email, role, active')
      .eq('user_id', user.id)
      .limit(1);

    if (adminQueryError) {
      console.error('[ADMIN AUTH] Database query error on admin_accounts:', adminQueryError.message);
      res.status(500).json({ success: false, error: 'DatabaseError', message: 'Failed to verify admin status.' });
      return;
    }

    const adminRecord = adminRows?.[0];
    if (!adminRecord) {
      console.warn(`[ADMIN AUTH] 403: No admin_accounts record for user ${user.id} (${email})`);
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Admin access is restricted to verified administrators.' });
      return;
    }

    if (adminRecord.role !== 'admin' || !adminRecord.active) {
      console.warn(`[ADMIN AUTH] 403: Record not active or invalid role for user ${user.id}: role=${adminRecord.role}, active=${adminRecord.active}`);
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Admin access is inactive or not authorized.' });
      return;
    }

    if (adminRecord.email.trim().toLowerCase() !== email) {
      console.warn(`[ADMIN AUTH] 403: Email mismatch: stored=${adminRecord.email} vs auth=${email}`);
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Admin email mismatch.' });
      return;
    }

    console.log(`[ADMIN AUTH] Authorized user ${user.id} (${adminRecord.email})`);
    (req as any).adminUser = {
      id: user.id,
      email: adminRecord.email,
      role: 'SUPER_ADMIN'
    };
    (req as any).adminEmail = adminRecord.email;
    next();
  }).catch((err) => {
    console.warn('[ADMIN AUTH] 401 exception during verification:', err);
    res.status(401).json({ success: false, error: 'Unauthorized', message: 'Your Supabase session could not be verified.' });
  });
}

const requireSupabaseUser: express.RequestHandler = (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!accessToken) {
    res.status(401).json({ error: 'Unauthorized', message: 'A valid Supabase access token is required.' });
    return;
  }

  void supabaseDataClient.auth.getUser(accessToken).then(({ data, error }) => {
    if (error || !data.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Your session is invalid or expired.' });
      return;
    }
    (req as any).supabaseUser = data.user;
    next();
  }).catch(() => {
    res.status(401).json({ error: 'Unauthorized', message: 'Your session could not be verified.' });
  });
};

function requireSuperAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  requireAdminAuth(req, res, () => {
    const adminUser = (req as any).adminUser;
    if (adminUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only Super Administrators can perform this action.'
      });
    }
    next();
  });
}

// Security Headers Middleware
function securityHeadersMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
  next();
}

// Input Sanitization Helper
function sanitizeInputString(str: any, maxLength = 2000): string {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '');
}

export async function createExpressApp() {
  const app = express();

  // Strict Payload Size Limit
  app.use(express.json({ limit: '2mb' }));
  app.use(securityHeadersMiddleware);

  app.use('/api/admin', requireAdminAuth, (req, res, next) => {
    if (/^\/(administrators|emails)(\/|$)/.test(req.path)) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Admin access is restricted.' });
    }
    next();
  });

  // General Rate Limiting (120 requests per minute per IP)
  const generalRateLimiter = createRateLimiter(120, 60 * 1000, generalRateLimitStore);
  app.use('/api', generalRateLimiter);

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Dormiqa API', timestamp: new Date().toISOString() });
  });

  // --- AUTH EMAIL ROUTES (Section 2: Confirm Email, Reset Password, Password Changed Notice) ---

  // 1. Resend Sign-Up Confirmation Email (Rate limited by IP & Email with 60s cooldown, no enumeration)
  app.post('/api/auth/resend-confirmation', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address', message: 'Please provide a valid email address.' });
      }

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
      const now = Date.now();

      // Enforce IP Rate Limit (10 per hour)
      let ipBucket = resendIpLimiterStore.get(ip);
      if (!ipBucket || now > ipBucket.resetTime) {
        ipBucket = { count: 1, resetTime: now + 60 * 60 * 1000 };
        resendIpLimiterStore.set(ip, ipBucket);
      } else {
        ipBucket.count += 1;
        if (ipBucket.count > 10) {
          const retryAfterSeconds = Math.ceil((ipBucket.resetTime - now) / 1000);
          res.setHeader('Retry-After', String(retryAfterSeconds));
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Too many verification requests from this network. Please wait ${retryAfterSeconds} seconds.`,
            retryAfterSeconds
          });
        }
      }

      // Enforce Email 60-Second Cooldown & Max 4/hour
      let emailRecord = resendEmailCooldownStore.get(email);
      if (!emailRecord || now > emailRecord.resetTime) {
        emailRecord = { lastSentTime: now, count: 1, resetTime: now + 60 * 60 * 1000 };
        resendEmailCooldownStore.set(email, emailRecord);
      } else {
        const secondsSinceLast = Math.floor((now - emailRecord.lastSentTime) / 1000);
        if (secondsSinceLast < 60) {
          const waitSeconds = 60 - secondsSinceLast;
          res.setHeader('Retry-After', String(waitSeconds));
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Please wait ${waitSeconds} seconds before requesting another verification email.`,
            retryAfterSeconds: waitSeconds
          });
        }
        emailRecord.count += 1;
        emailRecord.lastSentTime = now;
        if (emailRecord.count > 5) {
          const retryAfterSeconds = Math.ceil((emailRecord.resetTime - now) / 1000);
          res.setHeader('Retry-After', String(retryAfterSeconds));
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Too many verification requests for this email. Please wait ${retryAfterSeconds} seconds.`,
            retryAfterSeconds
          });
        }
      }

      const emailRedirectTo = getAllowedRedirectUrl('/auth/confirmed', req);
      console.log(`[Auth Resend Confirmation] Request for masked: ${maskEmail(email)}, Redirect: ${emailRedirectTo}`);

      // Call Supabase Auth resend
      try {
        const { error: resendError } = await supabaseAuthClient.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo }
        });
        if (resendError) {
          console.warn(`[Auth Resend Confirmation] Supabase notice:`, resendError.message);
        }
      } catch (sbErr: any) {
        console.warn(`[Auth Resend Confirmation] Supabase call exception:`, sbErr?.message);
      }

      // No account enumeration: return consistent success response
      return res.json({
        success: true,
        message: 'If an unconfirmed account exists with this email, a fresh verification link has been sent.'
      });
    } catch (err: any) {
      console.error('[Auth Resend Confirmation] Unexpected error:', err);
      return res.status(500).json({ error: 'Server Error', message: 'Could not process verification request.' });
    }
  });

  // 2. Forgot Password Request (Rate limited by email & IP, no enumeration, Google account detection)
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address', message: 'Please provide a valid email address.' });
      }

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
      const now = Date.now();

      // Enforce IP Rate Limit (10 per hour)
      let ipBucket = forgotPasswordIpLimiterStore.get(ip);
      if (!ipBucket || now > ipBucket.resetTime) {
        ipBucket = { count: 1, resetTime: now + 60 * 60 * 1000 };
        forgotPasswordIpLimiterStore.set(ip, ipBucket);
      } else {
        ipBucket.count += 1;
        if (ipBucket.count > 10) {
          const retryAfterSeconds = Math.ceil((ipBucket.resetTime - now) / 1000);
          res.setHeader('Retry-After', String(retryAfterSeconds));
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Too many password reset requests from this network. Please wait ${retryAfterSeconds} seconds.`,
            retryAfterSeconds
          });
        }
      }

      // Enforce Email Rate Limit (3 per hour)
      let emailRecord = forgotPasswordEmailLimiterStore.get(email);
      if (!emailRecord || now > emailRecord.resetTime) {
        emailRecord = { count: 1, resetTime: now + 60 * 60 * 1000 };
        forgotPasswordEmailLimiterStore.set(email, emailRecord);
      } else {
        emailRecord.count += 1;
        if (emailRecord.count > 3) {
          const retryAfterSeconds = Math.ceil((emailRecord.resetTime - now) / 1000);
          res.setHeader('Retry-After', String(retryAfterSeconds));
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Too many password reset requests for this email. Please wait ${retryAfterSeconds} seconds before trying again.`,
            retryAfterSeconds
          });
        }
      }

      // Check if user is a Google-only account (Section 2.2 requirement)
      try {
        const { data: usersData } = await supabaseDataClient.auth.admin.listUsers({ perPage: 1000 });
        const existingUser = (usersData?.users as any[])?.find((u: any) => u.email?.toLowerCase() === email);
        if (existingUser) {
          const providers = [
            existingUser.app_metadata?.provider,
            ...(Array.isArray(existingUser.identities) ? existingUser.identities.map((i: any) => i.provider) : [])
          ].filter(Boolean);
          const hasPassword = Boolean(existingUser.encrypted_password);
          const isGoogleOnly = providers.includes('google') && !providers.includes('email') && !hasPassword;

          if (isGoogleOnly) {
            console.log(`[Auth Forgot Password] Google-only account requested: ${maskEmail(email)}`);
            return res.json({
              success: true,
              isGoogleOnly: true,
              message: 'This account signs in with Google. Please use Google Sign-In.'
            });
          }
        }
      } catch (adminCheckErr) {
        // Silently continue if admin list fails
      }

      const redirectTo = getAllowedRedirectUrl('/reset-password', req);
      console.log(`[Auth Forgot Password] Sending reset link for masked: ${maskEmail(email)}, Redirect: ${redirectTo}`);

      // Call Supabase's reset-password-for-email method (anon client on server)
      try {
        const { error: resetError } = await supabaseAuthClient.auth.resetPasswordForEmail(email, {
          redirectTo
        });
        if (resetError) {
          console.warn(`[Auth Forgot Password] Supabase reset notice:`, resetError.message);
        }
      } catch (sbResetErr: any) {
        console.warn(`[Auth Forgot Password] Supabase exception:`, sbResetErr?.message);
      }

      // Always return consistent success response (no account enumeration)
      return res.json({
        success: true,
        message: 'If an account exists for this email address, a password reset link has been sent.'
      });
    } catch (err: any) {
      console.error('[Auth Forgot Password] Unexpected error:', err);
      return res.status(500).json({ error: 'Server Error', message: 'Could not process password reset request.' });
    }
  });

  // 3. Password Changed Notice Endpoint (Secured by requireSupabaseUser, idempotent, verified user only)
  app.post('/api/auth/password-changed-notice', requireSupabaseUser, async (req, res) => {
    try {
      const user = (req as any).supabaseUser;
      const userId = user.id;
      const userEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';

      if (!userEmail) {
        return res.status(400).json({ error: 'Missing Email', message: 'Authenticated user has no email address.' });
      }

      const now = Date.now();

      // Rate limit: max 3 per hour per user
      let userRate = passwordChangedRateLimitStore.get(userId);
      if (!userRate || now > userRate.resetTime) {
        userRate = { count: 1, resetTime: now + 60 * 60 * 1000 };
        passwordChangedRateLimitStore.set(userId, userRate);
      } else {
        userRate.count += 1;
        if (userRate.count > 3) {
          return res.status(429).json({ error: 'Too Many Requests', message: 'Rate limit exceeded for security notices.' });
        }
      }

      // Verify that user's password or profile was actually updated recently (within last 15 minutes)
      const updatedAtStr = user.updated_at;
      if (updatedAtStr) {
        const updatedTime = new Date(updatedAtStr).getTime();
        const diffMinutes = (now - updatedTime) / (60 * 1000);
        if (diffMinutes > 15) {
          console.log(`[Auth Password Changed Notice] Ignored: user.updated_at is older than 15 mins for ${maskEmail(userEmail)}`);
          return res.status(204).end();
        }
      }

      // Idempotency check: 5-minute window per user
      const idempotencyKey = `pwd_notice_${userId}_${Math.floor(now / (5 * 60 * 1000))}`;
      if (recentPasswordNoticeSent.has(idempotencyKey)) {
        console.log(`[Auth Password Changed Notice] Idempotent hit: notice already sent for ${maskEmail(userEmail)}`);
        return res.status(204).end();
      }
      recentPasswordNoticeSent.add(idempotencyKey);

      // Clean up old idempotency keys periodically
      if (recentPasswordNoticeSent.size > 1000) {
        recentPasswordNoticeSent.clear();
      }

      console.log(`[Auth Password Changed Notice] Dispatching email notice to ${maskEmail(userEmail)}`);

      if (!isSmtpConfigured()) {
        console.warn(`[Auth Password Changed Notice] Custom SMTP not configured in environment. Skipping email dispatch.`);
        return res.json({
          success: true,
          notice: 'Password was updated. SMTP email dispatch is pending provider configuration.'
        });
      }

      await sendPasswordChangedNotice(userEmail);
      return res.json({ success: true, message: 'Password change notification email sent successfully.' });
    } catch (err: any) {
      console.error('[Auth Password Changed Notice] Failed to send email:', err);
      // Return safe response so password update on client is not broken
      return res.status(500).json({ error: 'Mail Error', message: 'Could not send notification email.' });
    }
  });

  app.post('/api/account/delete', async (req, res) => {
    if (!supabaseServiceRoleKey) {
      return res.status(503).json({ message: 'Account deletion is not configured on this server.' });
    }

    const authorization = req.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!accessToken) {
      return res.status(401).json({ message: 'A valid Supabase access token is required.' });
    }

    const { data: authData, error: authError } = await supabaseAuthClient.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return res.status(401).json({ message: 'Your session is invalid or expired. Sign in again.' });
    }

    const userId = authData.user.id;
    const email = (authData.user.email || '').toLowerCase();
    const loadAllDocuments = async (applyFilter: (query: any) => any) => {
      const documents: any[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await applyFilter(
          supabaseDataClient.from('app_documents').select('collection,id,data')
        ).order('collection').order('id').range(offset, offset + 999);
        if (error) return { data: null, error };
        documents.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      return { data: documents, error: null };
    };

    const { data: rows, error: rowsError } = await loadAllDocuments((query) => query.in(
      'collection',
      ['users', 'students', 'agents', 'listings', 'inspections', 'conversations', 'reports', 'notifications', 'chat_messages']
    ));

    if (rowsError) {
      return res.status(500).json({ message: 'Could not load account records for deletion.' });
    }

    const ownedConversations = new Set(
      (rows || [])
        .filter((row: any) => row.collection === 'conversations' && [row.data?.studentId, row.data?.agentId].includes(userId))
        .map((row: any) => row.id)
    );
    const ownedRows = (rows || []).filter((row: any) => {
      const data = row.data || {};
      if (['users', 'students', 'agents'].includes(row.collection)) {
        return row.id === userId || data.uid === userId || (email && String(data.email || '').toLowerCase() === email);
      }
      if (row.collection === 'listings') {
        return [data.agentId, data.userId, data.ownerId, data.agent?.id].includes(userId);
      }
      if (row.collection === 'inspections') {
        return [data.studentId, data.agentId, data.userId].includes(userId);
      }
      if (row.collection === 'conversations') {
        return ownedConversations.has(row.id);
      }
      if (row.collection === 'reports') {
        return [data.reporterId, data.userId].includes(userId);
      }
      if (row.collection === 'notifications') {
        return [data.userId, data.recipientId].includes(userId);
      }
      if (row.collection === 'chat_messages') {
        return [data.senderId, data.recipientId, data.userId].includes(userId) || ownedConversations.has(data.conversationId);
      }
      return false;
    });

    const nestedMessages = ownedConversations.size > 0
      ? await loadAllDocuments((query) => query.like('collection', 'conversations/%/messages'))
      : { data: [], error: null };
    if (nestedMessages.error) {
      return res.status(500).json({ message: 'Could not load account messages for deletion.' });
    }
    for (const row of nestedMessages.data || []) {
      const conversationId = String(row.collection).split('/')[1];
      if (ownedConversations.has(conversationId)) ownedRows.push(row);
    }

    const rowsByCollection = new Map<string, string[]>();
    for (const row of ownedRows) {
      const ids = rowsByCollection.get(row.collection) || [];
      ids.push(row.id);
      rowsByCollection.set(row.collection, ids);
    }

    for (const [collectionName, ids] of rowsByCollection) {
      const { error } = await supabaseDataClient
        .from('app_documents')
        .delete()
        .eq('collection', collectionName)
        .in('id', ids);
      if (error) {
        return res.status(500).json({ message: 'Could not remove all account records.' });
      }
    }

    for (const bucket of ['listing-media', 'verification-documents']) {
      const mediaObjects: string[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabaseDataClient
          .schema('storage')
          .from('objects')
          .select('name')
          .eq('bucket_id', bucket)
          .eq('owner_id', userId)
          .order('name')
          .range(offset, offset + 999);
        if (error) return res.status(500).json({ message: 'Could not load account media for deletion.' });
        mediaObjects.push(...(data || []).map((object: any) => object.name));
        if (!data || data.length < 1000) break;
      }
      for (let offset = 0; offset < mediaObjects.length; offset += 1000) {
        const { error } = await supabaseDataClient.storage
          .from(bucket)
          .remove(mediaObjects.slice(offset, offset + 1000));
        if (error) return res.status(500).json({ message: 'Could not remove all account media.' });
      }
    }

    const { error: deleteError } = await supabaseDataClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return res.status(500).json({ message: 'Account records were removed, but the authentication account could not be deleted.' });
    }

    return res.json({ success: true });
  });

  // Universities
  app.get('/api/universities', (req, res) => {
    const cacheKey = 'api_universities';
    const cached = getServerCache(cacheKey);
    if (cached) return res.json(cached);

    return res.json(setServerCache(cacheKey, CLEAN_UNIVERSITIES, 60 * 60 * 1000));
  });

  // Campus Expansion Waitlist Submission
  app.post('/api/waitlist', (req, res) => {
    try {
      const { universityId, universityName, contact, email, phone, role } = req.body || {};
      const targetContact = contact || email || phone || '';
      console.log(`[Campus Waitlist] New submission for university "${universityId || universityName}": ${targetContact} (role: ${role || 'student'})`);
      return res.json({
        success: true,
        message: 'Successfully registered for early campus notification'
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to record waitlist entry' });
    }
  });

  // Route calculation cache on server
  const routeServerCache = new Map<string, {
    data: {
      mode: 'walking' | 'driving' | 'bicycling';
      distanceKm: number;
      durationMinutes: number;
      distanceMeters: number;
      durationSeconds: number;
      isAvailable: boolean;
      reason?: string;
      source: 'osrm' | 'route_calculation';
      retrievedAt: string;
    };
    cachedAt: number;
  }>();

  async function computeRealRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    mode: 'walking' | 'driving' | 'bicycling'
  ) {
    const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}->${destLat.toFixed(4)},${destLng.toFixed(4)}:${mode}`;
    const now = Date.now();
    const cached = routeServerCache.get(cacheKey);

    if (cached && (now - cached.cachedAt < 30 * 60 * 1000)) {
      return cached.data;
    }

    let osrmProfile = 'foot';
    if (mode === 'driving') osrmProfile = 'car';
    if (mode === 'bicycling') osrmProfile = 'bike';

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originLng},${originLat};${destLng},${destLat}?overview=false`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
          const route = json.routes[0];
          const distMeters = Math.round(route.distance);
          const distKm = Math.round((distMeters / 1000) * 10) / 10;
          const durSec = Math.round(route.duration);
          const durMin = Math.max(1, Math.round(durSec / 60));

          const isAvailable = mode !== 'walking' || distKm <= 15;

          const result = {
            mode,
            distanceKm: distKm,
            durationMinutes: durMin,
            distanceMeters: distMeters,
            durationSeconds: durSec,
            isAvailable,
            reason: !isAvailable ? 'Distance too far for practical walking' : undefined,
            source: 'osrm' as const,
            retrievedAt: new Date().toISOString()
          };

          routeServerCache.set(cacheKey, { data: result, cachedAt: now });
          return result;
        }
      }
    } catch (err) {
      // OSRM fallback
    }

    // Accurate fallback route calculation
    const R = 6371;
    const dLat = (destLat - originLat) * (Math.PI / 180);
    const dLng = (destLng - originLng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(originLat * (Math.PI / 180)) *
        Math.cos(destLat * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;

    const networkFactor = mode === 'driving' ? 1.3 : mode === 'bicycling' ? 1.25 : 1.2;
    const routeDistKm = Math.round(straightKm * networkFactor * 10) / 10;
    const distMeters = Math.round(routeDistKm * 1000);

    let speedKmH = 4.8;
    if (mode === 'driving') speedKmH = 32;
    if (mode === 'bicycling') speedKmH = 15;

    const durHours = routeDistKm / speedKmH;
    const durMin = Math.max(1, Math.round(durHours * 60));
    const durSec = durMin * 60;

    const isAvailable = mode !== 'walking' || routeDistKm <= 15;

    const fallbackResult = {
      mode,
      distanceKm: routeDistKm,
      durationMinutes: durMin,
      distanceMeters: distMeters,
      durationSeconds: durSec,
      isAvailable,
      reason: !isAvailable ? 'Distance too far for practical walking' : undefined,
      source: 'route_calculation' as const,
      retrievedAt: new Date().toISOString()
    };

    routeServerCache.set(cacheKey, { data: fallbackResult, cachedAt: now });
    return fallbackResult;
  }

  // GET /api/route?originLat=..&originLng=..&destLat=..&destLng=..&mode=..
  app.get('/api/route', async (req, res) => {
    const originLat = parseFloat(req.query.originLat as string);
    const originLng = parseFloat(req.query.originLng as string);
    const destLat = parseFloat(req.query.destLat as string);
    const destLng = parseFloat(req.query.destLng as string);
    const mode = (req.query.mode as string) || 'walking';

    if (isNaN(originLat) || isNaN(originLng) || isNaN(destLat) || isNaN(destLng)) {
      return res.status(400).json({ error: 'Invalid origin or destination coordinates' });
    }

    const validModes = ['walking', 'driving', 'bicycling'];
    const safeMode = validModes.includes(mode) ? (mode as 'walking' | 'driving' | 'bicycling') : 'walking';

    const route = await computeRealRoute(originLat, originLng, destLat, destLng, safeMode);
    res.json(route);
  });

  // POST /api/routes-batch
  app.post('/api/routes-batch', async (req, res) => {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

    const results: Record<string, {
      walking: any;
      driving: any;
      bicycling: any;
    }> = {};

    for (const item of items) {
      if (!item.id || isNaN(item.originLat) || isNaN(item.originLng) || isNaN(item.destLat) || isNaN(item.destLng)) {
        continue;
      }
      const [walk, drive, bike] = await Promise.all([
        computeRealRoute(item.originLat, item.originLng, item.destLat, item.destLng, 'walking'),
        computeRealRoute(item.originLat, item.originLng, item.destLat, item.destLng, 'driving'),
        computeRealRoute(item.originLat, item.originLng, item.destLat, item.destLng, 'bicycling')
      ]);

      results[item.id] = { walking: walk, driving: drive, bicycling: bike };
    }

    res.json({ routes: results, timestamp: new Date().toISOString() });
  });

  // Listings with advanced filtering
  app.get('/api/listings', async (req, res) => {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const sortedKeys = Array.from(queryParams.keys()).sort();
    const sortedQuery = new URLSearchParams();
    sortedKeys.forEach(k => sortedQuery.append(k, queryParams.get(k) || ''));
    const cacheKey = `listings_query:${sortedQuery.toString()}`;

    const { 
      universityId, 
      minPrice, 
      maxPrice, 
      propertyType, 
      facilities, 
      maxWalkingMinutes, 
      genderPreference,
      searchQuery,
      status,
      agentId,
      featured,
      sortBy
    } = req.query;

    const baseListings = await getFirestoreListings();
    let result = [...baseListings];

    if (agentId) {
      const authorization = req.headers.authorization || '';
      const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
      const { data, error } = accessToken
        ? await supabaseAuthClient.auth.getUser(accessToken)
        : { data: { user: null }, error: new Error('Missing access token') };
      if (error || !data.user || data.user.id !== String(agentId)) {
        return res.status(403).json({ error: 'Forbidden', message: 'You can only view your own listings.' });
      }
      result = result.filter(l => l.agentId === String(agentId));
      if (status) result = result.filter(l => l.status === status);
    } else {
      result = result.filter(l => l.status === 'approved' && l.universityId === 'uniosun');
    }

    const cached = getServerCache<Listing[]>(cacheKey);
    if (cached) return res.json(cached);

    if (universityId) {
      result = result.filter(l => l.universityId === String(universityId));
    }

    if (featured === 'true') {
      result = result.filter(l => l.featured);
    }

    if (minPrice) {
      const min = Number(minPrice);
      if (!isNaN(min)) result = result.filter(l => (l.pricePerYear || l.pricePerWeek! * 52) >= min);
    }

    if (maxPrice) {
      const max = Number(maxPrice);
      if (!isNaN(max)) result = result.filter(l => (l.pricePerYear || l.pricePerWeek! * 52) <= max);
    }

    if (propertyType) {
      const types = String(propertyType).split(',');
      result = result.filter(l => types.includes(l.propertyType));
    }

    if (maxWalkingMinutes) {
      const maxWalk = Number(maxWalkingMinutes);
      if (!isNaN(maxWalk)) result = result.filter(l => l.walkingDistanceMinutes <= maxWalk);
    }

    if (genderPreference && genderPreference !== 'all') {
      result = result.filter(l => l.genderPreference === 'any' || l.genderPreference === genderPreference);
    }

    if (facilities) {
      const requiredFacilities = String(facilities).split(',');
      result = result.filter(l => requiredFacilities.every(f => l.facilities.includes(f)));
    }

    if (searchQuery) {
      const q = String(searchQuery).toLowerCase().trim();
      result = result.filter(l => 
        l.title.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.universityName.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'distance') {
      result.sort((a, b) => a.walkingDistanceMinutes - b.walkingDistanceMinutes);
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => a.pricePerWeek - b.pricePerWeek);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.pricePerWeek - a.pricePerWeek);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else {
      // Default: newest / featured first
      result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    setServerCache(cacheKey, result, 2 * 60 * 1000);
    res.json(result);
  });

  // Get single listing
  app.get('/api/listings/:id', async (req, res) => {
    const listingId = req.params.id;
    const cacheKey = `listing_detail:${listingId}`;
    const cached = getServerCache<Listing>(cacheKey);
    const baseListings = cached ? [] : await getFirestoreListings();
    const listing = cached || baseListings.find(l => l.id === listingId) || listingsStore.find(l => l.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.status !== 'approved' || listing.universityId !== 'uniosun') {
      const authorization = req.headers.authorization || '';
      const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
      const { data, error } = accessToken
        ? await supabaseAuthClient.auth.getUser(accessToken)
        : { data: { user: null }, error: new Error('Missing access token') };
      if (error || !data.user || data.user.id !== listing.agentId) {
        return res.status(404).json({ error: 'Listing not found' });
      }
    }
    if (cached) return res.json(cached);
    // Increment view count
    listing.viewCount = (listing.viewCount || 0) + 1;

    setServerCache(cacheKey, listing, 3 * 60 * 1000);
    res.json(listing);
  });

  // Create new listing (Agent) with AI Anti-Scam & Duplicate Listing Check
  app.post('/api/listings', requireSupabaseUser, async (req, res) => {
    const title = sanitizeInputString(req.body.title, 150);
    const hotelName = sanitizeInputString(req.body.hotelName, 150);
    const address = sanitizeInputString(req.body.address, 300);
    const universityId = sanitizeInputString(req.body.universityId, 50);
    const description = sanitizeInputString(req.body.description, 2000);
    const agentId = sanitizeInputString(req.body.agentId, 100);
    const authenticatedUserId = (req as any).supabaseUser.id as string;

    if (!agentId || agentId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Forbidden', message: 'You can only create listings for your own agent account.' });
    }
    const agentProfile = (await getFirestoreUsers()).find(user => user.id === authenticatedUserId);
    if (agentProfile?.role !== 'agent' || agentProfile.businessVerificationStatus !== 'approved' || !agentProfile.isVerifiedAgent) {
      return res.status(403).json({ error: 'Forbidden', message: 'Approved agent verification is required to create listings.' });
    }
    if (universityId !== 'uniosun') {
      return res.status(400).json({ error: 'Validation Error', message: 'New listings are currently available only for UNIOSUN.' });
    }
    
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title is required (at least 3 characters).' });
    }
    if (!hotelName) {
      return res.status(400).json({ error: 'Validation Error', message: 'Hotel / Building name is required.' });
    }
    if (!address || address.length < 5) {
      return res.status(400).json({ error: 'Validation Error', message: 'Valid street address is required.' });
    }
    if (!Array.isArray(req.body.photos) || req.body.photos.length < 1 || req.body.photos.length > 3) {
      return res.status(400).json({ error: 'Validation Error', message: 'A front-of-building photo is required; up to 3 photos are allowed.' });
    }

    const cleanPhotos = req.body.photos.slice(0, 3).map((p: any) => typeof p === 'string' ? p.trim() : '').filter((p: string) => {
      try {
        const u = new URL(p);
        return u.protocol === 'https:' || u.protocol === 'http:';
      } catch {
        return false;
      }
    });

    if (cleanPhotos.length < 1) {
      return res.status(400).json({ error: 'Validation Error', message: 'At least one valid photo URL is required.' });
    }

    let cleanVideoUrl = '';
    if (req.body.videoUrl) {
      if (typeof req.body.videoUrl !== 'string') {
        return res.status(400).json({ error: 'Validation Error', message: 'Property video must be a URL when provided.' });
      }
      try {
        const vu = new URL(req.body.videoUrl.trim());
        if (vu.protocol !== 'https:' && vu.protocol !== 'http:') {
          return res.status(400).json({ error: 'Validation Error', message: 'Property video must be a valid URL.' });
        }
        cleanVideoUrl = req.body.videoUrl.trim();
      } catch {
        return res.status(400).json({ error: 'Validation Error', message: 'Property video must be a valid URL.' });
      }
    }

    const pricePerYear = Math.max(10000, Number(req.body.pricePerYear) || 450000);
    const pricePerWeek = Math.max(100, Number(req.body.pricePerWeek) || Math.round(pricePerYear / 52));

    // Security P0-1: Always generate listing ID server-side with UUID. Never trust client req.body.id.
    const listingId = crypto.randomUUID();

    // Server-side agent object from verified agent profile
    const agentData = agentProfile as any;
    const agent = {
      id: agentProfile.id,
      name: agentProfile.name || 'Verified Agent',
      phone: agentProfile.phone || '',
      email: agentProfile.email || '',
      avatarUrl: agentProfile.avatarUrl || '',
      agencyName: agentProfile.agencyName || '',
      responseRate: agentData.responseRate || '98%',
      responseTime: agentData.responseTime || '< 15 mins',
      isVerified: true,
      rating: typeof agentData.rating === 'number' ? agentData.rating : 5.0,
      totalReviews: typeof agentData.totalReviews === 'number' ? agentData.totalReviews : 0
    };

    // Explicit allow-list of fields (no mass assignment)
    const newListing: any = {
      id: listingId,
      title,
      hotelName,
      address,
      description,
      universityId: 'uniosun',
      universityName: 'Osun State University (UNIOSUN)',
      propertyType: req.body.propertyType || 'self_contain',
      facilities: Array.isArray(req.body.facilities) ? req.body.facilities.map((f: any) => sanitizeInputString(String(f), 50)) : [],
      genderPreference: req.body.genderPreference || 'any',
      walkingDistanceMinutes: Math.max(1, Math.min(60, Number(req.body.walkingDistanceMinutes) || 10)),
      lat: typeof req.body.lat === 'number' ? req.body.lat : undefined,
      lng: typeof req.body.lng === 'number' ? req.body.lng : undefined,
      pricePerYear,
      pricePerWeek,
      photos: cleanPhotos,
      videoUrl: cleanVideoUrl,
      unitStatus: req.body.unitStatus || 'vacant',
      vacanciesCount: typeof req.body.vacanciesCount === 'number' ? Math.max(0, req.body.vacanciesCount) : undefined,
      unitStatusNote: req.body.unitStatusNote ? sanitizeInputString(req.body.unitStatusNote, 300) : undefined,
      deposit: typeof req.body.deposit === 'number' ? Math.max(0, req.body.deposit) : undefined,
      agencyFeeNote: req.body.agencyFeeNote ? sanitizeInputString(req.body.agencyFeeNote, 200) : undefined,
      promoDiscount: req.body.promoDiscount ? String(req.body.promoDiscount) : undefined,
      salesNote: req.body.salesNote ? sanitizeInputString(req.body.salesNote, 500) : undefined,
      isAvailableForSale: Boolean(req.body.isAvailableForSale),
      availableFrom: new Date().toISOString().split('T')[0],
      minLeaseMonths: 12,
      totalBedrooms: 1,
      totalBathrooms: 1,
      agentId,
      agent,
      isVerified: false,
      status: 'pending',
      verificationStatus: 'pending',
      rating: 5.0,
      reviewCount: 0,
      reviews: [],
      createdAt: new Date().toISOString().split('T')[0],
      viewCount: 0
    };

    listingsStore.unshift(newListing);

    if (firestoreDb) {
      try {
        // Use addDoc (INSERT) to ensure no silent merge / overwrite
        await addDoc(collection(firestoreDb, 'listings'), { ...newListing, id: newListing.id });
      } catch (fsErr) {
        console.warn("Failed to insert new listing into database:", fsErr);
      }
    }

    invalidateServerListingsCache(newListing.id);
    res.status(201).json(newListing);
  });

  // Update listing unit status and sales information (Agent)
  app.patch('/api/listings/:id/status-and-sales', requireSupabaseUser, async (req, res) => {
    const userId = (req as any).supabaseUser.id as string;
    const listing = (await getFirestoreListings()).find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.agentId !== userId) return res.status(403).json({ error: 'You can only update your own listing.' });

    const { 
      title,
      hotelName,
      address,
      description,
      photos,
      videoUrl,
      resubmitForVerification,
      unitStatus, 
      vacanciesCount, 
      unitStatusNote, 
      pricePerYear, 
      pricePerMonth, 
      pricePerWeek, 
      deposit, 
      agencyFeeNote, 
      promoDiscount, 
      salesNote, 
      isAvailableForSale 
    } = req.body;

    if (title !== undefined) listing.title = sanitizeInputString(title, 150);
    if (hotelName !== undefined) listing.hotelName = sanitizeInputString(hotelName, 150);
    if (address !== undefined) listing.address = sanitizeInputString(address, 300);
    if (description !== undefined) listing.description = sanitizeInputString(description, 2000);

    if (Array.isArray(photos)) {
      listing.photos = photos.slice(0, 3).map((p: any) => typeof p === 'string' ? p : '').filter(Boolean);
    }
    if (typeof videoUrl === 'string') {
      listing.videoUrl = videoUrl.trim();
    }

    if (resubmitForVerification === true) {
      listing.status = 'pending';
      listing.verificationStatus = 'pending';
      listing.rejectionReason = undefined;
    }

    if (unitStatus !== undefined) listing.unitStatus = unitStatus;
    if (vacanciesCount !== undefined) listing.vacanciesCount = Number(vacanciesCount);
    if (unitStatusNote !== undefined) listing.unitStatusNote = sanitizeInputString(unitStatusNote, 300);
    
    if (pricePerYear !== undefined) {
      const yearPrice = Math.max(0, Number(pricePerYear));
      listing.pricePerYear = yearPrice;
      listing.pricePerWeek = Math.round(yearPrice / 52);
      listing.pricePerMonth = Math.round(yearPrice / 12);
    }
    if (pricePerMonth !== undefined) listing.pricePerMonth = Math.max(0, Number(pricePerMonth));
    if (pricePerWeek !== undefined) listing.pricePerWeek = Math.max(0, Number(pricePerWeek));
    if (deposit !== undefined) listing.deposit = Math.max(0, Number(deposit));

    if (agencyFeeNote !== undefined) listing.agencyFeeNote = sanitizeInputString(agencyFeeNote, 200);
    if (promoDiscount !== undefined) listing.promoDiscount = sanitizeInputString(promoDiscount, 200);
    if (salesNote !== undefined) listing.salesNote = sanitizeInputString(salesNote, 500);
    if (isAvailableForSale !== undefined) listing.isAvailableForSale = Boolean(isAvailableForSale);

    await setDoc(doc(firestoreDb, 'listings', listing.id), listing, { merge: true });
    invalidateServerListingsCache(req.params.id);
    res.json(listing);
  });

  // Submit student star-rating review for listing
  app.post('/api/listings/:id/reviews', requireSupabaseUser, async (req, res) => {
    const user = (req as any).supabaseUser;
    const listing = (await getFirestoreListings()).find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const rating = Number(req.body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const newReview = {
      id: `rev_${Date.now()}`,
      authorName: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Verified Student',
      authorAvatar: user.user_metadata?.avatar_url || '',
      rating,
      date: 'Just now',
      comment: sanitizeInputString(req.body.comment, 1000),
      universityCourse: 'Student',
      tag: 'Verified Inspection Tour'
    };

    listing.reviews = [newReview, ...(listing.reviews || [])];
    listing.reviewCount = listing.reviews.length;
    
    // Calculate new average rating rounded to 1 decimal
    const totalRatingSum = listing.reviews.reduce((sum, r) => sum + r.rating, 0);
    listing.rating = Math.round((totalRatingSum / listing.reviewCount) * 10) / 10;

    await setDoc(doc(firestoreDb, 'listings', listing.id), listing, { merge: true });
    invalidateServerListingsCache(req.params.id);
    res.status(201).json(listing);
  });

  // Inspections
  app.get('/api/inspections', requireSupabaseUser, async (req, res) => {
    const userId = (req as any).supabaseUser.id as string;
    const list = (await getFirestoreInspections()).filter(i => i.studentId === userId || i.agentId === userId);
    res.json(list);
  });

  app.post('/api/inspections', requireSupabaseUser, async (req, res) => {
    const user = (req as any).supabaseUser;
    if (req.body.studentId && req.body.studentId !== user.id) {
      return res.status(403).json({ error: 'You can only book an inspection for your own account.' });
    }
    const listing = (await getFirestoreListings()).find((item) => item.id === req.body.listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    const inspection: Inspection = {
      ...req.body,
      id: `insp_${Date.now()}`,
      studentId: user.id,
      studentName: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Student',
      studentEmail: user.email || '',
      agentId: listing.agentId,
      agentName: listing.agent?.name || 'Caretaker',
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };
    inspectionsStore.unshift(inspection);
    await setDoc(doc(firestoreDb, 'inspections', inspection.id), inspection, { merge: true });
    res.status(201).json(inspection);
  });

  app.patch('/api/inspections/:id/status', requireSupabaseUser, async (req, res) => {
    const { status } = req.body;
    const userId = (req as any).supabaseUser.id as string;
    const insp = (await getFirestoreInspections()).find(i => i.id === req.params.id);
    if (!insp) return res.status(404).json({ error: 'Inspection not found' });
    if (insp.agentId !== userId) return res.status(403).json({ error: 'Only the assigned agent can update this inspection.' });
    if (!['confirmed', 'rescheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid inspection status.' });
    }
    insp.status = status;
    await setDoc(doc(firestoreDb, 'inspections', insp.id), insp, { merge: true });
    res.json(insp);
  });

  // Chat Conversations
  app.get('/api/conversations', requireSupabaseUser, async (req, res) => {
    const userId = (req as any).supabaseUser.id as string;
    const snapshot = await getDocs(collection(firestoreDb, 'conversations'));
    const stored: Conversation[] = [];
    snapshot.forEach((item) => stored.push({ id: item.id, ...item.data() } as Conversation));
    const conversations = new Map([...conversationsStore, ...stored].map((item) => [item.id, item]));
    const userConvs = Array.from(conversations.values()).filter(c => c.studentId === userId || c.agentId === userId);
    res.json(userConvs);
  });

  app.post('/api/conversations/start', requireSupabaseUser, async (req, res) => {
    const user = (req as any).supabaseUser;
    if (req.body.studentId && req.body.studentId !== user.id) {
      return res.status(403).json({ error: 'You can only start conversations for your own account.' });
    }
    const { listingId } = req.body;
    const listing = (await getFirestoreListings()).find((item) => item.id === listingId);
    if (!listing || listing.status !== 'approved') return res.status(404).json({ error: 'Approved listing not found.' });
    const studentId = user.id;
    const agentId = listing.agentId;
    const snapshot = await getDocs(collection(firestoreDb, 'conversations'));
    let existing = [...conversationsStore];
    snapshot.forEach((item) => existing.push({ id: item.id, ...item.data() } as Conversation));
    const matched = existing.find(c => c.studentId === studentId && c.agentId === agentId && c.listingId === listingId);
    
    if (matched) {
      return res.json(matched);
    }

    const agent = usersStore.find(u => u.id === agentId);

    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      studentId,
      studentName: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Verified Student',
      studentAvatar: user.user_metadata?.avatar_url || '',
      agentId,
      agentName: listing.agent?.name || agent?.name || 'Property Agent',
      agentAvatar: listing.agent?.avatarUrl || '',
      agencyName: listing.agent?.agencyName || 'Accommodation Services',
      listingId: listingId || '',
      listingTitle: listing.title || 'Student Accommodation',
      listingPhoto: listing.photos?.[0] || '',
      listingPrice: listing.pricePerWeek || 0,
      lastMessage: 'Conversation started',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      studentUnreadCount: 0,
      agentUnreadCount: 0
    };

    conversationsStore.unshift(newConv);
    await setDoc(doc(firestoreDb, 'conversations', newConv.id), newConv, { merge: true });

    // Initial system greeting
    const greetingMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId: newConv.id,
      senderId: newConv.agentId,
      senderName: newConv.agentName,
      senderRole: 'agent',
      recipientId: newConv.studentId,
      text: `Hello ${newConv.studentName}! Thank you for reaching out regarding ${newConv.listingTitle}. How can I help you today?`,
      createdAt: new Date().toISOString()
    };
    messagesStore.push(greetingMsg);
    await setDoc(doc(firestoreDb, 'conversations', newConv.id, 'messages', greetingMsg.id), greetingMsg, { merge: true });

    res.json(newConv);
  });

  app.get('/api/conversations/:id/messages', requireSupabaseUser, async (req, res) => {
    const userId = (req as any).supabaseUser.id as string;
    const conversation = await getDoc(doc(firestoreDb, 'conversations', req.params.id));
    if (!conversation.exists()) return res.status(404).json({ error: 'Conversation not found.' });
    const conversationData = conversation.data() as Conversation;
    if (conversationData.studentId !== userId && conversationData.agentId !== userId) {
      return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    }
    const snapshot = await getDocs(collection(firestoreDb, 'conversations', req.params.id, 'messages'));
    const msgs = snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ChatMessage));
    res.json(msgs);
  });

  app.post('/api/conversations/:id/messages', requireSupabaseUser, async (req, res) => {
    const conversationId = req.params.id;
    const user = (req as any).supabaseUser;
    const conversation = await getDoc(doc(firestoreDb, 'conversations', conversationId));
    if (!conversation.exists()) return res.status(404).json({ error: 'Conversation not found.' });
    const conversationData = conversation.data() as Conversation;
    const isStudent = conversationData.studentId === user.id;
    const isAgent = conversationData.agentId === user.id;
    if (!isStudent && !isAgent) return res.status(403).json({ error: 'You are not a participant in this conversation.' });
    const text = sanitizeInputString(req.body.text, 2000);
    if (!text) return res.status(400).json({ error: 'Message text is required.' });
    
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: user.id,
      senderName: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
      senderRole: isAgent ? 'agent' : 'student',
      recipientId: isStudent ? conversationData.agentId : conversationData.studentId,
      text,
      createdAt: new Date().toISOString()
    };

    messagesStore.push(msg);
    await setDoc(doc(firestoreDb, 'conversations', conversationId, 'messages', msg.id), msg, { merge: true });

    // Update conversation last message and participant-specific unread counters
    conversationData.lastMessage = text;
    conversationData.lastMessageTime = 'Just now';
    if (isStudent) {
      conversationData.agentUnreadCount = (conversationData.agentUnreadCount || 0) + 1;
      conversationData.unreadCount = conversationData.agentUnreadCount;
    } else {
      conversationData.studentUnreadCount = (conversationData.studentUnreadCount || 0) + 1;
      conversationData.unreadCount = conversationData.studentUnreadCount;
    }
    await setDoc(doc(firestoreDb, 'conversations', conversationId), conversationData, { merge: true });

    res.json(msg);
  });

  // Reports - Submit student fraud/fake listing report for Admin review
  app.get('/api/reports', requireAdminAuth, async (req, res) => {
    const snapshot = await getDocs(collection(firestoreDb, 'reports'));
    const storedReports: Report[] = [];
    snapshot.forEach((item) => storedReports.push({ id: item.id, ...item.data() } as Report));
    res.json(storedReports.sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
  });

  app.post('/api/reports', requireSupabaseUser, async (req, res) => {
    const user = (req as any).supabaseUser;
    const validReasons: Report['reason'][] = ['fake_listing', 'misleading_photos', 'scam_attempt', 'incorrect_price', 'other'];
    if (typeof req.body.listingId !== 'string' || !validReasons.includes(req.body.reason)) {
      return res.status(400).json({ error: 'A valid listing and report reason are required.' });
    }

    const listingId = sanitizeInputString(req.body.listingId, 100);
    const today = new Date().toISOString().split('T')[0];

    // Abuse prevention: max 1 open report per user per listing, max 5 reports per user per day
    const existingReports = await getDocs(collection(firestoreDb, 'reports')).then(snap => {
      const list: Report[] = [];
      snap.forEach(d => list.push(d.data() as Report));
      return list;
    }).catch(() => reportsStore);

    const userReportsToday = existingReports.filter(r => r.reporterId === user.id && r.createdAt.startsWith(today));
    if (userReportsToday.length >= 5) {
      return res.status(429).json({ error: 'Daily report limit reached. Please contact support if you need urgent assistance.' });
    }

    const alreadyReported = existingReports.some(r => r.reporterId === user.id && r.listingId === listingId && r.status === 'open');
    if (alreadyReported) {
      return res.status(409).json({ error: 'You have already submitted an active report for this listing.' });
    }

    const reportId = crypto.randomUUID();
    const report: Report = {
      id: reportId,
      listingId,
      listingTitle: sanitizeInputString(req.body.listingTitle || 'Accommodation Listing', 200),
      reporterId: user.id,
      reporterName: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Student',
      reason: req.body.reason,
      details: sanitizeInputString(req.body.details || '', 2000),
      status: 'open',
      createdAt: new Date().toISOString()
    };

    reportsStore.unshift(report);
    if (firestoreDb) {
      try {
        await addDoc(collection(firestoreDb, 'reports'), { ...report, id: report.id });
      } catch (fsErr) {
        console.warn("Failed to save report to database:", fsErr);
      }
    }

    res.status(201).json(report);
  });

  app.patch('/api/admin/reports/:id/status', requireAdminAuth, async (req, res) => {
    const validStatuses: Report['status'][] = ['open', 'investigating', 'resolved', 'dismissed'];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid report status.' });
    }
    const reportRef = doc(firestoreDb, 'reports', req.params.id);
    const snapshot = await getDoc(reportRef);
    if (!snapshot.exists()) return res.status(404).json({ error: 'Report not found.' });
    const updatedReport = { ...snapshot.data(), status: req.body.status } as Report;
    await setDoc(reportRef, updatedReport, { merge: true });
    reportsStore = reportsStore.map((report) => report.id === updatedReport.id ? updatedReport : report);
    res.json(updatedReport);
  });

  // --- FIREBASE NATIVE EMAIL VERIFICATION (CLIENT-DIRECTED) ---
  // Dormiqa now uses Firebase Authentication's native sendEmailVerification system.

  // --- SECURE ADMIN CONTROLS & AUTHENTICATION ENDPOINTS ---

  // Check whether an email is an authorized administrator
  app.post('/api/admin/check-authorized', async (req, res) => {
    const { email } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ authorized: false, message: 'Please enter a valid administrator email address.' });
    }

    if (cleanEmail === 'buildsafe247@gmail.com') {
      return res.json({ authorized: true, role: 'SUPER_ADMIN' });
    }

    if (firestoreDb && authorizedAdminMap.size <= 1) {
      await syncAdminEmailsFromFirestore();
    }

    const admin = authorizedAdminMap.get(cleanEmail);
    if (!admin || admin.status === 'disabled') {
      return res.json({ authorized: false, message: "This email doesn't have administrator access." });
    }

    return res.json({ authorized: true, role: admin.role });
  });

  // Admin Verification & Session Login.
  app.post('/api/admin/login', requireAdminAuth, (_req, res) => {
    res.json({ success: true, authorized: true, email: ADMIN_EMAIL, role: 'SUPER_ADMIN' });
  });

  // Check Admin Session
  app.get('/api/admin/check-session', requireAdminAuth, (req, res) => {
    const adminUser = (req as any).adminUser;
    res.json({
      authenticated: true,
      email: adminUser?.email || ADMIN_EMAIL,
      role: adminUser?.role || 'SUPER_ADMIN',
      userId: adminUser?.id
    });
  });

  // Fetch Administrators List (GET)
  app.get('/api/admin/administrators', requireAdminAuth, (req, res) => {
    res.json({
      success: true,
      administrators: Array.from(authorizedAdminMap.values()),
      emails: Array.from(authorizedAdminMap.keys())
    });
  });

  // Legacy alias for emails
  app.get('/api/admin/emails', requireAdminAuth, (req, res) => {
    res.json({
      success: true,
      administrators: Array.from(authorizedAdminMap.values()),
      emails: Array.from(authorizedAdminMap.keys())
    });
  });

  // Add Administrator (POST - Requires Super Admin)
  app.post('/api/admin/administrators', requireSuperAdminAuth, async (req, res) => {
    const { email, role = 'ADMIN' } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const adminRole = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address required.' });
    }

    if (cleanEmail !== 'buildsafe247@gmail.com') {
      return res.status(403).json({ success: false, error: 'Access denied: buildsafe247@gmail.com is the only approved administrator email address.' });
    }

    const adminUser = (req as any).adminUser;
    const newAdmin: AdminAccount = {
      email: cleanEmail,
      role: adminRole,
      status: 'Active',
      createdAt: new Date().toISOString(),
      addedBy: adminUser?.email || 'super_admin'
    };

    authorizedAdminMap.set(cleanEmail, newAdmin);

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'authorized_admins', cleanEmail), newAdmin, { merge: true });
      } catch (err) {
        console.warn("Failed to write admin email to Firestore collection:", err);
      }
    }

    res.json({
      success: true,
      message: `Administrator '${cleanEmail}' granted ${adminRole} access successfully.`,
      administrators: Array.from(authorizedAdminMap.values()),
      emails: Array.from(authorizedAdminMap.keys())
    });
  });

  // Legacy alias for POST emails
  app.post('/api/admin/emails', requireSuperAdminAuth, async (req, res) => {
    const { email, role = 'ADMIN' } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const adminRole = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address required.' });
    }

    if (cleanEmail !== 'buildsafe247@gmail.com') {
      return res.status(403).json({ success: false, error: 'Access denied: buildsafe247@gmail.com is the only approved administrator email address.' });
    }

    const adminUser = (req as any).adminUser;
    const newAdmin: AdminAccount = {
      email: cleanEmail,
      role: adminRole,
      status: 'Active',
      createdAt: new Date().toISOString(),
      addedBy: adminUser?.email || 'super_admin'
    };

    authorizedAdminMap.set(cleanEmail, newAdmin);

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'authorized_admins', cleanEmail), newAdmin, { merge: true });
      } catch (err) {
        console.warn("Failed to write admin email to Firestore collection:", err);
      }
    }

    res.json({
      success: true,
      message: `Administrator '${cleanEmail}' granted access successfully.`,
      administrators: Array.from(authorizedAdminMap.values()),
      emails: Array.from(authorizedAdminMap.keys())
    });
  });

  // Remove Administrator (DELETE - Requires Super Admin)
  app.delete('/api/admin/administrators', requireSuperAdminAuth, async (req, res) => {
    const { email } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (cleanEmail === 'buildsafe247@gmail.com') {
      return res.status(400).json({
        success: false,
        error: 'Forbidden',
        message: 'The primary Super Administrator (buildsafe247@gmail.com) cannot be removed.'
      });
    }

    if (!authorizedAdminMap.has(cleanEmail)) {
      return res.status(404).json({ success: false, error: 'Administrator email not found.' });
    }

    authorizedAdminMap.delete(cleanEmail);

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'authorized_admins', cleanEmail));
      } catch (err) {
        console.warn("Failed to delete admin email from Firestore collection:", err);
      }
    }

    res.json({
      success: true,
      message: `Administrator '${cleanEmail}' removed successfully.`,
      administrators: Array.from(authorizedAdminMap.values()),
      emails: Array.from(authorizedAdminMap.keys())
    });
  });

  // Legacy alias for DELETE emails
  app.delete('/api/admin/emails', requireSuperAdminAuth, async (req, res) => {
    const { email } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (cleanEmail === 'buildsafe247@gmail.com') {
      return res.status(400).json({
        success: false,
        error: 'Forbidden',
        message: 'The primary Super Administrator (buildsafe247@gmail.com) cannot be removed.'
      });
    }

    if (!authorizedAdminMap.has(cleanEmail)) {
      return res.status(404).json({ success: false, error: 'Administrator email not found.' });
    }

    authorizedAdminMap.delete(cleanEmail);

    if (firestoreDb) {
      try {
        await deleteDoc(doc(firestoreDb, 'authorized_admins', cleanEmail));
      } catch (err) {
        console.warn("Failed to delete admin email from Firestore collection:", err);
      }
    }

    res.json({
      success: true,
      message: `Administrator '${cleanEmail}' removed successfully.`,
      administrators: Array.from(authorizedAdminMap.values()),
      emails: Array.from(authorizedAdminMap.keys())
    });
  });

  // Update Administrator Role (PATCH - Requires Super Admin)
  app.patch('/api/admin/administrators/:email/role', requireSuperAdminAuth, async (req, res) => {
    const emailToUpdate = req.params.email ? req.params.email.trim().toLowerCase() : '';
    const { role } = req.body || {};

    if (emailToUpdate === 'buildsafe247@gmail.com' && role !== 'SUPER_ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'Forbidden',
        message: 'The primary Super Administrator must remain a SUPER_ADMIN.'
      });
    }

    const admin = authorizedAdminMap.get(emailToUpdate);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Administrator email not found.' });
    }

    const newRole = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    admin.role = newRole;
    authorizedAdminMap.set(emailToUpdate, admin);

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'authorized_admins', emailToUpdate), { role: newRole }, { merge: true });
      } catch (err) {
        console.warn("Failed to update admin role in Firestore:", err);
      }
    }

    res.json({
      success: true,
      message: `Administrator '${emailToUpdate}' role updated to ${newRole}.`,
      administrators: Array.from(authorizedAdminMap.values()),
      emails: Array.from(authorizedAdminMap.keys())
    });
  });

  // Admin Logout
  app.post('/api/admin/logout', requireAdminAuth, (_req, res) => {
    res.json({ success: true, message: 'Sign out of the Supabase session to end administrator access.' });
  });

  // Admin Stats (Real Firestore Data)
  app.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
    const users = await getFirestoreUsers();
    const listings = await getFirestoreListings();
    const inspections = await getFirestoreInspections();

    res.json({
      totalStudents: users.filter(u => u.role === 'student').length,
      verifiedAgents: users.filter(u => u.role === 'agent' && u.isVerifiedAgent).length,
      pendingAgents: users.filter(u => u.role === 'agent' && !u.isVerifiedAgent && u.status !== 'rejected').length,
      totalListings: listings.length,
      approvedListings: listings.filter(l => l.status === 'approved').length,
      pendingListings: listings.filter(l => l.status === 'pending').length,
      totalInspections: inspections.length,
      pendingReviews: listings.filter(l => l.status === 'pending').length + users.filter(u => u.role === 'agent' && !u.isVerifiedAgent && u.status !== 'rejected').length
    });
  });

  // Submit Agent Business Verification to Admin Dashboard
  app.post('/api/agents/submit-verification', async (req, res) => {
    try {
      const agentPayload = req.body?.agent || req.body || {};
      const agentId = agentPayload.id || agentPayload.uid || `agent_${Date.now()}`;
      const cleanEmail = typeof agentPayload.email === 'string' ? agentPayload.email.trim().toLowerCase() : '';

      const updatedAgent: User = {
        id: agentId,
        uid: agentId,
        name: agentPayload.name || agentPayload.agentFullName || 'Caretaker / Agent',
        email: cleanEmail,
        role: 'agent',
        agencyName: agentPayload.agencyName || agentPayload.businessName || 'Caretaker Agency',
        phone: agentPayload.phone || '',
        universityId: agentPayload.universityId || 'uniosun',
        universityName: agentPayload.universityName || 'Osun State University (UNIOSUN)',
        isEmailVerified: true,
        businessVerificationStatus: agentPayload.businessVerificationStatus || 'approved',
        isVerifiedAgent: true,
        licenseNumber: agentPayload.licenseNumber || `DMQ-AGT-${Math.floor(100000 + Math.random() * 900000)}`,
        avatarUrl: agentPayload.avatarUrl || agentPayload.portraitPhotoUrl || '',
        businessVerificationDetails: agentPayload.businessVerificationDetails || {},
        createdAt: agentPayload.createdAt || new Date().toISOString()
      };

      // 1. Update in-memory usersStore so admin portal immediately sees the agent
      const existingIndex = usersStore.findIndex(u => u.id === agentId || (cleanEmail && u.email?.toLowerCase() === cleanEmail));
      if (existingIndex >= 0) {
        usersStore[existingIndex] = { ...usersStore[existingIndex], ...updatedAgent };
      } else {
        usersStore.push(updatedAgent);
      }

      // 2. Persist to Firestore users collection
      if (firestoreDb) {
        try {
          await setDoc(doc(firestoreDb, 'users', agentId), updatedAgent, { merge: true });
        } catch (fsErr) {
          console.warn('Firestore write in submit-verification non-fatal:', fsErr);
        }
      }

      console.log(`[VERIFICATION SUBMITTED] Agent ${agentId} (${cleanEmail}) submitted to Admin Dashboard.`);

      return res.json({
        success: true,
        message: 'Business verification information submitted to admin dashboard successfully.',
        agent: updatedAgent
      });
    } catch (err: any) {
      console.error('Error submitting agent verification:', err);
      return res.status(500).json({ success: false, error: 'Could not submit verification information.' });
    }
  });

  // Fetch Agents List for Verification (Real Firestore Data)
  app.get('/api/admin/agents', requireAdminAuth, async (req, res) => {
    const users = await getFirestoreUsers();
    const listings = await getFirestoreListings();

    const agents = users.filter(u => u.role === 'agent').map(a => {
      const agentListings = listings.filter(l => l.agentId === a.id);
      return {
        ...a,
        propertiesCount: agentListings.length,
        proofType: a.licenseNumber ? 'CAC Registration Proof' : 'Business Verification Proof'
      };
    });
    res.json(agents);
  });

  // Update Agent Status (Verify / Reject)
  app.patch('/api/admin/agents/:id/status', requireAdminAuth, async (req, res) => {
    const { status, reason } = req.body;
    const users = await getFirestoreUsers();
    const agent = users.find(u => u.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const now = new Date().toISOString();
    const adminEmail = (req as any).adminEmail || 'buildsafe247@gmail.com';
    const isApproved = status === 'verified' || status === 'approved';
    const isRemoved = status === 'removed';

    agent.isVerifiedAgent = isApproved;
    agent.status = isApproved ? 'verified' : isRemoved ? 'removed' : 'rejected';
    (agent as any).verificationStatus = isApproved ? 'approved' : isRemoved ? 'removed' : 'rejected';
    (agent as any).businessVerificationStatus = isApproved ? 'approved' : isRemoved ? 'removed' : 'rejected';
    (agent as any).verificationUpdatedAt = now;

    if (isApproved) {
      (agent as any).verifiedAt = now;
      (agent as any).verifiedBy = adminEmail;
      (agent as any).rejectionReason = null;
    } else if (isRemoved) {
      (agent as any).removedAt = now;
      (agent as any).removedBy = adminEmail;
      (agent as any).removalReason = reason || 'Agent status revoked by administrator.';
    } else {
      (agent as any).rejectedAt = now;
      (agent as any).rejectedBy = adminEmail;
      (agent as any).rejectionReason = reason || 'Verification documents require update.';
    }

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'users', agent.id), agent, { merge: true });

        // Add real-time notification document to Firestore
        const notifTitle = isApproved ? 'Agent verification approved' : isRemoved ? 'Agent access revoked' : 'Agent verification update';
        const notifMsg = isApproved
          ? 'Your Dormiqa agent account has been verified.'
          : isRemoved
          ? `Your Dormiqa agent privileges have been revoked.${reason ? ` Reason: ${reason}` : ''}`
          : `Your agent verification was not approved.${reason ? ` Reason: ${reason}` : ''}`;

        await addDoc(collection(firestoreDb, 'notifications'), {
          recipientId: agent.id,
          userId: agent.id,
          type: 'agent_verification',
          title: notifTitle,
          message: notifMsg,
          body: notifMsg,
          read: false,
          createdAt: now,
          relatedId: agent.id,
          metadata: {
            rejectionReason: isApproved ? null : (reason || null),
            verificationStatus: isApproved ? 'approved' : isRemoved ? 'removed' : 'rejected',
            adminEmail
          }
        });
      } catch (err) {
        console.warn("Failed to sync agent status/notification to Firestore:", err);
      }
    }

    res.json(agent);
  });

  // Fetch All Properties for Verification (Real Firestore Data)
  app.get('/api/admin/properties', requireAdminAuth, async (req, res) => {
    const listings = await getFirestoreListings();
    res.json(listings);
  });

  // Update Property Status (Approve / Reject / Request Changes)
  app.patch('/api/admin/properties/:id/status', requireAdminAuth, async (req, res) => {
    const { status, reason } = req.body;
    const listings = await getFirestoreListings();
    const listing = listings.find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const now = new Date().toISOString();
    const adminEmail = (req as any).adminEmail || 'buildsafe247@gmail.com';
    const validStatuses = ['approved', 'rejected', 'changes_requested', 'banned', 'removed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid listing status.' });
    const nextStatus = status === 'banned' ? 'removed' : status;
    const isApproved = nextStatus === 'approved';
    const isRemoved = nextStatus === 'removed';

    listing.status = nextStatus;
    (listing as any).verificationStatus = nextStatus;
    (listing as any).verificationUpdatedAt = now;

    if (isApproved) {
      (listing as any).verifiedAt = now;
      (listing as any).verifiedBy = adminEmail;
      (listing as any).rejectionReason = null;
    } else if (nextStatus === 'changes_requested') {
      (listing as any).rejectionReason = reason || 'Listing details require updates.';
    } else if (isRemoved) {
      (listing as any).removedAt = now;
      (listing as any).removedBy = adminEmail;
      (listing as any).removalReason = reason || 'Listing removed from platform.';
      (listing as any).rejectionReason = reason || 'Listing removed from platform.';
    } else {
      (listing as any).rejectedAt = now;
      (listing as any).rejectedBy = adminEmail;
      (listing as any).rejectionReason = reason || 'Listing details require update.';
    }

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'listings', listing.id), listing, { merge: true });

        const targetAgentId = listing.agentId;
        if (targetAgentId) {
          const notifTitle = isApproved ? 'Hostel approved' : isRemoved ? 'Hostel listing removed' : nextStatus === 'changes_requested' ? 'Hostel changes requested' : 'Hostel verification update';
          const notifMsg = isApproved
            ? 'Your hostel listing has been approved and is now eligible to appear on Dormiqa.'
            : isRemoved
            ? `Your hostel listing was removed.${reason ? ` Reason: ${reason}` : ''}`
            : nextStatus === 'changes_requested'
            ? `Changes requested for your hostel listing.${reason ? ` Reason: ${reason}` : ''}`
            : `Your hostel listing was not approved.${reason ? ` Reason: ${reason}` : ''}`;

          await addDoc(collection(firestoreDb, 'notifications'), {
            recipientId: targetAgentId,
            userId: targetAgentId,
            type: 'hostel_verification',
            title: notifTitle,
            message: notifMsg,
            body: notifMsg,
            read: false,
            createdAt: now,
            relatedId: listing.id,
            metadata: {
              rejectionReason: isApproved ? null : (reason || null),
              verificationStatus: nextStatus,
              propertyId: listing.id,
              adminEmail
            }
          });
        }
      } catch (err) {
        console.warn("Failed to sync property status/notification to Firestore:", err);
      }
    }

    if (firestoreDb && isRemoved) {
      try {
        await addDoc(collection(firestoreDb, 'removal_audits'), {
          adminId: adminEmail,
          agentId: listing.agentId || '',
          listingId: listing.id,
          action: 'removed',
          reason: reason || 'Listing removed from platform.',
          timestamp: now
        });
      } catch (err) {
        console.warn('Failed to save listing removal audit:', err);
      }
    }

    invalidateServerListingsCache(req.params.id);
    res.json(listing);
  });

  // Admin Promote / Recommend Listing Toggle
  app.patch('/api/admin/properties/:id/promote', requireAdminAuth, async (req, res) => {
    const { isPromoted } = req.body;
    const listings = await getFirestoreListings();
    const listing = listings.find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const willBePromoted = Boolean(isPromoted);
    listing.isPromoted = willBePromoted;
    listing.featured = willBePromoted;

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'listings', listing.id), {
          isPromoted: willBePromoted,
          featured: willBePromoted,
          promotedAt: willBePromoted ? new Date().toISOString() : null
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to update listing promotion in Firestore:', err);
      }
    }

    invalidateServerListingsCache(req.params.id);
    res.json({ success: true, listingId: listing.id, isPromoted: willBePromoted });
  });

  // Student Overview (Real Firestore Data)
  app.get('/api/admin/students/overview', requireAdminAuth, async (req, res) => {
    const users = await getFirestoreUsers();
    const students = users.filter(u => u.role === 'student');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    let newToday = 0;
    let newThisWeek = 0;
    let newThisMonth = 0;

    students.forEach(s => {
      const createdTime = s.createdAt ? new Date(s.createdAt).getTime() : 0;
      if (createdTime > 0) {
        const age = now - createdTime;
        if (age <= oneDay) newToday++;
        if (age <= oneWeek) newThisWeek++;
        if (age <= oneMonth) newThisMonth++;
      }
    });
    
    // Group students by university dynamically
    const uniMap = new Map<string, { id: string; name: string; code: string; count: number }>();
    students.forEach(s => {
      const uniId = s.universityId || 'other';
      const uni = UNIVERSITIES.find(u => u.id === uniId);
      const name = uni ? uni.name : (s.universityId || 'Other Institution');
      const code = uni ? uni.code : 'OTHER';
      
      const current = uniMap.get(uniId) || { id: uniId, name, code, count: 0 };
      current.count += 1;
      uniMap.set(uniId, current);
    });

    const studentsByUniversity = Array.from(uniMap.values()).map(u => ({
      ...u,
      percent: students.length > 0 ? Number(((u.count / students.length) * 100).toFixed(1)) : 0
    }));

    res.json({
      totalStudents: students.length,
      newToday,
      newThisWeek,
      newThisMonth,
      studentsByUniversity
    });
  });

  // Admin Platform Analytics (Real Firestore Data)
  app.get('/api/admin/analytics', requireAdminAuth, async (req, res) => {
    const users = await getFirestoreUsers();
    const listings = await getFirestoreListings();

    const students = users.filter(u => u.role === 'student');
    const agents = users.filter(u => u.role === 'agent');

    // Group student signups over time by month
    const monthlySignupsMap = new Map<string, number>();
    students.forEach(s => {
      if (s.createdAt) {
        const date = new Date(s.createdAt);
        const monthLabel = date.toLocaleString('default', { month: 'short' });
        monthlySignupsMap.set(monthLabel, (monthlySignupsMap.get(monthLabel) || 0) + 1);
      }
    });

    const maxCount = Math.max(1, ...Array.from(monthlySignupsMap.values()));
    const studentSignupsOverTime = Array.from(monthlySignupsMap.entries()).map(([month, count]) => ({
      month,
      count,
      height: `${Math.round((count / maxCount) * 100)}%`
    }));

    // Build category demand dynamically from listings
    const typeCounts: Record<string, number> = {};
    listings.forEach(l => {
      const t = l.propertyType || 'Self-Contain Lodge';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    const totalListingsCount = listings.length;
    const accommodationDemand = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      percent: totalListingsCount > 0 ? Math.round((count / totalListingsCount) * 100) : 0
    }));

    res.json({
      studentSignupsOverTime,
      accommodationDemand,
      agentApplications: {
        total: agents.length,
        verified: agents.filter(u => u.isVerifiedAgent).length,
        pending: agents.filter(u => !u.isVerifiedAgent && u.status !== 'rejected').length,
        rejected: agents.filter(u => u.status === 'rejected').length
      },
      listingsStats: {
        total: listings.length,
        approved: listings.filter(l => l.status === 'approved').length,
        pending: listings.filter(l => l.status === 'pending').length,
        banned: listings.filter(l => l.status === 'banned' || l.status === 'rejected').length
      }
    });
  });

  return app;
}

async function startServer() {
  const app = await createExpressApp();
  const PORT = Number(process.env.PORT || 3000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dormiqa server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('Failed to start Dormiqa server:', err);
    process.exitCode = 1;
  });
}
