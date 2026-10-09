# BATCH 2 — CORE FUNCTIONAL & ARCHITECTURAL FIX REPORT

**Status**: COMPLETED (Awaiting Approval to proceed to Batch 3)  
**Date**: October 9, 2026  
**Findings Addressed**: `DORM-ARC-01`, `DORM-ARC-05`, `DORM-ARC-06`, `DORM-VERC-01`

---

## 1. Summary of Implementations

### 2.1 Independent Participant Unread Tracking in Messaging (`DORM-ARC-01`)
- **Root Cause Addressed**: Previously, conversations shared a single `unreadCount` integer. Whenever a message was sent or opened, both parties' counters were affected indistinctly.
- **Data Model & Backend Updates** (`src/types.ts`, `server.ts`):
  - Updated `Conversation` interface to include `studentUnreadCount?: number` and `agentUnreadCount?: number` alongside backward-compatible `unreadCount`.
  - When a student sends a message, `server.ts` and `src/services/api.ts` increment `agentUnreadCount` (and update `unreadCount`).
  - When an agent sends a message, `server.ts` and `src/services/api.ts` increment `studentUnreadCount` (and update `unreadCount`).
- **Client Read Reset Logic** (`src/components/ChatDrawer.tsx`, `src/App.tsx`):
  - In `ChatDrawer.tsx`, opening a chat resets only the active role's unread counter (`studentUnreadCount: 0` if student, `agentUnreadCount: 0` if agent).
  - In `App.tsx`, overall badge calculation now evaluates `conv.studentUnreadCount` when active user is a student, and `conv.agentUnreadCount` when active user is an agent.

### 2.2 Complete Agent Verification Fields (`DORM-ARC-05`)
- **Root Cause Addressed**: Missing explicit "State of Work" (Nigerian state) selector and combined Phone/WhatsApp fields in the business verification workflow.
- **Form & Model Enhancements** (`src/types.ts`, `src/components/BusinessVerificationPage.tsx`):
  - Added `stateOfWork?: string` and `whatsapp?: string` to `BusinessVerificationDetails`.
  - Added a dedicated Nigerian state selection dropdown covering all 36 states and the FCT (`stateOfWork`, defaulting to Osun State / UNIOSUN).
  - Separated the previously combined contact input into two distinct fields:
    1. **Direct Phone Number**: Verified phone call number for voice contact.
    2. **WhatsApp Contact Phone**: WhatsApp dialing number for student messaging.
  - Form validation enforces both phone numbers and persists `stateOfWork` and `whatsapp` to Firestore and the pending status view.

### 2.3 Listing Resubmission & Media Correction Workflow (`DORM-ARC-06`)
- **Root Cause Addressed**: Agents lacked the ability to correct media (front-of-building photo, property video) on rejected listings and resubmit them for admin review.
- **Component & Backend Enhancements** (`src/components/EditUnitStatusAndSalesModal.tsx`, `src/components/ListingDetailModal.tsx`, `src/components/AgentDashboard.tsx`, `server.ts`, `src/services/api.ts`):
  - Updated `EditUnitStatusAndSalesModal.tsx` with:
    - Dedicated **Property Photos & Video Media** correction section with live previews, photo replacement (preserving compulsory front photo slot), and property walkthrough video upload (validated <= 50 MB).
    - Clear **Rejection Reason Alert Banner** showing coordinator or anti-duplicate ban explanation.
    - Added **"Resubmit for Verification"** primary action button visible when viewing a rejected listing.
  - Server & API endpoints (`PATCH /api/listings/:id/status-and-sales` in `server.ts` and `updateListingStatusAndSales` in `src/services/api.ts`):
    - Added support for `photos`, `videoUrl`, and `resubmitForVerification: true`.
    - Resubmitting cleanly resets `status = 'pending'`, `verificationStatus = 'pending'`, and clears `rejectionReason`, `isAiBanned`, and `aiBanReason`.
  - Connected direct "Edit & Resubmit" / "Correct & Resubmit" entry points from `ListingDetailModal.tsx` and `AgentDashboard.tsx` host cards.

### 2.4 Vercel Serverless Routing Alignment (`DORM-VERC-01`)
- **Configuration** (`vercel.json`):
  - Verified and confirmed `{ "source": "/((?!api/).*)", "destination": "/index.html" }` is actively configured in `vercel.json`, isolating API endpoints from SPA index capture.

---

## 2. Files Modified

1. `src/types.ts`
   - Added `whatsapp` and `stateOfWork` to `BusinessVerificationDetails`.
   - Added `studentUnreadCount` and `agentUnreadCount` to `Conversation`.
2. `server.ts`
   - Updated `POST /api/conversations/start` and `POST /api/conversations/:id/messages` with role-aware unread counts.
   - Updated `PATCH /api/listings/:id/status-and-sales` to allow updating `photos`, `videoUrl`, and resetting rejected listings back to `pending`.
3. `src/services/api.ts`
   - Updated `updateListingStatusAndSales` with `photos`, `videoUrl`, and `resubmitForVerification` support.
   - Updated `sendMessage` to increment recipient-specific unread counters.
4. `src/components/ChatDrawer.tsx`
   - Reset active participant's counter (`studentUnreadCount: 0` vs `agentUnreadCount: 0`).
5. `src/components/BusinessVerificationPage.tsx`
   - Added Nigerian `stateOfWork` selector and separated direct phone from WhatsApp contact.
6. `src/components/EditUnitStatusAndSalesModal.tsx`
   - Added media replacement grid (photos + video walkthrough) and "Resubmit for Verification" workflow for rejected listings.
7. `src/components/ListingDetailModal.tsx`
   - Added agent rejection banner and direct "Correct & Resubmit" launcher for rejected properties.
8. `src/components/AgentDashboard.tsx`
   - Displayed rejection reason and labeled action as "Correct & Resubmit" on rejected hostel cards.
9. `src/App.tsx`
   - Computed navbar/bottom-nav unread message count based on active user role.

---

## 3. Verification & Build Results

- **Type Check (`tsc --noEmit`)**: **0 errors**.
- **Lint (`npm run lint`)**: **0 errors**.
- **Production Build (`npm run build`)**: Vite bundle and Node server bundle (`dist/server.cjs`) built successfully.
- **Server Health Check**: Dev server responding with `{"status":"ok","service":"Dormiqa API"}` on port 3000.
