# Implementation Plan — Dormiqa Unified App Flow & Routing

## Audit Summary
1. **Scattered Routing Decisions**: `App.tsx` and various components (`OnboardingPage`, `LandingPage`, etc.) make independent `setActiveView` calls, leading to flashes, repeated pages, or incorrect landing states.
2. **Missing Centralized Flow Machine**: There is no single pure function `resolveDestination(state)` mapping auth state (session, email confirmation, role, profile completion, business verification, onboarding seen) to the exact route prescribed in the user's diagram.
3. **Guest & Protected Guard Inconsistencies**: Signed-in users can sometimes view guest-only pages (landing, onboarding), and deep links are not reliably preserved or guarded across roles.

## Proposed Changes

### 1. Create `src/utils/authRouting.ts`
- Define `AuthRoutingState` and `resolveDestination(state)` as a pure function mapping exact states to target routes (`/`, `/onboarding`, `/auth/verify`, `/auth/confirmed`, `/auth/reset-password`, `/auth/complete-profile`, `/agent/verification`, `/search`, `/agent-dashboard`, `/admin-dashboard`, etc.).
- Ensure all business rules from the mermaid diagram and outcome table are fully captured.

### 2. Update `src/App.tsx` & Navigation
- Integrate `resolveDestination` into app initialization, Supabase auth state change listener, and route guards.
- Use `replaceState` (`pushViewUrl(..., true)`) for all automatic redirects so Back button history remains pristine.
- Guard guest-only and protected routes deterministically.

### 3. Verify Build & Lint
- Run `compile_applet` and `lint_applet` (`tsc --noEmit`).
