# Phase 1 — Architecture Map Notes

## 1. Frontend Structure
- **Entry**: `index.html` -> `src/main.tsx` -> `ThemeProvider` -> `App.tsx`.
- **Routing**: Client-side state + history wrapper (`src/utils/routing.ts` & `src/App.tsx`). Listen to `popstate` and sync `activeView` and query params (`?listing=` / `/property/:id`).
- **Data Flow**:
  - Direct Supabase: `src/services/supabase.ts` initializes `@supabase/supabase-js`.
  - Compatibility Adapter: `src/firebase/firestore.ts` provides Firestore-syntax functions (`collection`, `doc`, `getDocs`, `getDoc`, `setDoc`, `updateDoc`, `onSnapshot`) that query `public.app_documents` table in Supabase via `@supabase/supabase-js`.
  - Backend API: `src/services/api.ts` makes `fetch('/api/...')` with `Authorization: Bearer <token>`.
- **Global Contexts / Stores**: `ThemeContext.tsx` (`theme`, `effectiveTheme`). No Redux, Zustand, or TanStack Query. State is managed via `useState` and propagated down via props.

## 2. Backend & Serverless API
- `server.ts`: Express application with endpoints:
  - System: `GET /api/health`
  - Universities: `GET /api/universities`
  - Commute: `GET /api/route`, `POST /api/routes-batch` (calls OSRM or Haversine fallback)
  - Listings: `GET /api/listings`, `GET /api/listings/:id`, `POST /api/listings`, `POST /api/listings/:id/reviews`, `PATCH /api/listings/:id/status-and-sales`
  - Inspections: `GET /api/inspections`, `POST /api/inspections`, `PATCH /api/inspections/:id/status`
  - Messaging: `GET /api/conversations`, `POST /api/conversations/start`, `GET /api/conversations/:id/messages`, `POST /api/conversations/:id/messages`
  - Reports: `GET /api/reports`, `POST /api/reports`
  - AI: `POST /api/ai/verify-agent`
  - Admin: `POST /api/admin/check-authorized`, `POST /api/admin/login`, `GET /api/admin/check-session`, `GET /api/admin/stats`, `GET /api/admin/agents`, `PATCH /api/admin/agents/:id/status`, `GET /api/admin/properties`, `PATCH /api/admin/properties/:id/status`, `GET /api/admin/students/overview`, `GET /api/admin/analytics`, `GET /api/admin/administrators`, `POST /api/admin/administrators`, `DELETE /api/admin/administrators`, `PATCH /api/admin/administrators/:email/role`, `POST /api/admin/logout`
  - Account: `POST /api/account/delete`
- Vercel Entry: `api/[...path].ts` imports `createExpressApp` from `../server.ts` and delegates serverless requests.

## 3. Database Schema & Policies
- **Table**: `public.app_documents (collection text, id text, data jsonb, created_at timestamptz, updated_at timestamptz, PRIMARY KEY (collection, id))`
- **GIN Index**: `app_documents_data_gin_idx` on `data`.
- **RLS Enabled**: Yes, with 8 policies in `202609300001_app_documents.sql`, 1 restrictive policy in `202610010002_uniosun_listing_market.sql`, and 1 restrictive policy in `202610010003_agent_listing_authorization.sql`.
- **Triggers**:
  - `app_documents_updated_at`: updates `updated_at`.
  - `app_documents_protect_client_privileges`: runs `prevent_client_admin_escalation()` on `users` / `agents` collections to prevent client elevation of `role` to `admin` or setting `isVerifiedAgent = true`.
- **Storage Buckets**:
  - `listing-media`: public, 100 MB max size.
  - `verification-documents`: private, 20 MB max size, restricted to owner and `public.is_dormiqa_admin()`.

## 4. Route Map Summary
| Path | Access | Guard Location | Redirect / Unauthorized State |
|---|---|---|---|
| `/` | Public | None | Displays `LandingPage` |
| `/search`, `/discover`, `/explore` | Public | None | Displays `SearchAndFilterBar` + listings feed |
| `/property/:id`, `/hostel/:id` | Public | `App.tsx:260-264`, `fetchListingById` | Shows listing detail or 404/PropertyUnavailableView |
| `/saved` | Authenticated | `App.tsx:307` | Redirects to `/onboarding` if unauthenticated |
| `/messages`, `/chats` | Authenticated | `App.tsx:307` | Redirects to `/onboarding` if unauthenticated |
| `/inspections` | Authenticated | `App.tsx:307` | Redirects to `/onboarding` if unauthenticated |
| `/student-dashboard` | Authenticated Student | `App.tsx:273, 307` | Redirects to `/onboarding` if incomplete profile or unauthenticated |
| `/agent-dashboard` | Authenticated Verified Agent | `App.tsx:288-297` | Redirects to `/business-verification` if pending, or `/onboarding` if not signed in |
| `/business-verification` | Authenticated Agent | `App.tsx:307` | Shows verification form or `VerificationStatusPage` if pending |
| `/agent-portal`, `/agent-landing` | Public / Guest | `App.tsx:280` | Redirects to `/agent-dash` or `/business-verification` if logged in as agent |
| `/admin`, `/admin/*` | Super Admin Only | `App.tsx:178-224`, `server.ts:540` | `AdminAccessScreen` loading -> Access Denied screen -> redirects to `/onboarding` |
| `/universities` | Public | None | Shows university directory |
| `/coming-soon` | Public | None | Shows coming-soon university waitlist screen |
| Unknown paths | Public | `parseRouteFromUrl()` | Shows `NotFoundPage` (404) |

## 5. Role-Check Inventory
- **Frontend Student**: `currentRole === 'student'`, checks email verification and profile completion.
- **Frontend Agent**: `currentRole === 'agent'`, checks `isVerifiedAgent` / `businessVerificationStatus === 'approved'`.
- **Frontend Admin**: `isAdminAuthenticated`, verified via `checkAdminSession()` returning `result.email === 'buildsafe247@gmail.com'`.
- **Database (PostgreSQL)**:
  - `public.is_dormiqa_admin()` checks `auth.users.email = 'buildsafe247@gmail.com'` with Google OAuth provider.
  - `public.is_dormiqa_verified_agent()` checks `public.app_documents` where `collection = 'users' AND id = auth.uid() AND data->>'role' = 'agent' AND data->>'businessVerificationStatus' = 'approved' AND data->>'isVerifiedAgent' = 'true'`.
  - Trigger `prevent_client_admin_escalation()` blocks any non-admin client from granting admin roles or verified agent status.
- **Backend API (`server.ts`)**:
  - `requireAdminAuth` checks Bearer token user email `email === 'buildsafe247@gmail.com'` and provider `google`.
  - `requireSuperAdminAuth` checks `adminUser.role === 'SUPER_ADMIN'`.
  - `requireSupabaseUser` checks valid Supabase Bearer token.
