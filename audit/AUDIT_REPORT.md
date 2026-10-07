# DORMIQA — FULL CODEBASE & ARCHITECTURE AUDIT REPORT

**Date of Audit**: October 6, 2026  
**Auditor**: Senior Full-Stack Architect, Security Engineer & DevOps Reviewer  
**Audit Scope**: Read-Only Architecture, Security, Database, Performance & Code Quality Review  
**Target Application**: Dormiqa (Student Accommodation Platform)

---

## A. Project Overview

Dormiqa is a student housing and hostel accommodation platform primarily targeted at Nigerian university communities (initially launching with the Osun State University — UNIOSUN market). The platform facilitates:
1. **Students**: Discovering verified hostel accommodations, checking commute times/distances to campus, booking physical inspection appointments, saving lodgings, and communicating with caretakers/agents.
2. **Agents & Caretakers**: Registering agent profiles, undergoing business and identity verification (submitting proof documents such as CAC, storefront photo, or utility bills), creating hostel listings (with front-of-building photo and optional walkthrough video), managing unit vacancies, and coordinating inspections.
3. **Administrators**: Reviewing and approving/rejecting agent business verifications, auditing pending property listings (with AI fraud/duplicate detection checks), enforcing policy compliance, and managing platform operations.

The codebase is structured as a full-stack TypeScript application featuring a React 19 single-page application frontend and an Express 4 backend service (`server.ts`) that runs both as an AI Studio dev server with Vite middleware and as a serverless API handler (`api/[...path].ts`) for Vercel deployments. The persistent data layer is Supabase PostgreSQL using a single-table JSONB document pattern (`public.app_documents`) with a client-side Firestore-compatibility adapter layer.

---

## B. Tech Stack Inventory

| Component | Actual Technology Found in Codebase | Reference / File Evidence |
|---|---|---|
| **Frontend Framework** | React 19.0.1, React DOM 19.0.1 | `package.json:19-20` |
| **Language & Transpiler** | TypeScript ~5.8.2 (`target: ES2022`, `moduleResolution: bundler`) | `tsconfig.json:3, 13`, `package.json:34` |
| **Build & Dev Tool** | Vite 6.2.3, `@vitejs/plugin-react` 5.0.4, `tsx` 4.21.0 | `vite.config.ts`, `package.json:21, 33` |
| **Bundler for Backend** | `esbuild` 0.25.0 (compiles `server.ts` to `dist/server.cjs`) | `package.json:7, 30` |
| **UI & Styling System** | Tailwind CSS v4.1.14 (`@tailwindcss/vite`), Lucide React 0.546.0, Motion 12.23.24 | `src/index.css:1`, `package.json:14-18` |
| **Maps & Geospatial** | Leaflet 1.9.4, `@types/leaflet` 1.9.22 | `package.json:17, 26`, `src/components/InteractiveMapView.tsx` |
| **Authentication** | Supabase Auth (`@supabase/supabase-js` 2.53.0) via `src/firebase/auth.ts` | `src/firebase/auth.ts`, `src/services/supabase.ts` |
| **Database** | Supabase PostgreSQL (`public.app_documents` JSONB store) | `supabase/migrations/202609300001_app_documents.sql:3` |
| **Object Storage** | Supabase Storage (`listing-media` and `verification-documents`) | `supabase/migrations/202609300001_app_documents.sql:226`, `202610010004:1` |
| **Backend Runtime** | Express 4.21.2 (`server.ts` + Vercel serverless `api/[...path].ts`) | `server.ts`, `api/[...path].ts`, `package.json:16` |
| **Commute & Routing** | Project-OSRM (`https://router.project-osrm.org`) + Haversine fallback | `server.ts:811, 850`, `src/services/routeService.ts` |
| **AI Integration** | Groq API / OpenRouter / OpenAI / `@google/genai` 2.4.0 (Anti-fraud & verification) | `server.ts:43-110`, `package.json:12` |
| **Leftover Legacy** | Firebase config artifacts (`firebase-applet-config.json`, `firestore.rules`, `src/services/firebase.ts`) | Root & `src/services/` |

---

## C. Architecture Diagrams

### 1. Data Flow & Service Integration Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                       |
|                                                                                         |
|   +-----------------------+     +------------------------+     +--------------------+   |
|   |  React 19 Components  | <-> |  Firestore Compatibility| <-> |  Supabase Browser  |  |
|   | (App, Modals, Views)  |     | Adapter (src/firebase) |     | Client (@supabase) |   |
|   +-----------------------+     +------------------------+     +--------------------+   |
|               |                                                           |             |
|               | (Authenticated HTTP REST API via Bearer Token)            | (Direct SDK)|
+---------------|-----------------------------------------------------------|-------------+
                |                                                           |
                v                                                           v
+-------------------------------+                       +-------------------------------+
|     EXPRESS / VERCEL API      |                       |       SUPABASE CLOUD          |
|    (server.ts / api/[...path])|                       |   (PostgreSQL & Storage)      |
|                               |                       |                               |
| - /api/listings               |                       | +---------------------------+ |
| - /api/inspections            | (Service Role Client) | | Table: public.app_documents | |
| - /api/conversations          |---------------------> | | - GIN Index on data       | |
| - /api/admin/*                |                       | | - Row Level Security (RLS)| |
| - /api/ai/verify-agent        |                       | | - Triggers & Esc. Blocker | |
| - /api/route (OSRM proxy)     |                       | +---------------------------+ |
|                               |                       | +---------------------------+ |
| Anti-scam LLM + Sanitization  |                       | | Buckets:                  | |
+-------------------------------+                       | | - listing-media (public)  | |
                                                        | | - verification-documents  | |
                                                        | |   (private RLS)           | |
                                                        | +---------------------------+ |
                                                        +-------------------------------+
```

---

## D. Route Map

| Path | Access Level | Required Role | Guard Location | Redirect / Failure Behaviour |
|---|---|---|---|---|
| `/` | Public | None | None | Renders `LandingPage.tsx` |
| `/search`, `/discover`, `/explore` | Public | None | None | Renders property discovery grid and filters |
| `/property/:id`, `/hostel/:id` | Public | None | `App.tsx:260-264`, `server.ts:1050` | Displays listing detail modal; 404 skeleton if missing |
| `/saved` | Authenticated | Any signed-in user | `App.tsx:307` | Redirects to `/onboarding` if unauthenticated |
| `/messages`, `/chats` | Authenticated | Any signed-in user | `App.tsx:307` | Redirects to `/onboarding` if unauthenticated |
| `/inspections` | Authenticated | Any signed-in user | `App.tsx:307` | Redirects to `/onboarding` if unauthenticated |
| `/student-dashboard` | Authenticated | Student | `App.tsx:273, 307` | Redirects to `/onboarding` if incomplete profile or logged out |
| `/agent-dashboard` | Authenticated | Verified Agent | `App.tsx:288-297` | Redirects to `/business-verification` if unverified; `/onboarding` if logged out |
| `/business-verification` | Authenticated | Agent | `App.tsx:307` | Shows verification form or `VerificationStatusPage` if pending review |
| `/agent-portal`, `/agent-landing` | Public / Guest | Guest | `App.tsx:280` | Redirects to `/agent-dash` or `/business-verification` if logged in |
| `/admin`, `/admin/*` | Restricted | Super Admin | `App.tsx:178-224`, `server.ts:540` | `AdminAccessScreen` spinner -> Access Denied screen -> redirects to `/onboarding` |
| `/universities` | Public | None | None | Renders directory of Nigerian higher institutions |
| `/coming-soon` | Public | None | None | Renders waitlist page for non-UNIOSUN university markets |
| Unknown paths | Public | None | `src/utils/routing.ts:91` | Renders `NotFoundPage.tsx` |

---

## E. Database Map

### PostgreSQL Table: `public.app_documents`
- **Columns**:
  - `collection text NOT NULL`
  - `id text NOT NULL`
  - `data jsonb NOT NULL DEFAULT '{}'::jsonb`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `updated_at timestamptz NOT NULL DEFAULT now()`
- **Primary Key**: `(collection, id)`
- **Indexes**:
  - `app_documents_collection_idx` on `(collection)` (`202609300001:12`)
  - `app_documents_data_gin_idx` GIN index on `(data)` (`202609300001:14`)
- **Row-Level Security Policies**:
  1. `Public can read universities`: `collection = 'universities'` (`202609300001:52`)
  2. `Public can read approved listings`: `collection = 'listings' AND (data->>'verificationStatus' = 'approved' OR data->>'status' = 'approved')` (`202609300001:57`)
  3. `Users can read their own documents`: Checks user ID matching `auth.uid()`, email matching `auth.jwt()->>'email'`, or inspection/conversation participation (`202609300001:68`)
  4. `Authenticated users create own documents`: Restricts creation of users, inspections, conversations, and reports to records owned by `auth.uid()` (`202609300001:107`)
  5. `Authenticated users update own documents`: Restricts update to own documents (`202609300001:144`)
  6. `Users delete own documents`: Restricts deletion to own documents (`202609300001:197`)
  7. `Admins manage all documents`: Bypasses checks for `public.is_dormiqa_admin()` (`202609300001:211`)
  8. `Launch market listings only` (RESTRICTIVE): Restricts listings reads/writes strictly to `data->>'universityId' = 'uniosun'` (`202610010002:2`)
  9. `Verified agents create pending listings` (RESTRICTIVE): Only agents passing `public.is_dormiqa_verified_agent()` can insert listings (`202610010003:48`)
- **Functions & Triggers**:
  - Trigger `app_documents_updated_at`: Automatically sets `updated_at = now()`.
  - Trigger `app_documents_protect_client_privileges`: Runs `public.prevent_client_admin_escalation()` on insert/update of `users` / `agents` collections to block client-side promotion to admin or setting `isVerifiedAgent = 'true'` (`202610010003:43`).
  - Function `public.is_dormiqa_admin()`: Confirms email is `buildsafe247@gmail.com` with Google OAuth identity (`202610010001:1`).
  - Function `public.is_dormiqa_verified_agent()`: Checks user document has `role = 'agent'`, `businessVerificationStatus = 'approved'`, and `isVerifiedAgent = 'true'` (`202610010003:1`).

---

## F. Role & Permission Matrix

| Resource / Action | Student | Agent | Admin (`buildsafe247@gmail.com`) | Enforcement Layer (DB vs Frontend) |
|---|---|---|---|---|
| **Read Approved Listings** | Allowed | Allowed | Allowed | **DB Verified** (`app_documents` RLS policy `Public can read approved listings`) |
| **Read Unapproved / Pending Listings** | Denied | Own listings only | Allowed | **DB Verified** (RLS allows only owner or `is_dormiqa_admin()`) |
| **Create Listings** | Denied | Allowed only if verified | Allowed | **DB Verified** (`Verified agents create pending listings` restrictive RLS + `is_dormiqa_verified_agent()`) |
| **Edit Another Agent's Listing** | Denied | Denied | Allowed | **DB Verified** (RLS checks `data->>'agentId' = auth.uid()::text`) |
| **Promote Self to Admin** | Denied | Denied | N/A | **DB Verified** (Trigger `prevent_client_admin_escalation` throws SQL exception) |
| **Self-Approve Agent Verification** | Denied | Denied | Allowed | **DB Verified** (Trigger `prevent_client_admin_escalation` throws SQL exception) |
| **Read Verification Docs (CAC/NIN)** | Denied | Own docs only | Allowed | **DB Verified** (`verification-documents` bucket RLS select policy) |
| **Upload Listing Media (100 MB max)** | Allowed (Auth) | Allowed | Allowed | **DB Verified** (Storage RLS for `listing-media`) |
| **Access Admin Endpoints (`/api/admin/*`)**| Denied | Denied | Allowed | **Server Verified** (`server.ts:540` `requireAdminAuth` hardcodes email & provider) |
| **12-Hour Session Invalidation** | Client Timer | Client Timer | Client Timer | **Frontend Only** (`firebase.ts:814`, NOT enforced in Supabase DB) |

---

## G. Requirements Checklist

| Requirement | Status | Evidence (File & Line) | Notes |
|---|---|---|---|
| **1. 12-Hour Automatic Logout** | **Partial** | `src/services/firebase.ts:814-825`, `src/App.tsx:130-156` | Enforced only by client-side timer checking `localStorage`. Bypassed if key is deleted or cleared; Supabase JWT tokens remain valid on the server. |
| **2. 1 Compulsory Front Photo** | **Partial** | `src/components/AddListingModal.tsx:227, 250`, `server.ts:1107` | Enforced client-side in React form and server-side in `/api/listings` Express route. **Not enforced in Supabase DB schema/RLS**. |
| **3. Video Max 50 MB** | **Partial** | `src/utils/imageUpload.ts:152`, `src/utils/uploadHostelListing.ts:128`, `202609300001:226` | Enforced client-side (50 MB). **Not enforced in Express route** (`server.ts:1109`). Storage bucket allows **100 MB** (`104857600` bytes). |
| **4. Agent Required Verification Fields** | **Partial** | `src/components/BusinessVerificationPage.tsx:71-90, 148-156` | Has Name, Business Name, Address, Document upload, Portrait. WhatsApp is merged into Phone. **Dedicated "State of Work" field is missing**. |
| **5. Admin Removal Reason Visible to Agent** | **Met** | `src/components/AdminDashboard.tsx:571`, `src/components/AgentDashboard.tsx:472-476` | Admin specifies reason on rejection/removal; Agent dashboard displays the reason box directly on the property card. |
| **6. Unread Message Badge Persistence** | **Partial / Flawed** | `server.ts:1405`, `src/components/ChatDrawer.tsx:32` | A single integer `unreadCount` is used. Opening the conversation drawer resets count to 0 for **both** parties, clearing recipient's badge prematurely. |
| **7. Saved-Listing Isolation** | **Met** | `src/App.tsx:1071`, `202609300001:144` | Saved listings are stored in the user's private document (`users[uid].data.savedListingIds`), isolated by user RLS. |

---

## H. Key Architectural Findings Summary

1. **Client-Only 12-Hour Session Expiry (High Severity)**:
   - File: `src/services/firebase.ts:814-825`.
   - The expiration check reads `localStorage.getItem('dormiqa_user_session_' + uid)`. If an attacker removes this key or accesses the API directly, sessions never expire after 12 hours because Supabase refresh tokens continue rotating indefinitely.
2. **Global Unread Counter Wipes Cross-User Notifications (High Severity)**:
   - File: `server.ts:1405`, `src/components/ChatDrawer.tsx:32`.
   - `conversationData.unreadCount` is shared across student and agent rather than tracking `studentUnread` and `agentUnread` independently. Opening the chat drawer marks it read for both users.
3. **Storage Bucket Video Size Discrepancy (Medium Severity)**:
   - File: `supabase/migrations/202609300001_app_documents.sql:226`.
   - While client upload functions enforce 50 MB, the PostgreSQL storage bucket definition specifies `file_size_limit = 104857600` (100 MB), permitting direct 100 MB uploads to bypass the client limit.
4. **Hardcoded Single Admin Lockout (Medium Severity)**:
   - File: `server.ts:540`, `supabase/migrations/202610010001_single_admin_google.sql:1-18`.
   - Admin access is hardcoded strictly to `buildsafe247@gmail.com`. The multi-admin management endpoints (`/api/admin/administrators`) in `server.ts` cannot be utilized by any secondary administrators.
5. **Monolithic Bundle Size & Chunk Splitting Block (Medium Severity)**:
   - File: `dist/assets/index-*.js` (1,790 kB).
   - Vite warns that dynamic imports failed to split chunks because `src/firebase/firestore.ts` and `src/services/firebase.ts` are statically imported across multiple components.

---

## I. Items Needing Live Dashboard Checks

1. **Supabase Authentication Settings**:
   - Verify whether Email Provider is enabled with "Confirm Email" requirement active.
   - Verify whether Google OAuth provider is enabled and configured with correct OAuth Client ID and Secret matching the domain.
   - Verify JWT Expiry Limit (default is 3600 seconds / 1 hour) and Refresh Token Lifetime.
2. **Supabase Storage Buckets & Policies**:
   - Verify live bucket configuration for `verification-documents` is set to `public: false`.
   - Verify live bucket configuration for `listing-media` is set to `public: true`.
3. **Vercel Deployment Environment**:
   - Confirm environment variables in Vercel dashboard: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   - Check Vercel serverless function route matching: ensure `vercel.json` rewrites do not intercept `/api/*` requests intended for `api/[...path].ts`.
