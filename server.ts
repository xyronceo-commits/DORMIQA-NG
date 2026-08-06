import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
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

// Resilient Multi-Provider AI completion runner supporting Groq (gsk_), OpenAI/OpenRouter (sk-), and Google Gemini (AIza / standard)
async function runLLMCompletion(params: {
  systemInstruction: string;
  prompt: string;
  responseFormatJson?: boolean;
  preferredModel?: string;
}): Promise<string> {
  // Collect all available key candidates
  const rawCandidates = [
    process.env.CAMPORA_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.CUSTOM_API_KEY,
    process.env.LLM_API_KEY,
    process.env.AI_API_KEY,
    process.env.SECRET_LAB_API_KEY
  ];

  const keysToTry = Array.from(new Set(
    rawCandidates.filter((k): k is string => Boolean(k && k.trim() && !k.startsWith('MY_')))
  ));

  if (keysToTry.length === 0) {
    throw new Error('No API key found. Please verify your CAMPORA_API_KEY or secret key in the Secrets tab.');
  }

  let lastError: any = null;

  for (const apiKey of keysToTry) {
    // 1) Groq API Keys (start with gsk_)
    if (apiKey.startsWith('gsk_')) {
      let groqModels: string[] = [];

      try {
        const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          if (Array.isArray(modelsData?.data)) {
            // Filter out non-chat models (audio, guard, compound, whisper, etc.)
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
        // Silently handle model list fetch error
      }

      // Default curated list of Groq chat models in priority order
      const priorityGroqModels = [
        'llama-3.3-70b-versatile',
        'llama-3.3-70b-specdec',
        'llama-3.1-8b-instant',
        'llama-3.2-11b-vision-preview',
        'llama-3.2-3b-preview',
        'llama-3.2-1b-preview',
        'deepseek-r1-distill-llama-70b',
        'qwen-2.5-coder-32b'
      ];

      // Merge priority models with fetched models, putting priority models first
      const allGroqModels = Array.from(new Set([
        ...priorityGroqModels.filter(m => groqModels.length === 0 || groqModels.includes(m)),
        ...groqModels
      ]));

      const modelsToTry = params.preferredModel && allGroqModels.includes(params.preferredModel)
        ? [params.preferredModel, ...allGroqModels.filter(m => m !== params.preferredModel)]
        : allGroqModels;

      for (const model of modelsToTry) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
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
              return textContent;
            }
          } else {
            const errJson = await res.json().catch(() => null);
            const errMsg = errJson?.error?.message || `Status ${res.status}`;
            lastError = new Error(`Groq (${model}): ${errMsg}`);
          }
        } catch (err: any) {
          lastError = err;
        }
      }
      continue;
    }

    // 2) OpenAI / OpenRouter Keys (start with sk-)
    if (apiKey.startsWith('sk-')) {
      const defaultModels = [
        'openai/gpt-oss-120b', 
        'qwen/qwen3.6-27b', 
        'qwen/qwen-2.5-72b-instruct', 
        'gpt-4o-mini'
      ];

      const modelsToTry = params.preferredModel && params.preferredModel !== 'auto' && params.preferredModel !== 'gemini-3.6-flash'
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
              'X-Title': 'Campora AI'
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
              return textContent;
            }
          }
        } catch (err) {
          console.warn(`OpenAI/OpenRouter call attempt failed for key ${apiKey.substring(0, 6)}...:`, err);
          lastError = err;
        }
      }
      continue;
    }

    // 3) Google Gemini API (standard keys or AIza...)
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: params.prompt,
        config: {
          systemInstruction: params.systemInstruction,
          ...(params.responseFormatJson ? { responseMimeType: 'application/json' } : {})
        }
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Gemini API call attempt failed for key ${apiKey.substring(0, 6)}...:`, err?.message || err);
      lastError = err;
    }
  }

  throw new Error(`AI completion failed. Please verify your API Key in the Secrets tab. (${lastError?.message || 'Invalid key'})`);
}


// Universal AI Anti-Scam & Duplicate Listing Detection and Auto-Ban Engine
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

  const systemInstruction = `You are Campora Nigeria's Chief AI Anti-Scam & Trust Verification Inspector.
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

Task: Determine if this listing should be IMMEDIATELY BANNED.
Return JSON strictly in this structure:
{
  "shouldBan": true,
  "banReason": "Detailed 2-sentence explanation of why the listing was banned by AI",
  "isFakeOrDuplicate": true,
  "duplicateAgentName": "${duplicateMatch?.agent?.name || ''}"
}`;

  try {
    const rawResult = await runLLMCompletion({
      systemInstruction,
      prompt,
      responseFormatJson: true
    });

    const cleaned = rawResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned || '{}');

    const shouldBan = Boolean(parsed.shouldBan || isDuplicate || (reportContext && (reportContext.reason === 'fake_listing' || reportContext.reason === 'scam_attempt')));
    const banReason = parsed.banReason || (isDuplicate 
      ? `AUTO-BANNED BY AI: Duplicate property uploaded by a different agent (${duplicateMatch?.agent?.name || 'another agent'}). Multiple agents cannot upload identical listings.`
      : `BANNED BY AI ANTI-SCAM: Listing failed verification following student scam report.`);

    if (shouldBan) {
      listingToEvaluate.status = 'banned';
      listingToEvaluate.isAiBanned = true;
      listingToEvaluate.aiBanReason = banReason;
      if (duplicateMatch) {
        listingToEvaluate.duplicateListingId = duplicateMatch.id;
      }
    }

    return {
      shouldBan,
      banReason,
      isDuplicate,
      duplicateAgentName: duplicateMatch?.agent?.name
    };
  } catch (err) {
    console.error('AI Moderation Error:', err);
    if (isDuplicate) {
      const banReason = `AUTO-BANNED BY AI: Duplicate property uploaded by a different agent (${duplicateMatch?.agent?.name}).`;
      listingToEvaluate.status = 'banned';
      listingToEvaluate.isAiBanned = true;
      listingToEvaluate.aiBanReason = banReason;
      if (duplicateMatch) listingToEvaluate.duplicateListingId = duplicateMatch.id;
      return { shouldBan: true, banReason, isDuplicate: true, duplicateAgentName: duplicateMatch?.agent?.name };
    }
    return { shouldBan: false, banReason: '', isDuplicate: false };
  }
}

// In-memory database state (starts empty for a clean brand new app)
let listingsStore: Listing[] = [];
let usersStore: User[] = [];
let inspectionsStore: Inspection[] = [];
let conversationsStore: Conversation[] = [];
let messagesStore: ChatMessage[] = [];
let reportsStore: Report[] = [];

const CLEAN_UNIVERSITIES = UNIVERSITIES.map(u => ({ ...u, totalListings: 0 }));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Campora API', timestamp: new Date().toISOString() });
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
      if (!isNaN(min)) result = result.filter(l => l.pricePerWeek >= min);
    }

    if (maxPrice) {
      const max = Number(maxPrice);
      if (!isNaN(max)) result = result.filter(l => l.pricePerWeek <= max);
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
    const newListing: Listing = {
      ...req.body,
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
      studentId: studentId || 'usr_student_1',
      studentName: studentName || 'Alex Chen',
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
      const { businessName, proofType, documentFileName, documentStorageUrl, agentName, agencyName, preferredModel } = req.body;

      const finalBizName = businessName?.trim() || agencyName?.trim() || 'Agent Business';

      if (!finalBizName && !documentFileName && !documentStorageUrl) {
        return res.status(400).json({
          success: false,
          approved: false,
          error: 'Please enter your business name and upload a proof of business image (banner, logo, office photo, business card, or CAC).'
        });
      }

      const systemInstruction = `You are Campora's AI Agent & Business Verification Auditor.
Your task is to evaluate business verification submissions for real estate agents and campus caretakers.
The submission consists of a Business/Agency Name and Proof of Business (such as a picture of their business banner, logo, office storefront, business card, or CAC document).

VERIFICATION EVALUATION RULES:
1. APPROVE if a business name is provided AND/OR a proof of business photo/document file is uploaded or specified.
2. REJECT only if the business name is offensive, completely gibberish, or empty with no proof file.

Return ONLY valid JSON matching this schema:
{
  "approved": true | false,
  "confidenceScore": number (0 to 100),
  "statusBadge": "Verified Business Agent" | "Verification Pending Review",
  "aiReason": "Detailed 1-2 sentence explanation approving the agent's business name and proof of business.",
  "licenseNumber": "Standardized verified business tag (e.g. CAMPORA-BIZ-2026-98234)"
}`;

      const prompt = `Agent Submission Details:
- Agent Name: "${agentName || 'Agent'}"
- Business / Agency Name: "${finalBizName}"
- Proof of Business Category: "${proofType || 'banner_or_logo'}"
- Uploaded Proof Image / Document: "${documentFileName || 'File uploaded'}"
- Storage Reference: "${documentStorageUrl || 'gs://campora-firebase.appspot.com/proof'}"`;

      const rawResult = await runLLMCompletion({
        systemInstruction,
        prompt,
        responseFormatJson: true,
        preferredModel
      });

      const cleaned = rawResult.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned || '{}');

      const approved = Boolean(parsed.approved ?? true);
      const licenseNumber = parsed.licenseNumber || `CAMPORA-BIZ-2026-${Math.floor(100000 + Math.random() * 900000)}`;

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

  // Admin Controls
  app.get('/api/admin/stats', (req, res) => {
    res.json({
      totalListings: listingsStore.length,
      approvedListings: listingsStore.filter(l => l.status === 'approved').length,
      pendingListings: listingsStore.filter(l => l.status === 'pending').length,
      verifiedAgents: usersStore.filter(u => u.role === 'agent' && u.isVerifiedAgent).length,
      totalInspections: inspectionsStore.length,
      openReports: reportsStore.filter(r => r.status === 'open' || r.status === 'investigating').length
    });
  });

  app.patch('/api/admin/listings/:id/status', (req, res) => {
    const { status } = req.body;
    const listing = listingsStore.find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    listing.status = status;
    res.json(listing);
  });

  app.patch('/api/admin/reports/:id/status', (req, res) => {
    const { status } = req.body;
    const rep = reportsStore.find(r => r.id === req.params.id);
    if (!rep) return res.status(404).json({ error: 'Report not found' });
    rep.status = status;
    res.json(rep);
  });

  // --- AI GEMINI ENDPOINTS ---

  // AI Smart Housing Recommendations
  app.post('/api/ai/recommend', async (req, res) => {
    try {
      const { universityId, universityName, budget, maxWalkingMinutes, propertyType, preferenceText, preferredModel } = req.body;

      // Get available approved listings
      let candidateListings = listingsStore.filter(l => l.status === 'approved');
      if (universityId) {
        candidateListings = candidateListings.filter(l => l.universityId === universityId);
      }

      const listingsSummary = candidateListings.map(l => ({
        id: l.id,
        title: l.title,
        pricePerWeek: l.pricePerWeek,
        propertyType: l.propertyType,
        walkingDistanceMinutes: l.walkingDistanceMinutes,
        facilities: l.facilities,
        verified: l.isVerified,
        rating: l.rating,
        universityName: l.universityName
      }));

      const systemInstruction = `You are Campora Nigeria's AI Accommodation Recommendation Engine.
Your task is to analyze a student's budget, campus walking preference, property type, and lifestyle description, and select the best matching properties from candidate listings.
Return ONLY valid JSON with keys: "summaryAdvice" (string), "matchedListingIds" (array of string IDs), and "matchReasons" (array of objects with "listingId", "reason", and "matchScorePercentage").`;

      const prompt = `Student Preferences:
- University: ${universityName || universityId || 'All Campuses'}
- Annual Budget / Rent Target: ₦${budget ? Number(budget).toLocaleString() : 'Any'} per year
- Max Walking Minutes to Campus Gate: ${maxWalkingMinutes ? `${maxWalkingMinutes} minutes` : 'Any'}
- Property Type: ${propertyType || 'Any'}
- Lifestyle Notes: "${preferenceText || 'Looking for a secure, quiet, generator-powered student lodge'}"

Candidate Listings (${candidateListings.length} available):
${JSON.stringify(listingsSummary, null, 2)}`;

      const rawResponseText = await runLLMCompletion({
        systemInstruction,
        prompt,
        responseFormatJson: true,
        preferredModel
      });

      // Clean response text if wrapped in markdown code blocks
      const cleanedJson = rawResponseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanedJson || '{}');

      res.json({
        success: true,
        summaryAdvice: parsed.summaryAdvice || 'Found suitable options matching your campus budget and walking preferences.',
        matchedListingIds: Array.isArray(parsed.matchedListingIds) ? parsed.matchedListingIds : candidateListings.map(c => c.id),
        matchReasons: Array.isArray(parsed.matchReasons) ? parsed.matchReasons : []
      });
    } catch (err: any) {
      console.error('AI Recommendation Error:', err);
      res.status(500).json({ 
        error: err.message || 'Failed to generate AI recommendations. Please check API Key configuration in Settings.' 
      });
    }
  });

  // AI Student Housing Chatbot Advisor
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { userMessage, conversationHistory, listingContext, universityName, preferredModel } = req.body;

      const systemInstruction = `You are Campora AI - Nigeria's premier, friendly, knowledgeable student accommodation advisor for federal, state, private universities and polytechnics (UNILAG, UNIBEN, OAU, UI, FUTA, ABU, Covenant, etc.).
You assist students with:
1. Finding safe, verified student lodges and self-contained flats.
2. Understanding rent terms, caution deposits, agreement & commission fees in Nigeria.
3. Inspection tips (checking water supply, security gates, prepay electricity meter, solar/generator backup).
4. Roommate matching advice and landlord negotiation tips.
Be concise, practical, warm, and highly helpful. Do NOT mention internal code or secrets.`;

      let contentsPrompt = `Student Question: ${userMessage}\n`;
      if (universityName) contentsPrompt += `Target Campus: ${universityName}\n`;
      if (listingContext) contentsPrompt += `Viewing Listing: ${listingContext.title} (₦${listingContext.pricePerWeek?.toLocaleString()}/yr, ${listingContext.address})\n`;

      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        contentsPrompt += `\nPrevious Conversation:\n` + conversationHistory.map((m: any) => `${m.sender}: ${m.text}`).join('\n');
      }

      const replyText = await runLLMCompletion({
        systemInstruction,
        prompt: contentsPrompt,
        responseFormatJson: false,
        preferredModel
      });

      res.json({
        success: true,
        reply: replyText || "I'm here to help you navigate verified student housing near your campus! Ask me anything about lodges, inspection appointments, or lease terms."
      });
    } catch (err: any) {
      console.error('AI Chatbot Error:', err);
      res.status(500).json({ 
        error: err.message || 'AI Advisor unavailable. Ensure API key is configured in Settings.' 
      });
    }
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
    console.log(`Campora server running on http://localhost:${PORT}`);
  });
}

startServer();
