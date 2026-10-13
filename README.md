# Dormiqa Nigeria — Verified Student Accommodation Platform

<p align="center">
  <img src="/public/dormiqa-logo.svg" alt="Dormiqa Logo" width="180" />
</p>

**Dormiqa** is Nigeria's dedicated digital student housing marketplace connecting tertiary institution students directly with verified property hosts, estate caretakers, and landlords near campus gates.

---

## 🌟 Overview & Active Launch Strategy

### 🟢 Active Launch Campus: Osun State University (UNIOSUN)
**Osun State University (UNIOSUN) is currently the ONLY active, live, and fully available school on Dormiqa.**
- Verified lodges and hostels are actively listed across all UNIOSUN campus towns: **Osogbo Main Campus**, **Ejigbo**, **Okuku**, **Ikire**, **Ifetedo**, and **Ipetu-Ijesha**.
- Physical lodge inspection scheduling with verified caretakers is live.
- Real-time chat and student-caretaker messaging is operational.

### 🟡 Comprehensive Public Institutions Directory (184 Institutions — Coming Soon)
In strict compliance with our national institutional policy, Dormiqa cataloged **all Nigerian public tertiary institutions** excluding private universities:
- **53 Federal Universities** (UNILAG, UI, OAU, UNIBEN, UNN, ABU, FUTA, FUTMINNA, UNILORIN, etc.)
- **63 State Universities** (UNIOSUN [ACTIVE], LASU, OOU, EKSU, KWASU, DELSU, PLASU, etc.)
- **40 Federal Polytechnics** (Yaba College of Technology, Federal Poly Ilaro, Ado-Ekiti, Ede, Nekede, etc.)
- **20 State Polytechnics** (The Polytechnic Ibadan, Lagos State Poly/LASUSTECH, Osun State Poly Iree, etc.)
- **8 Public Colleges of Education / Specialized Institutes** (Federal College of Education Akoka, Osun State College of Education Ilesa, etc.)
- **ZERO PRIVATE UNIVERSITIES** are listed on Dormiqa.

All 183 upcoming institutions feature an integrated **Priority Campus Waitlist Modal**:
- Instant in-app email or WhatsApp notification registration (`/api/waitlist`).
- External waitlist portal integration.
- Direct quick-switch option to select UNIOSUN to proceed with an active account immediately.

---

## 🚀 Key Features & Student Experience

### 🎓 For University Students
- **"Preferred School" Selector:** Clean, intuitive searchable dropdown highlighting Osun State University (UNIOSUN) under **"Available Now (Active Campus)"** with distinct green status badges. Upcoming schools are grouped under **"Coming Soon"** with instant waitlist prompts.
- **Campus Gate Walking Radius Search:** Filter student hostels and self-contain units by walking minutes (e.g. within 5, 8, or 10 minutes to campus gates).
- **Verified Property Directory:** Browse authenticated hostel lodges with detailed room specifications, upfront rates, and verified caretakers.
- **Roommate Matching Engine:** Connect with verified fellow students searching for roommates to share accommodation costs safely.
- **Saved Favorites & Listing Comparison:** Benchmark price breakdowns, caution fees, and amenities across multiple lodges.

### 🏢 For Property Agents & Caretakers
- **Tiered Verification Framework:** Complete NIN (National Identity Number) and CAC (Corporate Affairs Commission) business verification to earn the **Verified Agent** trust badge.
- **Agent Dashboard & Calendar:** Manage student inspection appointments, inquiries, and listing availability in real-time.
- **Transparent Fee Disclosures:** Clearly itemize annual rent, caution deposits, service charges, and utility structures.
- **Direct Student Lead Generation:** Connect with serious, verified students actively looking for off-campus housing every academic session.

### 🏛️ Legal & Compliance Documentation Suite
- **Terms & Conditions:** Full intermediary platform agreement compliant with Nigerian law.
- **Privacy Policy:** Data protection framework aligned with NDPA & NDPR guidelines.
- **Anti-Fraud & Anti-Extortion Policy:** Clear guidelines protecting students from advance-fee scams.
- **Complete Information Center:** Dedicated documentation hub for Terms, Privacy, Cookie Policy, Acceptable Use, Agent/Student Terms, Disclaimers, Verification Standards, and Help Center FAQs.

---

## 🛠️ Technology Stack & Architecture

- **Backend & Database:** **Supabase** (PostgreSQL, Supabase Auth, Storage, and Realtime) running in production.
- **Frontend Framework:** React 18 with TypeScript & Vite
- **Styling:** Tailwind CSS with fluid responsive layouts
- **Icons:** Lucide React
- **Server:** Express.js + Vite Development Middleware (`server.ts`)
- **API Endpoints:**
  - `GET /api/universities` — Serves the clean registry of 184 public institutions with UNIOSUN marked as active.
  - `POST /api/waitlist` — Registers student/agent campus launch alert notifications.
  - `GET /api/listings` — Filters active listings by university, price, property type, and walk duration.
  - `POST /api/auth/*` — Manages authentication and verification flows through Supabase.

---

## 📂 Key File Map

```
├── src/
│   ├── components/
│   │   ├── UniversitySelector.tsx   # Searchable preferred school dropdown with UNIOSUN active & coming-soon waitlist
│   │   ├── OnboardingPage.tsx       # Student & Agent signup/signin flow with school validation
│   │   ├── ComingSoonPage.tsx       # Standalone upcoming campus waitlist screen with quick switch to UNIOSUN
│   │   ├── UniversitiesPage.tsx     # Full directory of all 184 public higher institutions
│   │   ├── StudentDiscoverPage.tsx  # Student hostel discovery & campus gate filter
│   │   └── ...
│   ├── data/
│   │   ├── publicUniversities.ts    # 184 Nigerian public institutions (zero private universities)
│   │   └── mockData.ts              # Active UNIOSUN lodge listings & campus data
│   ├── services/
│   │   ├── supabase.ts              # Official Supabase client configuration
│   │   └── api.ts                   # Client-side API service with cache deduplication
│   └── types.ts                     # TypeScript data contracts & interfaces
├── server.ts                        # Express server entry point & REST API routes
├── supabase/
│   └── migrations/                  # SQL migration scripts for Supabase tables & RLS policies
└── README.md                        # Platform documentation & architectural specification
```

---

## 🏁 Development & Local Setup

### 1. Environment Variables
Ensure the following variables are configured in your environment or `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
ADMIN_EMAIL=buildsafe247@gmail.com
```

### 2. Run the Development Server
```bash
npm run dev
```
The application runs on `http://localhost:3000`.

### 3. Build & Verify
```bash
npm run build
npm run lint
```

---

## 🛡️ License & Legal

© 2026 Dormiqa Technologies Limited. All rights reserved.
Dormiqa is a registered trademark under the Federal Republic of Nigeria.
Operates strictly as a technology intermediary platform under Nigerian commercial law.

