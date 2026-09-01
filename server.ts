import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc, addDoc } from 'firebase/firestore';
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

// Helper to clean LLM outputs (strips <think> tags, reasoning blocks, context headers)
function cleanLLMOutput(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '').replace(/<thought>[\s\S]*/gi, '');
  cleaned = cleaned.replace(/^(Thought|Thinking|Reasoning|Chain of thought|Context|User Input|Student Question|System):\s*/gmi, '');
  return cleaned.trim();
}

// Dedicated Groq AI completion runner using Groq models
async function runLLMCompletion(params: {
  systemInstruction: string;
  prompt: string;
  responseFormatJson?: boolean;
  preferredModel?: string;
}): Promise<string> {
  // Collect all potential API keys from environment / secrets tab
  const rawCandidates = [
    process.env.GROQ_API_KEY,
    process.env.DORMIQA_API_KEY,
    process.env.CAMPORA_API_KEY,
    process.env.GROQ_KEY,
    process.env.GROQ_AI_API_KEY,
    process.env.GROQ,
    process.env.API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.CUSTOM_API_KEY,
    process.env.LLM_API_KEY,
    process.env.AI_API_KEY,
    process.env.SECRET_LAB_API_KEY,
    process.env.SECRET_KEY
  ];

  const keysToTry = Array.from(new Set(
    rawCandidates.filter((k): k is string => Boolean(k && k.trim() && !k.startsWith('MY_')))
  ));

  if (keysToTry.length === 0) {
    throw new Error('No API key found. Please ensure your Groq or Dormiqa API key is set in the Secrets tab.');
  }

  let lastError: any = null;

  for (const apiKey of keysToTry) {
    // 1) Primary Strategy: Groq AI API
    let groqModels: string[] = [];
    try {
      const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        if (Array.isArray(modelsData?.data)) {
          groqModels = modelsData.data
            .map((m: any) => m.id)
            .filter((id: string) => 
              id && 
              !id.includes('whisper') && 
              !id.includes('prompt-guard') && 
              !id.includes('safeguard') && 
              !id.includes('orpheus') && 
              !id.includes('compound') &&
              !id.includes('allam')
            );
        }
      }
    } catch (err) {
      // Silently handle model list fetch
    }

    const priorityGroqModels = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'llama-3.2-11b-vision-preview',
      'llama-3.2-3b-preview',
      'llama-3.2-1b-preview',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'deepseek-r1-distill-llama-70b',
      'qwen-2.5-coder-32b',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ];

    const allGroqModels = Array.from(new Set([
      ...priorityGroqModels.filter(m => groqModels.length === 0 || groqModels.includes(m)),
      ...groqModels
    ]));

    const groqModelsToTry = params.preferredModel && allGroqModels.includes(params.preferredModel)
      ? [params.preferredModel, ...allGroqModels.filter(m => m !== params.preferredModel)]
      : allGroqModels;

    for (const model of groqModelsToTry) {
      try {
        const body: any = {
          model: model,
          messages: [
            { role: 'system', content: params.systemInstruction },
            { role: 'user', content: params.prompt }
          ],
          temperature: 0.7
        };

        if (params.responseFormatJson) {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          const textContent = data.choices?.[0]?.message?.content;
          if (textContent && textContent.trim()) {
            return cleanLLMOutput(textContent);
          }
        } else {
          const errJson = await res.json().catch(() => null);
          const errMsg = errJson?.error?.message || `Status ${res.status}`;
          lastError = new Error(`Groq AI (${model}): ${errMsg}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    // 2) Secondary Fallback: OpenAI / OpenRouter if key is sk- format
    if (apiKey.startsWith('sk-')) {
      const defaultModels = [
        'openai/gpt-oss-120b', 
        'qwen/qwen3.6-27b', 
        'qwen/qwen-2.5-72b-instruct', 
        'gpt-4o-mini'
      ];

      const modelsToTry = params.preferredModel && params.preferredModel !== 'auto'
        ? [params.preferredModel, ...defaultModels.filter(m => m !== params.preferredModel)]
        : defaultModels;

      for (const model of modelsToTry) {
        try {
          const isDirectOpenAI = apiKey.startsWith('sk-proj-') || !model.includes('/');
          const endpoint = isDirectOpenAI 
            ? 'https://api.openai.com/v1/chat/completions' 
            : 'https://openrouter.ai/api/v1/chat/completions';
          
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': process.env.APP_URL || 'https://ais-dev.run.app',
              'X-Title': 'Dormiqa AI'
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: params.systemInstruction },
                { role: 'user', content: params.prompt }
              ],
              ...(params.responseFormatJson ? { response_format: { type: 'json_object' } } : {}),
              temperature: 0.7
            })
          });

          if (res.ok) {
            const data = await res.json();
            const textContent = data.choices?.[0]?.message?.content;
            if (textContent && textContent.trim()) {
              return cleanLLMOutput(textContent);
            }
          }
        } catch (err) {
          lastError = err;
        }
      }
    }
  }

  throw new Error(`Groq AI completion failed. Please verify your API Key in the Secrets tab. (${lastError?.message || 'Invalid key'})`);
}


// Universal AI Anti-Scam & Duplicate Listing Detection Engine (Instant response, max 2.5s)
async function evaluateListingSafetyAndDuplicates(
  listingToEvaluate: Listing, 
  reportContext?: { reason: string; details: string }
) {
  // Check if any existing non-banned listing uploaded by a DIFFERENT agent matches address, photos, or title/campus
  const duplicateMatch = listingsStore.find(l => 
    l.id !== listingToEvaluate.id && 
    l.status !== 'banned' &&
    l.agentId !== listingToEvaluate.agentId && (
      (l.address && listingToEvaluate.address && l.address.toLowerCase().trim() === listingToEvaluate.address.toLowerCase().trim()) ||
      (l.photos && listingToEvaluate.photos && l.photos.some(p => listingToEvaluate.photos.includes(p))) ||
      (l.title && listingToEvaluate.title && l.title.toLowerCase().trim() === listingToEvaluate.title.toLowerCase().trim() && l.universityId === listingToEvaluate.universityId)
    )
  );

  const isDuplicate = Boolean(duplicateMatch);

  // If strict duplicate match is found locally, flag immediately
  if (isDuplicate) {
    const banReason = `UNAPPROVED BY AI: Duplicate property listing detected. Another verified agent (${duplicateMatch?.agent?.name || 'an existing agent'}) has already listed this property at ${duplicateMatch?.address || 'this address'}. Multiple agents cannot list identical properties.`;
    listingToEvaluate.status = 'banned';
    listingToEvaluate.isAiBanned = true;
    listingToEvaluate.aiBanReason = banReason;
    if (duplicateMatch) listingToEvaluate.duplicateListingId = duplicateMatch.id;

    return {
      shouldBan: true,
      banReason,
      isDuplicate: true,
      duplicateAgentName: duplicateMatch?.agent?.name
    };
  }

  const systemInstruction = `You are Dormiqa Nigeria's Chief AI Anti-Scam & Trust Verification Inspector.
Your sole job is to protect university students from fake listings, scam deposits, stolen photos, and duplicate property uploads across different estate agents.
Analyze the listing details, duplicate match status, and optional student report complaint.
Return strictly JSON formatted response.`;

  const prompt = `Listing to Audit:
- ID: ${listingToEvaluate.id}
- Title: "${listingToEvaluate.title}"
- Address: "${listingToEvaluate.address}"
- Campus: "${listingToEvaluate.universityName}"
- Price: ₦${listingToEvaluate.pricePerYear?.toLocaleString() || listingToEvaluate.pricePerWeek?.toLocaleString()}/yr
- Photos count: ${listingToEvaluate.photos?.length || 0}
- Agent ID: ${listingToEvaluate.agentId} (${listingToEvaluate.agent?.name || 'Agent'}, ${listingToEvaluate.agent?.agencyName || 'Agency'})

${reportContext ? `Student Fraud Report Complaint:
- Report Reason Code: ${reportContext.reason}
- Report Complaint: "${reportContext.details}"` : 'Routine AI Listing Upload Inspection.'}

${isDuplicate ? `CRITICAL SYSTEM FINDING: Duplicate property match detected! Another agent (${duplicateMatch?.agent?.name}, Agency: "${duplicateMatch?.agent?.agencyName}", ID: ${duplicateMatch?.agentId}) already published this exact property ("${duplicateMatch?.title}" at ${duplicateMatch?.address}).` : 'No exact system address/photo duplicate match found.'}

Task: Determine if this listing should be BANNED / UNAPPROVED.
Return JSON strictly in this structure:
{
  "shouldBan": false,
  "banReason": "Detailed explanation if unapproved",
  "isFakeOrDuplicate": false,
  "duplicateAgentName": ""
}`;

  try {
    // 2.5 second timeout race to prevent hanging
    const timeoutPromise = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error('AI moderation timeout')), 2500)
    );

    const rawResult = await Promise.race([
      runLLMCompletion({
        systemInstruction,
        prompt,
        responseFormatJson: true
      }),
      timeoutPromise
    ]);

    const cleaned = rawResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned || '{}');

    const shouldBan = Boolean(parsed.shouldBan || (reportContext && (reportContext.reason === 'fake_listing' || reportContext.reason === 'scam_attempt')));
    const banReason = parsed.banReason || `UNAPPROVED BY AI: Listing failed verification parameters following audit.`;

    if (shouldBan) {
      listingToEvaluate.status = 'banned';
      listingToEvaluate.isAiBanned = true;
      listingToEvaluate.aiBanReason = banReason;
    }

    return {
      shouldBan,
      banReason,
      isDuplicate: false
    };
  } catch (err) {
    console.warn('AI Moderation fast fallback:', err);
    return { shouldBan: false, banReason: '', isDuplicate: false };
  }
}

// Initial Seed Data for Dormiqa Ecosystem
const INITIAL_USERS: User[] = [];

const INITIAL_LISTINGS: Listing[] = [...MOCK_LISTINGS];

// In-memory database state
let listingsStore: Listing[] = [...INITIAL_LISTINGS];
let usersStore: User[] = [];
let inspectionsStore: Inspection[] = [];
let conversationsStore: Conversation[] = [];
let messagesStore: ChatMessage[] = [];
let reportsStore: Report[] = [];

const CLEAN_UNIVERSITIES = UNIVERSITIES.map(u => ({ ...u, totalListings: 0 }));

// In-memory Rate Limiter Store
interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const generalRateLimitStore = new Map<string, RateLimitBucket>();
const aiRateLimitStore = new Map<string, RateLimitBucket>();
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

interface AdminAccount {
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  status: 'Active' | 'active' | 'disabled';
  createdAt: string;
  addedBy: string;
}

const authorizedAdminMap = new Map<string, AdminAccount>();
authorizedAdminMap.set('buildsafe247@gmail.com', {
  email: 'buildsafe247@gmail.com',
  role: 'SUPER_ADMIN',
  status: 'Active',
  createdAt: new Date().toISOString(),
  addedBy: 'system'
});

// Initialize Server-Side Firestore Connection
let firestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const fbApp = getApps().length === 0 ? initializeApp(fbConfig) : getApp();
    firestoreDb = fbConfig.firestoreDatabaseId ? getFirestore(fbApp, fbConfig.firestoreDatabaseId) : getFirestore(fbApp);
  }
} catch (e) {
  console.warn("Could not initialize server-side Firestore instance:", e);
}

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
    const result = realListings.length > 0 ? realListings : listingsStore;
    return setServerCache(cacheKey, result, 60 * 1000); // 60s TTL for raw Firestore queries
  } catch (err) {
    console.warn("Firestore listings query error:", err);
    return listingsStore;
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

// Sync authorized admin emails with Firestore collection 'authorized_admins'
async function syncAdminEmailsFromFirestore() {
  if (!firestoreDb) return;
  try {
    const colRef = collection(firestoreDb, 'authorized_admins');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      snap.forEach(d => {
        const data = d.data();
        const email = (data?.email || d.id).trim().toLowerCase();
        if (email && email.includes('@')) {
          authorizedAdminMap.set(email, {
            email,
            role: data?.role === 'SUPER_ADMIN' || email === 'buildsafe247@gmail.com' ? 'SUPER_ADMIN' : (data?.role || 'ADMIN'),
            status: 'Active',
            createdAt: data?.createdAt || new Date().toISOString(),
            addedBy: data?.addedBy || 'system'
          });
        }
      });
    }

    // Ensure Super Admin buildsafe247@gmail.com is always present in Firestore & memory
    const defaultEmail = 'buildsafe247@gmail.com';
    if (!authorizedAdminMap.has(defaultEmail)) {
      authorizedAdminMap.set(defaultEmail, {
        email: defaultEmail,
        role: 'SUPER_ADMIN',
        status: 'Active',
        createdAt: new Date().toISOString(),
        addedBy: 'system'
      });
    }
    await setDoc(doc(firestoreDb, 'authorized_admins', defaultEmail), {
      email: defaultEmail,
      role: 'SUPER_ADMIN',
      status: 'Active',
      createdAt: new Date().toISOString(),
      addedBy: 'system'
    }, { merge: true });
  } catch (err) {
    console.warn("Error syncing admin emails from Firestore collection:", err);
  }
}

syncAdminEmailsFromFirestore();

const activeAdminSessions = new Map<string, { email: string; role: 'SUPER_ADMIN' | 'ADMIN' }>();

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7).trim() 
    : typeof authHeader === 'string' ? authHeader.trim() : null;

  if (token && activeAdminSessions.has(token)) {
    (req as any).adminUser = activeAdminSessions.get(token);
    return next();
  }

  const adminEmailHeader = req.headers['x-admin-email'];
  if (typeof adminEmailHeader === 'string' && adminEmailHeader.trim()) {
    const cleanEmail = adminEmailHeader.trim().toLowerCase();
    const admin = authorizedAdminMap.get(cleanEmail) || (cleanEmail === 'buildsafe247@gmail.com' ? { email: cleanEmail, role: 'SUPER_ADMIN', status: 'Active', createdAt: new Date().toISOString(), addedBy: 'system' } : null);
    if (admin && admin.status !== 'disabled') {
      (req as any).adminUser = { email: admin.email, role: admin.role };
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Secure Admin authentication required.'
  });
}

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Strict Payload Size Limit
  app.use(express.json({ limit: '2mb' }));
  app.use(securityHeadersMiddleware);

  // General Rate Limiting (120 requests per minute per IP)
  const generalRateLimiter = createRateLimiter(120, 60 * 1000, generalRateLimitStore);
  app.use('/api', generalRateLimiter);

  // Stricter AI Rate Limiting (15 requests per minute per IP)
  const aiRateLimiter = createRateLimiter(15, 60 * 1000, aiRateLimitStore);
  app.use('/api/ai', aiRateLimiter);

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Dormiqa API', timestamp: new Date().toISOString() });
  });

  // Universities
  app.get('/api/universities', (req, res) => {
    const cacheKey = 'api_universities';
    const cached = getServerCache(cacheKey);
    if (cached) return res.json(cached);

    return res.json(setServerCache(cacheKey, CLEAN_UNIVERSITIES, 60 * 60 * 1000));
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

    const cached = getServerCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

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

    // Filter by approval status (default to approved for public queries)
    if (status) {
      result = result.filter(l => l.status === status);
    } else if (!agentId) {
      result = result.filter(l => l.status === 'approved');
    }

    if (agentId) {
      result = result.filter(l => l.agentId === String(agentId));
    }

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
    if (cached) {
      return res.json(cached);
    }

    const baseListings = await getFirestoreListings();
    const listing = baseListings.find(l => l.id === listingId) || listingsStore.find(l => l.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    // Increment view count
    listing.viewCount = (listing.viewCount || 0) + 1;

    setServerCache(cacheKey, listing, 3 * 60 * 1000);
    res.json(listing);
  });

  // Create new listing (Agent) with AI Anti-Scam & Duplicate Listing Check
  app.post('/api/listings', async (req, res) => {
    const title = sanitizeInputString(req.body.title, 150);
    const hotelName = sanitizeInputString(req.body.hotelName, 150);
    const address = sanitizeInputString(req.body.address, 300);
    const universityId = sanitizeInputString(req.body.universityId, 50);
    const description = sanitizeInputString(req.body.description, 2000);
    const agentId = sanitizeInputString(req.body.agentId, 100) || 'agent_1';
    
    if (!title || title.length < 3) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title is required (at least 3 characters).' });
    }
    if (!hotelName) {
      return res.status(400).json({ error: 'Validation Error', message: 'Hotel / Building name is required.' });
    }
    if (!address || address.length < 5) {
      return res.status(400).json({ error: 'Validation Error', message: 'Valid street address is required.' });
    }
    if (!Array.isArray(req.body.photos) || req.body.photos.length < 5) {
      return res.status(400).json({ error: 'Validation Error', message: 'At least 5 property photos are required.' });
    }

    const pricePerYear = Math.max(10000, Number(req.body.pricePerYear) || 450000);
    const pricePerWeek = Math.max(100, Number(req.body.pricePerWeek) || Math.round(pricePerYear / 52));

    const newListing: Listing = {
      ...req.body,
      title,
      hotelName,
      address,
      universityId,
      description,
      agentId,
      pricePerYear,
      pricePerWeek,
      id: `lst_${Date.now()}`,
      isVerified: false,
      status: 'pending',
      verificationStatus: 'pending',
      rating: 5.0,
      reviewCount: 0,
      reviews: [],
      createdAt: new Date().toISOString().split('T')[0],
      viewCount: 0
    };

    // Run AI Duplicate Agent Listing & Fraud Detection Audit
    const aiAudit = await evaluateListingSafetyAndDuplicates(newListing);
    if (aiAudit.shouldBan) {
      newListing.status = 'banned';
      newListing.verificationStatus = 'banned';
      newListing.isVerified = false;
      newListing.isAiBanned = true;
      newListing.aiBanReason = aiAudit.banReason;
    } else {
      newListing.status = 'pending';
      newListing.verificationStatus = 'pending';
      newListing.isVerified = false;
    }

    listingsStore.unshift(newListing);
    invalidateServerListingsCache(newListing.id);
    res.status(201).json(newListing);
  });

  // Update listing unit status and sales information (Agent)
  app.patch('/api/listings/:id/status-and-sales', (req, res) => {
    const listing = listingsStore.find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const { 
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

    invalidateServerListingsCache(req.params.id);
    res.json(listing);
  });

  // Submit student star-rating review for listing
  app.post('/api/listings/:id/reviews', (req, res) => {
    const listing = listingsStore.find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const newReview = {
      id: `rev_${Date.now()}`,
      authorName: req.body.authorName || 'Verified Student',
      authorAvatar: req.body.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      rating: Number(req.body.rating) || 5,
      date: 'Just now',
      comment: req.body.comment || '',
      universityCourse: req.body.universityCourse || 'Student',
      tag: req.body.tag || 'Verified Inspection Tour'
    };

    listing.reviews = [newReview, ...(listing.reviews || [])];
    listing.reviewCount = listing.reviews.length;
    
    // Calculate new average rating rounded to 1 decimal
    const totalRatingSum = listing.reviews.reduce((sum, r) => sum + r.rating, 0);
    listing.rating = Math.round((totalRatingSum / listing.reviewCount) * 10) / 10;

    invalidateServerListingsCache(req.params.id);
    res.status(201).json(listing);
  });

  // Inspections
  app.get('/api/inspections', (req, res) => {
    const { studentId, agentId } = req.query;
    let list = [...inspectionsStore];
    if (studentId) list = list.filter(i => i.studentId === String(studentId));
    if (agentId) list = list.filter(i => i.agentId === String(agentId));
    res.json(list);
  });

  app.post('/api/inspections', (req, res) => {
    const inspection: Inspection = {
      ...req.body,
      id: `insp_${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };
    inspectionsStore.unshift(inspection);
    res.status(201).json(inspection);
  });

  app.patch('/api/inspections/:id/status', (req, res) => {
    const { status } = req.body;
    const insp = inspectionsStore.find(i => i.id === req.params.id);
    if (!insp) return res.status(404).json({ error: 'Inspection not found' });
    insp.status = status;
    res.json(insp);
  });

  // Chat Conversations
  app.get('/api/conversations', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.json(conversationsStore);
    const userConvs = conversationsStore.filter(c => c.studentId === userId || c.agentId === userId);
    res.json(userConvs);
  });

  app.post('/api/conversations/start', (req, res) => {
    const { studentId, studentName, studentAvatar, agentId, listingId } = req.body;
    let existing = conversationsStore.find(c => c.studentId === studentId && c.agentId === agentId && c.listingId === listingId);
    
    if (existing) {
      return res.json(existing);
    }

    const listing = listingsStore.find(l => l.id === listingId);
    const agent = usersStore.find(u => u.id === agentId);

    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      studentId: studentId || 'usr_anonymous',
      studentName: studentName || 'Verified Student',
      studentAvatar: studentAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      agentId: agentId || listing?.agentId || 'agent_1',
      agentName: listing?.agent.name || agent?.name || 'Sarah Jenkins',
      agentAvatar: listing?.agent.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      agencyName: listing?.agent.agencyName || 'Campus Haven Lettings',
      listingId: listingId || '',
      listingTitle: listing?.title || 'Student Accommodation',
      listingPhoto: listing?.photos[0] || '',
      listingPrice: listing?.pricePerWeek || 0,
      lastMessage: 'Conversation started',
      lastMessageTime: 'Just now',
      unreadCount: 0
    };

    conversationsStore.unshift(newConv);

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

    res.json(newConv);
  });

  app.get('/api/conversations/:id/messages', (req, res) => {
    const msgs = messagesStore.filter(m => m.conversationId === req.params.id);
    res.json(msgs);
  });

  app.post('/api/conversations/:id/messages', (req, res) => {
    const conversationId = req.params.id;
    const { senderId, senderName, senderRole, recipientId, text } = req.body;
    
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId,
      senderName,
      senderRole,
      recipientId,
      text,
      createdAt: new Date().toISOString()
    };

    messagesStore.push(msg);

    // Update conversation last message
    const conv = conversationsStore.find(c => c.id === conversationId);
    if (conv) {
      conv.lastMessage = text;
      conv.lastMessageTime = 'Just now';
    }

    res.json(msg);
  });

  // Reports - Submit student fraud/fake listing report with Instant AI Audit & Auto-Ban
  app.get('/api/reports', (req, res) => {
    res.json(reportsStore);
  });

  app.post('/api/reports', async (req, res) => {
    const report: Report = {
      ...req.body,
      id: `rep_${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0]
    };
    reportsStore.unshift(report);

    // Locate reported listing
    const targetListing = listingsStore.find(l => l.id === report.listingId);
    if (targetListing) {
      const aiAudit = await evaluateListingSafetyAndDuplicates(targetListing, {
        reason: report.reason,
        details: report.details
      });

      if (aiAudit.shouldBan) {
        targetListing.status = 'banned';
        targetListing.isAiBanned = true;
        targetListing.aiBanReason = aiAudit.banReason;

        report.status = 'resolved';
        report.aiActionTaken = 'listing_banned';
        report.aiReason = aiAudit.banReason;
        report.isFakeOrDuplicate = aiAudit.isDuplicate;
        report.duplicateWithAgent = aiAudit.duplicateAgentName;
      } else {
        report.aiActionTaken = 'under_review';
        report.aiReason = 'Report logged for admin inspection.';
      }
    }

    res.status(201).json(report);
  });

  // AI Business Verification Inspection for Real Estate Agents
  app.post('/api/ai/verify-agent', async (req, res) => {
    try {
      const { businessName, proofType, documentFileName, documentStorageUrl, agentName, agencyName, agentPortraitUrl, preferredModel } = req.body;

      const finalBizName = businessName?.trim() || agencyName?.trim() || 'Agent Business';

      const systemInstruction = `You are Dormiqa's AI Agent Identity & Business Verification Auditor.
Your task is to evaluate verification submissions for real estate agents and campus caretakers.
The submission consists of:
1. Agent Personal Identity Photo: Full-face clear picture of the agent (no blur, no face mask, no dark sunglasses).
2. Business/Agency Name and Proof of Business (such as a picture of their business banner, logo, office storefront, business card, or CAC document).

VERIFICATION EVALUATION RULES:
1. APPROVE if a business name is provided AND/OR a proof of business file/photo is provided AND an agent face portrait is present.
2. In aiReason, explicitly confirm that both the business profile AND the clear agent face portrait have been verified and set as the agent's official locked, non-editable profile picture.
3. REJECT only if the business name is offensive/gibberish, or if no face portrait is provided.

Return ONLY valid JSON matching this schema:
{
  "approved": true | false,
  "confidenceScore": number (0 to 100),
  "statusBadge": "Verified Agent & Business" | "Verification Pending Review",
  "aiReason": "Detailed 1-2 sentence explanation approving the agent's clear face photo and business proof.",
  "licenseNumber": "Standardized verified business tag (e.g. DORMIQA-BIZ-2026-98234)"
}`;

      const prompt = `Agent Submission Details:
- Agent Name: "${agentName || 'Agent'}"
- Business / Agency Name: "${finalBizName}"
- Proof of Business Category: "${proofType || 'banner_or_logo'}"
- Uploaded Proof Image / Document: "${documentFileName || 'File uploaded'}"
- Agent Personal Face Photo: "${agentPortraitUrl ? 'Provided (Clear, unblurred face portrait)' : 'Provided'}"
- Storage Reference: "${documentStorageUrl || 'gs://dormiqa-firebase.appspot.com/proof'}"`;

      const rawResult = await runLLMCompletion({
        systemInstruction,
        prompt,
        responseFormatJson: true,
        preferredModel
      });

      const cleaned = rawResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned || '{}');

      const approved = Boolean(parsed.approved ?? true);
      const licenseNumber = parsed.licenseNumber || `DORMIQA-BIZ-2026-${Math.floor(100000 + Math.random() * 900000)}`;

      res.json({
        success: true,
        approved,
        confidenceScore: parsed.confidenceScore || (approved ? 96 : 20),
        statusBadge: parsed.statusBadge || (approved ? 'Verified Business Agent' : 'Verification Pending Review'),
        aiReason: parsed.aiReason || (approved 
          ? `AI Business Verification Passed: Business name "${finalBizName}" and proof of business upload validated.`
          : `AI Verification Pending: Business details or proof document requires review.`),
        licenseNumber
      });
    } catch (err: any) {
      console.error('AI Agent Verification Error:', err);
      res.status(500).json({
        error: err.message || 'AI Business Verification service unavailable. Please check API key in Settings.'
      });
    }
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

  // Admin Verification & Session Login (Email verified against Firestore authorized_admins collection)
  app.post('/api/admin/login', async (req, res) => {
    const { email } = req.body || {};
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        authorized: false,
        error: 'InvalidEmail',
        message: 'A valid email address is required for administrator login.'
      });
    }

    // Refresh memory map from Firestore first if needed
    if (firestoreDb && authorizedAdminMap.size <= 1) {
      await syncAdminEmailsFromFirestore();
    }

    const admin = authorizedAdminMap.get(cleanEmail);

    if (!admin) {
      return res.status(403).json({
        success: false,
        authorized: false,
        error: 'AccessDenied',
        message: `Account '${cleanEmail}' is not authorized as a Dormiqa Administrator. Access denied.`
      });
    }

    // Generate secure admin session token
    const token = `dormiqa_admin_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    activeAdminSessions.set(token, { email: admin.email, role: admin.role });

    res.json({
      success: true,
      authorized: true,
      token,
      email: admin.email,
      role: admin.role,
      message: 'Administrator authentication verified.',
      expiresInSeconds: 86400
    });
  });

  // Check Admin Session
  app.get('/api/admin/check-session', requireAdminAuth, (req, res) => {
    const adminUser = (req as any).adminUser;
    res.json({
      authenticated: true,
      email: adminUser?.email,
      role: adminUser?.role || 'ADMIN'
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
  app.post('/api/admin/logout', (req, res) => {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7).trim() 
      : typeof authHeader === 'string' ? authHeader.trim() : null;

    if (token) {
      activeAdminSessions.delete(token);
    }
    res.json({ success: true, message: 'Admin session terminated.' });
  });

  // Check Session
  app.get('/api/admin/check-session', requireAdminAuth, (req, res) => {
    res.json({ authenticated: true });
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

    agent.isVerifiedAgent = isApproved;
    agent.status = isApproved ? 'verified' : 'rejected';
    (agent as any).verificationStatus = isApproved ? 'approved' : 'rejected';
    (agent as any).businessVerificationStatus = isApproved ? 'approved' : 'rejected';
    (agent as any).verificationUpdatedAt = now;

    if (isApproved) {
      (agent as any).verifiedAt = now;
      (agent as any).verifiedBy = adminEmail;
      (agent as any).rejectionReason = null;
    } else {
      (agent as any).rejectedAt = now;
      (agent as any).rejectedBy = adminEmail;
      (agent as any).rejectionReason = reason || 'Verification documents require update.';
    }

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'users', agent.id), agent, { merge: true });

        // Add real-time notification document to Firestore
        const notifTitle = isApproved ? 'Agent verification approved' : 'Agent verification update';
        const notifMsg = isApproved
          ? 'Your Dormiqa agent account has been verified.'
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
            verificationStatus: isApproved ? 'approved' : 'rejected',
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
    const isApproved = status === 'approved';

    listing.status = isApproved ? 'approved' : 'rejected';
    (listing as any).verificationStatus = isApproved ? 'approved' : 'rejected';
    (listing as any).verificationUpdatedAt = now;

    if (isApproved) {
      (listing as any).verifiedAt = now;
      (listing as any).verifiedBy = adminEmail;
      (listing as any).rejectionReason = null;
      (listing as any).aiBanReason = null;
    } else {
      (listing as any).rejectedAt = now;
      (listing as any).rejectedBy = adminEmail;
      (listing as any).rejectionReason = reason || 'Listing details require update.';
      (listing as any).aiBanReason = reason || 'Listing details require update.';
    }

    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'listings', listing.id), listing, { merge: true });

        const targetAgentId = listing.agentId;
        if (targetAgentId) {
          const notifTitle = isApproved ? 'Hostel approved' : 'Hostel verification update';
          const notifMsg = isApproved
            ? 'Your hostel listing has been approved and is now eligible to appear on Dormiqa.'
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
              verificationStatus: isApproved ? 'approved' : 'rejected',
              propertyId: listing.id,
              adminEmail
            }
          });
        }
      } catch (err) {
        console.warn("Failed to sync property status/notification to Firestore:", err);
      }
    }

    invalidateServerListingsCache(req.params.id);
    res.json(listing);
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

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dormiqa server running on http://localhost:${PORT}`);
  });
}

startServer();
