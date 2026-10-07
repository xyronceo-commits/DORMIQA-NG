# Phase 2 — Audit By Theme Notes

## Theme A: Authentication & Sessions
- **Session Duration Requirement (12-hour auto-logout)**:
  - `src/services/firebase.ts:814-825`: Implemented as client-only timestamp check (`localStorage.getItem('dormiqa_user_session_' + uid)`).
  - `src/App.tsx:130-156`: Client interval checks this every 60s and on window focus.
  - **Vulnerabilities / Bypass Surfaces**:
    - Removing `localStorage.getItem` or tampering with the key bypasses the check entirely because the code defaults to `true` if null or invalid JSON (`src/services/firebase.ts:817, 823`).
    - Supabase Auth tokens are NOT invalidated after 12 hours server-side. Supabase refresh token rotation continues refreshing tokens automatically.
    - Direct calls to Supabase or `/api/*` bypass the 12-hour limit as long as the Supabase JWT is valid.

## Theme B: Authorization, RLS & Admin Separation
- **Admin Hardcoding**:
  - `supabase/migrations/202610010001_single_admin_google.sql:1-18`: `public.is_dormiqa_admin()` hardcodes `buildsafe247@gmail.com` with Google identity.
  - `server.ts:540`: `requireAdminAuth` hardcodes `email !== 'buildsafe247@gmail.com'`.
  - Multi-admin endpoints (`/api/admin/administrators`) in `server.ts:1617-1765` are rendered non-functional because secondary admins cannot pass `requireAdminAuth`.
- **Privilege Escalation Protection**:
  - `supabase/migrations/202610010003_agent_listing_authorization.sql:19-45`: Trigger `prevent_client_admin_escalation()` independently blocks non-admin clients from setting `role = 'admin'` or granting `isVerifiedAgent = 'true'` / `businessVerificationStatus = 'approved'`.
- **Listing Ownership & Tampering**:
  - `supabase/migrations/202609300001_app_documents.sql:143-176`: RLS enforces that updates to listings can only be performed by the agent who owns the listing (`data->>'agentId' = auth.uid()::text`).
  - Restrictive policy `Verified agents create pending listings` in `202610010003` independently prevents unverified agents from creating listings in Supabase.

## Theme C: Listings Lifecycle
- **Compulsory Front Photo**:
  - Enforced client-side in `AddListingModal.tsx:227, 250` and `src/utils/uploadHostelListing.ts:124`.
  - Enforced server-side in `server.ts:1107`.
  - NOT enforced in Supabase database schema or RLS policies.
- **Video Max 50 MB**:
  - Enforced client-side in `src/utils/imageUpload.ts:152` and `src/utils/uploadHostelListing.ts:128`.
  - NOT enforced in server-side API (`server.ts:1109` only checks string type).
  - Storage bucket `listing-media` has `file_size_limit = 104857600` (100 MB), allowing direct Supabase storage uploads up to 100 MB.
- **Listing Correction & Resubmission**:
  - `EditUnitStatusAndSalesModal.tsx:71-87` only allows updating title, address, description, pricing, and unit status.
  - Photos and videos cannot be updated once a listing is created.
  - Rejection status (`status: 'rejected'`) cannot be reset back to `pending` by the agent to request re-inspection.

## Theme D: Onboarding & Verification
- **Student Profile**:
  - Google OAuth prefill (`OnboardingPage.tsx:180-250`).
  - Profile completion guard in `App.tsx:273` requires university, level, and phone before dashboard access.
- **Agent Verification**:
  - Fields present: Full Name, Business Name, Business Address, Hostel Management Info, Relationship, Proof Type, Document Upload, Face Photo (`BusinessVerificationPage.tsx:71-90`).
  - Missing field: Dedicated "State of Work" (Nigeria state selector) is not present as a separate field; only referenced in placeholders.
  - WhatsApp field is merged with phone number rather than collected separately.

## Theme E: Messaging
- **Unread Counter Architecture Flaw**:
  - `server.ts:1405` maintains a single `conversationData.unreadCount` integer.
  - `src/components/ChatDrawer.tsx:32` resets `unreadCount: 0` upon opening.
  - Opening the drawer as the sender resets the unread count globally, clearing unread badges for the recipient.

## Theme F: Saved Listings
- Saved listing IDs stored in `users[uid].data.savedListingIds` array and duplicated in `localStorage`.
- No relational FK or DB constraint; when a listing is deleted, orphaned IDs remain in the user's document.

## Theme G: File Storage
- `listing-media`: Public, 100 MB limit, allows image/video. Insert policy permits any authenticated user.
- `verification-documents`: Private, 20 MB limit. Restricted to owner (`owner_id = auth.uid()`) and admin (`public.is_dormiqa_admin()`).
- Agent portrait photo is stored in the public `listing-media` bucket (`src/utils/imageUpload.ts:96`), while CAC documents are stored in private `verification-documents`.

## Theme H: Security & Secrets
- `SUPABASE_SERVICE_ROLE_KEY` present in `.env.local:7` [SECRET DETECTED — DO NOT DISPLAY VALUE].
- Hardcoded Supabase anon JWT in `src/services/supabase.ts:4` and `server.ts:21`.
- Firebase API key in `firebase-applet-config.json:4` [SECRET DETECTED — DO NOT DISPLAY VALUE].
- `server.ts:24` falls back to anon key if service role key is absent: `const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey`.

## Theme I: State, Errors & Performance
- **Bundle Size**: Monolithic production JS bundle is **1,790.00 kB**.
- **In-Memory Filtering**: `server.ts:963` fetches ALL listings into Node memory before applying filter parameters.
- **N+1 Commute Queries**: `TravelModeBar.tsx` invokes individual route queries per property card on render.

## Theme J: UI/UX & Responsiveness
- Theme switcher exists (`light`, `dark`, `system`).
- 68 instances of heavy frosted glass (`backdrop-blur`).
- Excessive color tokens (amber, rose, slate) diverging from the pure black, white, and emerald green design identity.

## Theme K: Build & Deployment
- `npm run build`: Successful, but generates 6 `empty-import-meta` warnings in esbuild CJS bundle.
- `npm audit`: 1 High severity vulnerability in `source-map-js`.
- `vercel.json`: Wildcard rewrite may catch `/api/*` if not explicitly routed.

## Theme L: Code Quality & Legacy
- **Campora**: 10 remnants in `ThemeContext.tsx`, `App.tsx`, `.env.example`, `server.ts`.
- **Firebase**: Multiple unused files (`firebase-applet-config.json`, `firebase-blueprint.json`, `firestore.rules`, `src/services/firebase.ts`).
