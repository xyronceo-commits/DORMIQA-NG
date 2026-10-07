# Phase 0 — Discovery Notes

## 1. Stack Inventory
- **Framework & Runtime**: React 19.0.1, React DOM 19.0.1, Node.js (v22 / ESNext), Express 4.21.2 (for server-side APIs & dev Vite middleware mode via `tsx 4.21.0`).
- **Build Tool**: Vite 6.2.3, `@vitejs/plugin-react` 5.0.4, `esbuild` 0.25.0 (for bundling `server.ts` to `dist/server.cjs`).
- **Language**: TypeScript 5.8.2 (`tsconfig.json`: `target: ES2022`, `jsx: react-jsx`, `moduleResolution: bundler`, `paths: { "@/*", "firebase/*" }`).
- **UI / CSS System**: Tailwind CSS v4.1.14 (`@tailwindcss/vite` 4.1.14, `@import "tailwindcss";` in `src/index.css`), Lucide React 0.546.0 (`lucide-react`), Motion 12.23.24 (`motion`), Leaflet 1.9.4 (`leaflet`, `@types/leaflet`).
- **Authentication**: Supabase Auth (`@supabase/supabase-js` 2.53.0) via `src/services/supabase.ts` and compatibility adapter `src/firebase/auth.ts`. Google OAuth for students & admin (`buildsafe247@gmail.com`), email/password for agents.
- **Database**: Supabase PostgreSQL (`https://iqnvfklvjfuzpxmifhfv.supabase.co`) with single JSONB document store pattern in `public.app_documents`. Client and server interface via Firestore-syntax adapter `src/firebase/firestore.ts`.
- **Storage**: Supabase Storage (`@supabase/supabase-js`) via adapter `src/firebase/storage.ts`:
  - `listing-media` bucket: public, 100 MB limit (SQL migration 0001: line 226).
  - `verification-documents` bucket: private, 20 MB limit (SQL migration 0004: line 2).
- **Hosting & Deployment**: Vercel configuration in `vercel.json` (`rewrites: [{ source: "/(.*)", destination: "/index.html" }]`), serverless handler in `api/[...path].ts` mounting `server.ts` Express application.
- **Third-Party & AI Services**:
  - LLM Anti-Fraud & Document Verification in `server.ts` (Groq API, OpenRouter, OpenAI, and `@google/genai` 2.4.0).
  - Open Source Routing Machine (OSRM) at `https://router.project-osrm.org` with local Haversine fallback for student commute walking/driving/cycling calculation (`server.ts:811`).
- **State Management**: React component state (`useState`, `useEffect`), Custom ThemeContext (`src/context/ThemeContext.tsx`), local cache Map (`src/services/cache.ts`), localStorage persistence for theme and saved lodgings.
- **Routing**: Custom state/history routing in `src/App.tsx` and `src/utils/routing.ts` (`parseRouteFromUrl`, `pushViewUrl`, `pushPropertyUrl`) listening to `window.location.pathname` and `popstate` events.
- **Form / Validation**: Hand-rolled React state validation in modals (`AddListingModal.tsx`, `BusinessVerificationPage.tsx`, `EditUnitStatusAndSalesModal.tsx`, `BookInspectionModal.tsx`).

## 2. Leftover Firebase Usage
- `package.json`: Does NOT contain `firebase` package in dependencies.
- `vite.config.ts` (lines 20–25) and `tsconfig.json` (lines 24–29): Route all `'firebase/*'` imports to custom adapters in `src/firebase/*`.
- `firebase-applet-config.json`: Leftover AI Studio Firebase config file containing `projectId: "dormiqa-e16b8"` and `apiKey` [SECRET DETECTED — DO NOT DISPLAY VALUE].
- `firebase-blueprint.json` & `firestore.rules`: Leftover Firestore rules and schema definitions from early development.
- `src/services/firebase.ts`: 1,062 lines of wrapper code importing `firebaseConfig from '../../firebase-applet-config.json'` and delegating to `./supabase` and `./src/firebase/*`.
- `server.ts` (line 8): Imports `configureFirestoreClient` from `./src/firebase/firestore` and references `firestoreDb`, `getFirestoreUsers`, `getFirestoreListings`, `getFirestoreInspections`.
