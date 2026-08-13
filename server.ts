import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
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

const CLEAN_UNIVERSITIES = UNIVERSITIES.map(u => ({ ...u, totalListings: 5 }));

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

// Admin Active Sessions & Security
const validAdminPasswords = new Set<string>([
  (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim()) || 'Dormiqa26/27'
]);

const activeAdminSessions = new Set<string>();

function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7).trim() 
    : typeof authHeader === 'string' ? authHeader.trim() : null;

  if (!token || !activeAdminSessions.has(token)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Secure Admin authentication required.'
    });
  }
  next();
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
    res.json(CLEAN_UNIVERSITIES);
  });

  // Listings with advanced filtering
  app.get('/api/listings', (req, res) => {
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

    let result = [...listingsStore];

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

    res.json(result);
  });

  // Get single listing
  app.get('/api/listings/:id', (req, res) => {
    const listing = listingsStore.find(l => l.id === req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    // Increment view count
    listing.viewCount = (listing.viewCount || 0) + 1;
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
      isVerified: true,
      status: 'pending',
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
      newListing.isAiBanned = true;
      newListing.aiBanReason = aiAudit.banReason;
    } else {
      newListing.status = 'approved'; // Auto-approve verified clean listings
    }

    listingsStore.unshift(newListing);
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

  // Admin Login (Rate-limited, Password-verified)
  app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
    const { password } = req.body || {};
    const cleanPassword = typeof password === 'string' ? password.trim() : '';
    if (!cleanPassword || !validAdminPasswords.has(cleanPassword)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid administrative password.'
      });
    }

    const token = `dormiqa_admin_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    activeAdminSessions.add(token);

    res.json({
      success: true,
      token,
      message: 'Administrative authentication successful',
      expiresInSeconds: 86400
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

  // Admin Stats
  app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
    res.json({
      totalStudents: usersStore.filter(u => u.role === 'student').length,
      verifiedAgents: usersStore.filter(u => u.role === 'agent' && u.isVerifiedAgent).length,
      pendingAgents: usersStore.filter(u => u.role === 'agent' && !u.isVerifiedAgent && u.status !== 'rejected').length,
      totalListings: listingsStore.length,
      approvedListings: listingsStore.filter(l => l.status === 'approved').length,
      pendingListings: listingsStore.filter(l => l.status === 'pending').length,
      pendingReviews: listingsStore.filter(l => l.status === 'pending').length + usersStore.filter(u => u.role === 'agent' && !u.isVerifiedAgent && u.status !== 'rejected').length
    });
  });

  // Fetch Agents List for Verification
  app.get('/api/admin/agents', requireAdminAuth, (req, res) => {
    const agents = usersStore.filter(u => u.role === 'agent').map(a => {
      const agentListings = listingsStore.filter(l => l.agentId === a.id);
      return {
        ...a,
        propertiesCount: agentListings.length,
        proofType: a.licenseNumber ? 'CAC Registration Proof' : 'Business Verification Proof'
      };
    });
    res.json(agents);
  });

  // Update Agent Status (Verify / Reject)
  app.patch('/api/admin/agents/:id/status', requireAdminAuth, (req, res) => {
    const { status, reason } = req.body;
    const agent = usersStore.find(u => u.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (status === 'verified') {
      agent.isVerifiedAgent = true;
      agent.status = 'verified';
    } else if (status === 'rejected') {
      agent.isVerifiedAgent = false;
      agent.status = 'rejected';
      (agent as any).rejectionReason = reason || 'Verification documents require update.';
    }

    res.json(agent);
  });

  // Fetch All Properties for Verification
  app.get('/api/admin/properties', requireAdminAuth, (req, res) => {
    res.json(listingsStore);
  });

  // Update Property Status (Approve / Reject / Request Changes)
  app.patch('/api/admin/properties/:id/status', requireAdminAuth, (req, res) => {
    const { status, reason } = req.body;
    const listing = listingsStore.find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    listing.status = status;
    if (reason) {
      listing.aiBanReason = reason;
    }
    res.json(listing);
  });

  // Student Overview
  app.get('/api/admin/students/overview', requireAdminAuth, (req, res) => {
    const students = usersStore.filter(u => u.role === 'student');
    
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
      newToday: 0,
      newThisWeek: 0,
      newThisMonth: 0,
      studentsByUniversity
    });
  });

  // Admin Platform Analytics
  app.get('/api/admin/analytics', requireAdminAuth, (req, res) => {
    const students = usersStore.filter(u => u.role === 'student');
    const agents = usersStore.filter(u => u.role === 'agent');

    // Build category demand dynamically from listings
    const typeCounts: Record<string, number> = {};
    listingsStore.forEach(l => {
      const t = l.propertyType || 'Self-Contain Lodge';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    const totalListingsCount = listingsStore.length;
    const accommodationDemand = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      percent: totalListingsCount > 0 ? Math.round((count / totalListingsCount) * 100) : 0
    }));

    res.json({
      studentSignupsOverTime: [],
      accommodationDemand,
      agentApplications: {
        total: agents.length,
        verified: agents.filter(u => u.isVerifiedAgent).length,
        pending: agents.filter(u => !u.isVerifiedAgent && u.status !== 'rejected').length,
        rejected: agents.filter(u => u.status === 'rejected').length
      },
      listingsStats: {
        total: listingsStore.length,
        approved: listingsStore.filter(l => l.status === 'approved').length,
        pending: listingsStore.filter(l => l.status === 'pending').length,
        banned: listingsStore.filter(l => l.status === 'banned' || l.status === 'rejected').length
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
