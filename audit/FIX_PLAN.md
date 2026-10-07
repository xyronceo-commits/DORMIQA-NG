# DORMIQA — REMEDIATION & FIX PLAN

This plan proposes an engineered, prioritized roadmap to address the vulnerabilities, architectural gaps, performance bottlenecks, and technical debt identified during the full codebase audit.

> **CRITICAL NOTICE**: In accordance with the audit guidelines, no code changes or upgrades have been performed. All items below are proposed plans only.  
> **Awaiting approval before any changes.**

---

## Batch 1: Security & Credentials Hardening (Priority 1)

### 1.1 Secure Credentials & Key Isolation
- **Target**: `DORM-SEC-01`, `DORM-SEC-03`, `DORM-SEC-04`, `DORM-SEC-05`
- **Actions**:
  1. Remove `.env.local` containing `SUPABASE_SERVICE_ROLE_KEY` from git tracking and verify `.gitignore` covers all `.env*.local` variations.
  2. Rotate the Supabase service role key in the live Supabase Dashboard.
  3. Remove hardcoded fallback anon JWT strings from `src/services/supabase.ts:4` and `server.ts:21`. Replace with strict environment checks that fail fast on boot if keys are missing.
  4. In `server.ts:24`, eliminate the dangerous fallback `supabaseServiceRoleKey = ... || supabaseAnonKey`.
  5. Archive or decommission `firebase-applet-config.json` and revoke the legacy Firebase API key.
- **Dependencies**: None. Can be executed immediately.

### 1.2 True Server-Side Session Expiry Enforcement
- **Target**: `DORM-SEC-02`
- **Actions**:
  1. Transition the 12-hour expiration from client-side `localStorage` to server-side session validation.
  2. Configure Supabase Auth JWT and refresh token expiry, or store an `issued_at` / `last_active_at` timestamp in user session metadata validated by `requireSupabaseUser` in `server.ts`.
  3. Ensure token rejection is handled cleanly with a 401 response and redirect to `/onboarding`.
- **Dependencies**: Batch 1.1.

---

## Batch 2: Core Functional & Architectural Fixes (Priority 2)

### 2.1 Independent Participant Unread Tracking in Messaging
- **Target**: `DORM-ARC-01`
- **Actions**:
  1. Refactor conversation data model in `server.ts:1340, 1405` to replace single `unreadCount` with:
     ```ts
     studentUnreadCount: number;
     agentUnreadCount: number;
     ```
  2. When a student sends a message, increment `agentUnreadCount`. When an agent sends a message, increment `studentUnreadCount`.
  3. In `src/components/ChatDrawer.tsx:32`, reset only the active user's unread counter (`studentUnreadCount: 0` if student, `agentUnreadCount: 0` if agent).
- **Dependencies**: None.

### 2.2 Complete Agent Verification Fields
- **Target**: `DORM-ARC-05`
- **Actions**:
  1. Add a dedicated "State of Work" (Nigerian state select dropdown) to `src/components/BusinessVerificationPage.tsx` and persist it in `BusinessVerificationDetails.stateOfWork`.
  2. Separate the "Phone" and "WhatsApp" inputs into two explicit fields to satisfy agent contact verification requirements.
- **Dependencies**: None.

### 2.3 Listing Resubmission & Media Correction Workflow
- **Target**: `DORM-ARC-06`
- **Actions**:
  1. Update `EditUnitStatusAndSalesModal.tsx` to support replacing photos (including required front photo) and property video.
  2. Add a "Resubmit for Verification" button when viewing a listing with `status === 'rejected'`, resetting `status = 'pending'`, `verificationStatus = 'pending'`, and clearing `rejectionReason`.
  3. Update `server.ts` to allow verified agents to patch their own rejected listings back to pending state.
- **Dependencies**: Batch 1.1.

### 2.4 Vercel Serverless Routing Alignment
- **Target**: `DORM-VERC-01`
- **Actions**:
  1. Update `vercel.json` rewrites to explicitly bypass `/api/(.*)` routes so that serverless requests pass cleanly to `api/[...path].ts`:
     ```json
     {
       "rewrites": [
         {
           "source": "/((?!api/).*)",
           "destination": "/index.html"
         }
       ]
     }
     ```
- **Dependencies**: None.

---

## Batch 3: Database & Storage Policy Hardening (Priority 3)

### 3.1 Database Constraint for Compulsory Front Photo
- **Target**: `DORM-ARC-02`
- **Actions**:
  1. Create a new Supabase migration adding a PostgreSQL check or RLS validation rule to `public.app_documents` for `collection = 'listings'`:
     ```sql
     and jsonb_array_length(data->'photos') >= 1
     ```
  2. Ensures direct Supabase API access cannot circumvent client validation.
- **Dependencies**: Batch 1.1.

### 3.2 Align Storage Bucket File Size Limit to 50 MB
- **Target**: `DORM-ARC-03`
- **Actions**:
  1. Create a migration updating `storage.buckets` for `id = 'listing-media'`:
     ```sql
     update storage.buckets
     set file_size_limit = 52428800 -- 50 MB
     where id = 'listing-media';
     ```
- **Dependencies**: None.

### 3.3 Dynamic Multi-Admin Authorization Architecture
- **Target**: `DORM-ARC-04`
- **Actions**:
  1. Migrate `public.is_dormiqa_admin()` from the hardcoded `buildsafe247@gmail.com` check to read from a secure `admin_users` table or Supabase `auth.users.raw_app_meta_data->>'role' = 'admin'`.
  2. Update `server.ts` `requireAdminAuth` to dynamically check the user's role claim rather than matching a single string literal.
- **Dependencies**: Batch 1.1.

---

## Batch 4: Performance, Build & Dependency Optimization (Priority 4)

### 4.1 Bundle Splitting & Code Separation
- **Target**: `DORM-PERF-01`
- **Actions**:
  1. Refactor circular static imports of `src/firebase/firestore.ts` and `src/services/firebase.ts` across modal components.
  2. Use `React.lazy()` for heavy dashboard views (`AdminDashboard`, `AgentDashboard`, `StudentDashboard`).
  3. Configure Rollup `output.manualChunks` in `vite.config.ts` for Leaflet, Lucide, and Motion.
- **Dependencies**: None.

### 4.2 Batch Commute Route Requests
- **Target**: `DORM-PERF-02`
- **Actions**:
  1. Refactor `TravelModeBar.tsx` on property cards to utilize the existing `POST /api/routes-batch` endpoint rather than dispatching individual HTTP requests per listing card.
- **Dependencies**: None.

### 4.3 Database-Level Listing Filtering
- **Target**: `DORM-PERF-03`
- **Actions**:
  1. Refactor `GET /api/listings` in `server.ts` to push query filters (`universityId`, `status`, price) into Supabase PostgreSQL query clauses rather than pulling all documents into Node memory.
- **Dependencies**: None.

### 4.4 Dependency Vulnerability Fix
- **Target**: `DORM-DEP-01`, `DORM-DEP-02`
- **Actions**:
  1. Run targeted vulnerability resolution for `source-map-js`.
  2. Test and upgrade outdated dependencies in a staging branch.
- **Dependencies**: None.

---

## Batch 5: Cleanup & UX Polish (Priority 5)

### 5.1 Remove Legacy "Campora" References
- **Target**: `DORM-LEG-01`
- **Actions**:
  1. Replace all legacy localStorage keys (`campora_theme`, `campora_saved_ids`, `campora_is_logged_in`) with `dormiqa_*` equivalents in `ThemeContext.tsx` and `App.tsx`.
  2. Remove `CAMPORA_API_KEY` from `.env.example` and `server.ts`.
- **Dependencies**: None.

### 5.2 Decommission Dead Firebase Artifacts
- **Target**: `DORM-LEG-02`
- **Actions**:
  1. Safely remove unused `firestore.rules`, `firebase-blueprint.json`, and `firebase-applet-config.json`.
  2. Streamline `src/services/firebase.ts` into a clean Supabase service layer.
- **Dependencies**: Batch 1.1.

### 5.3 UI Identity Token Consolidation
- **Target**: `DORM-UI-01`
- **Actions**:
  1. Audit and reduce 68 instances of heavy frosted-glass styling (`backdrop-blur`) to clean, performant solid borders and neutral backgrounds.
  2. Harmonize badge and action colors to the strict black, white, and emerald green design identity.
- **Dependencies**: None.

---

Awaiting approval before any changes.
