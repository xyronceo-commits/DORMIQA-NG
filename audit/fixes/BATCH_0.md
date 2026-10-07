# BATCH 0 — VERIFICATION BEFORE FIXING (NO CODE CHANGES)

**Branch**: `audit-fixes`  
**Status**: COMPLETED (Read-Only Verification)  
**Date**: October 6, 2026  
**Findings Addressed**: `DORM-SEC-01`, `DORM-SEC-02`, `DORM-SEC-03`, `DORM-SEC-04`, `DORM-ARC-04`, `DORM-VERC-01`

---

## 1. Verification Results

### A. Service Role Key
- **Is `.env.local` gitignored?**
  - **CONFIRMED**: Yes. `.gitignore:10` explicitly contains `.env.local`.
- **Does `git log --all -- .env.local` show it was ever committed?**
  - **CONFIRMED**: Yes. `git log --all -- .env.local` reveals commits `768f8db` ("Add Supabase configuration to .env.local") and `6c2f28b` ("Update latest changes") in the repository history.
- **Is the file currently tracked by git?**
  - **CONFIRMED**: Yes. `git ls-files .env.local` returns `.env.local`. It was committed before `.gitignore` was configured and remains in the git tree.
- **Is the key referenced in any `VITE_*` variable or imported under `src/`?**
  - **CONFIRMED**: No. `grep -rn "SERVICE_ROLE" src/` returns 0 results. Neither `src/` nor `vite.config.ts` references the service role key in any client-facing variable.
- **Does the built `dist/` client bundle contain it?**
  - **CONFIRMED**: No. Verification of `dist/assets/*.js` confirmed that the service role key is absent from client bundle assets.

### B. Hardcoded JWT Fallbacks
- **Exact Locations**:
  1. `src/services/supabase.ts:4`: `defaultAnonKey` string literal is defined and used at line 17 as fallback for `VITE_SUPABASE_ANON_KEY`.
  2. `server.ts:21`: `defaultSupabaseAnonKey` string literal is defined and used at line 23 as fallback for `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`.
  3. `server.ts:24`: `supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey`.
- **What happens if env vars are missing in production?**
  - **CONFIRMED**:
    - If `VITE_SUPABASE_ANON_KEY` is omitted, the frontend silently falls back to the hardcoded development anon key, connecting to the development Supabase project (`iqnvfklvjfuzpxmifhfv.supabase.co`).
    - If `SUPABASE_SERVICE_ROLE_KEY` is omitted on the backend, `server.ts:24` falls back to `supabaseAnonKey`. The server does NOT fail fast; instead, administrative operations (such as user deletion, reports, admin listing inspection) silently fail with Row Level Security violations at runtime.

### C. Admin Determination
- **How admin status is decided**:
  - **CONFIRMED**: Decided **strictly by hardcoded email literal and Google identity check**, NOT by a database role.
  - SQL: `supabase/migrations/202610010001_single_admin_google.sql:1-18` checks `u.email = 'buildsafe247@gmail.com'` and `provider = 'google'`.
  - Server: `server.ts:540` checks `email !== 'buildsafe247@gmail.com' || !user.email_confirmed_at || !providers.includes('google')`.
  - Frontend: `src/App.tsx:201` checks `result.email?.trim().toLowerCase() === 'buildsafe247@gmail.com'`.
- **Does the DB or Express layer independently enforce it?**
  - **CONFIRMED**: Both independently enforce it. The PostgreSQL database enforces it in RLS policies (`Admins manage all documents`) and trigger `prevent_client_admin_escalation()`. The Express layer enforces it in `requireAdminAuth` on all `/api/admin/*` endpoints. Because both hardcode the single email literal, secondary administrators added via `/api/admin/administrators` are permanently locked out.

---

## 2. Express & Serverless Endpoint Authorization Audit

Below is the verified inventory of every endpoint in `server.ts` and `api/[...path].ts`:

| Method | Path | Validates Supabase JWT? | Derives Identity from Token? | Role / Ownership Check? | Uses Service Role Client? | Ownership / Security Analysis & Flags |
|---|---|---|---|---|---|---|
| `GET` | `/api/health` | No | N/A (Public) | None | No | Public health check. |
| `POST` | `/api/account/delete` | **Yes** (`server.ts:646`) | **Yes** (`authData.user.id`) | Deletes own account records | **Yes** (`supabaseDataClient`) | Secure. Uses token user ID; ignores client-supplied `req.body.uid`. |
| `GET` | `/api/universities` | No | N/A (Public) | None | No | Public university directory data. |
| `GET` | `/api/route` | No | N/A (Public) | None | No | Public commute calculation proxy. |
| `POST` | `/api/routes-batch` | No | N/A (Public) | None | No | Public commute batch calculation proxy. |
| `GET` | `/api/listings` | **Conditional** (`server.ts:969`) | **Yes** (if `agentId` filter provided) | Agent can only view own listings; public only views approved | **Yes** (reads from `app_documents`) | Secure. Unauthenticated requests strictly filtered to `status = 'approved'`. |
| `GET` | `/api/listings/:id` | **Conditional** (`server.ts:1062`)| **Yes** (if listing is unapproved) | If unapproved, token user ID must match `listing.agentId` | **Yes** | Secure. Prevents unapproved listing leaks to students. |
| `POST` | `/api/listings` | **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser.id`) | Verified agent only; `agentId === authenticatedUserId` | **Yes** | Secure. Verifies agent role and verified status in DB. |
| `PATCH`| `/api/listings/:id/status-and-sales`| **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser.id`) | `listing.agentId === userId` | **Yes** | Secure. Prevents updating other agents' listings. |
| `POST` | `/api/listings/:id/reviews` | **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser`) | Authenticated student | **Yes** | Uses token user identity for review author metadata. |
| `GET` | `/api/inspections` | **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser.id`) | Filtered to `studentId === userId \|\| agentId === userId` | **Yes** | Secure. Isolates inspection records to participants. |
| `POST` | `/api/inspections` | **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser`) | `studentId` forced to token `user.id` | **Yes** | Secure. Rejects client-supplied `studentId` mismatch. |
| `PATCH`| `/api/inspections/:id/status` | **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser.id`) | `insp.agentId === userId` | **Yes** | Secure. Only assigned agent can update inspection status. |
| `GET` | `/api/conversations` | **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser.id`) | Filtered to `studentId === userId \|\| agentId === userId` | **Yes** | Secure. Isolates conversation records to participants. |
| `POST` | `/api/conversations/start` | **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser`) | Forces `studentId = user.id` | **Yes** | Secure. Rejects client-supplied `studentId` mismatch. |
| `GET` | `/api/conversations/:id/messages`| **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser.id`) | Verified conversation participant | **Yes** | Secure. Blocks external users from reading messages. |
| `POST` | `/api/conversations/:id/messages`| **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser`) | Verified conversation participant | **Yes** | Secure. Sender ID taken from token; participant verified. |
| `GET` | `/api/reports` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected. |
| `POST` | `/api/reports` | **Yes** (`requireSupabaseUser`) | **Yes** (`(req).supabaseUser.id`) | Forces `reporterId = user.id` | **Yes** | Secure. Rejects spoofed reporter identity. |
| `PATCH`| `/api/admin/reports/:id/status` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected. |
| `POST` | `/api/ai/verify-agent` | **Yes** (`requireSupabaseUser`) | **Yes** | Authenticated user | No (LLM proxy) | Authenticated AI agent document audit assistant. |
| `POST` | `/api/admin/check-authorized` | No | Body email string | None (Read-only check) | No | Pre-flight boolean check (`{ authorized: true/false }`). Does not grant session. |
| `POST` | `/api/admin/login` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | No | Validates Supabase JWT before granting admin session. |
| `GET` | `/api/admin/check-session` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | No | Validates active admin session. |
| `GET` | `/api/admin/administrators` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | No | Admin-protected. |
| `POST` | `/api/admin/administrators` | **Yes** (`requireSuperAdminAuth`)| **Yes** (`buildsafe247@gmail.com`) | Super Admin only | No | Admin-protected. |
| `DELETE`| `/api/admin/administrators`| **Yes** (`requireSuperAdminAuth`)| **Yes** (`buildsafe247@gmail.com`) | Super Admin only | No | Admin-protected. |
| `PATCH`| `/api/admin/administrators/:email/role` | **Yes** (`requireSuperAdminAuth`)| **Yes** (`buildsafe247@gmail.com`) | Super Admin only | No | Admin-protected. |
| `POST` | `/api/admin/logout` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | No | Admin-protected. |
| `GET` | `/api/admin/stats` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected platform telemetry. |
| `GET` | `/api/admin/agents` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected agent management. |
| `PATCH`| `/api/admin/agents/:id/status` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected verification status update. |
| `GET` | `/api/admin/properties` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected listing audit view. |
| `PATCH`| `/api/admin/properties/:id/status`| **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected listing approval/rejection. |
| `GET` | `/api/admin/students/overview` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected student directory. |
| `GET` | `/api/admin/analytics` | **Yes** (`requireAdminAuth`) | **Yes** (`buildsafe247@gmail.com`) | Super Admin only | **Yes** | Admin-protected platform analytics. |

---

## 3. Vercel Rewrite Analysis

- **Does the rewrite actually shadow `/api/*`?**
  - In Vercel's edge routing hierarchy, serverless functions under `api/` take precedence over filesystem rewrites. However, having `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]` without an explicit negative lookahead creates two critical risks:
    1. Any API request that 404s or has a route mismatch is rewritten to `/index.html`, returning HTTP 200 with HTML instead of a JSON error response, breaking client-side `r.json()` calls with parsing errors.
    2. In local Vercel CLI emulation (`vercel dev`), wildcard rewrites frequently intercept serverless function routes unless explicitly excluded.
- **Recommendation**: **FIX in Batch 1 / Batch 3**.
  - Update `vercel.json` rewrites using a negative lookahead regex to strictly exclude the `/api/` path:
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

---

## 4. Reconciled Findings Severity Counts

The formal findings register in `/audit/FINDINGS.md` contains **23 total findings**, categorized as follows:
- **CRITICAL**: **1** (`DORM-SEC-01`: Service Role Key tracked in repo)
- **HIGH**: **9** (`DORM-SEC-02`, `DORM-SEC-03`, `DORM-SEC-04`, `DORM-ARC-01`, `DORM-ARC-06`, `DORM-DEP-01`, `DORM-VERC-01`, `DORM-LIVE-01`, `DORM-LIVE-02`)
- **MEDIUM**: **8** (`DORM-SEC-05`, `DORM-ARC-02`, `DORM-ARC-03`, `DORM-ARC-04`, `DORM-ARC-05`, `DORM-PERF-01`, `DORM-PERF-02`, `DORM-PERF-03`)
- **LOW**: **5** (`DORM-ARC-07`, `DORM-DEP-02`, `DORM-LEG-01`, `DORM-LEG-02`, `DORM-UI-01`)

---

## 5. Changes Made in Batch 0
- Created git branch `audit-fixes`.
- Created directory `/audit/fixes/`.
- Written `/audit/fixes/BATCH_0.md`.
- No code or database changes were made.

## 6. Manual Testing Verification
- Run `git branch` to confirm active branch is `audit-fixes`.
- Run `npm run build` and `npm run lint` to verify clean build baseline.

## 7. Rollback Steps
- To discard Batch 0: `git checkout main && git branch -D audit-fixes`.
