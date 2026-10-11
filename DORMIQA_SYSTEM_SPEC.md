# Dormiqa System Specification & Operational Architecture

**Platform:** Dormiqa Nigeria — Verified Student Accommodation Marketplace  
**Engine:** Supabase (PostgreSQL, Supabase Auth, Storage, Realtime) + Express.js API  
**Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons  
**Version:** 2.4.0 (Production Release)  
**Status:** Live on Supabase & UNIOSUN Launch Campus  

---

## 1. Executive Summary & Brand Purpose

Dormiqa is Nigeria’s dedicated digital student housing marketplace connecting undergraduate and postgraduate students in Nigerian public tertiary institutions with verified property hosts, caretakers, and property managers operating near campus gates.

The platform eliminates student housing scams, upfront illegal viewing fees, and insecure off-campus accommodation arrangements through:
- Direct campus-gate walking radius filtering (e.g., within 5, 8, or 10 minutes to lecture halls and campus gates).
- Free, in-person physical lodge inspections scheduled directly through verified caretakers.
- Strict anti-fraud, anti-extortion policies enforced under Nigerian legal standards.
- A centralized university directory strictly dedicated to public tertiary institutions.

---

## 2. Infrastructure & Database Engine: Supabase Standard

The system architecture runs on **Supabase** as its core backend and database provider:

### 2.1 Supabase Services in Production
- **PostgreSQL Database:** Relational data storage with strict foreign keys, indexing, and Row Level Security (RLS) policies.
- **Supabase Authentication:**
  - Email & Password sign-up and sign-in with automated verification flows.
  - Google OAuth integration with client-side credential passing.
  - JWT token verification for protected API routes.
- **Supabase Storage:**
  - `hostel-images`: Public-read bucket for room, lodge, bathroom, and compound photography.
  - `verification-docs`: Private bucket for agent NIN identity documents and CAC business registration certificates.
- **Supabase Realtime:**
  - WebSocket channels for instant student-caretaker chat messaging.
  - Real-time lodge inspection status updates and calendar synchronization.

### 2.2 Express.js REST API Proxy (`server.ts`)
Running in tandem with Vite middleware, `server.ts` exposes high-performance endpoints:
- `GET /api/universities`: Serves the verified 184 public higher institutions directory with sub-millisecond in-memory and client-side caching.
- `POST /api/waitlist`: Captures prospective student and agent waitlist registrations for expansion campuses.
- `GET /api/listings`: Filtered accommodation listings based on institution, campus town, max price, and walking distance.
- `POST /api/inspections`: Booking engine for free lodge inspections.
- `POST /api/auth/*`: Session handling and user profile synchronization.

---

## 3. Institutional Policy & 184 Public Higher Institutions Directory

### 3.1 Strict Public Institution Mandate
In accordance with platform governance, Dormiqa lists **exclusively public tertiary institutions**. Private universities are strictly excluded:
- **Zero Private Universities:** No private institutions are featured on Dormiqa.
- **184 Public Higher Institutions:** A complete, curated registry of Nigerian Federal Universities, State Universities, Federal Polytechnics, State Polytechnics, and Public Colleges of Education.

### 3.2 Categorized Breakdown
1. **Federal Universities (53 Institutions):**
   - University of Lagos (UNILAG), University of Ibadan (UI), Obafemi Awolowo University (OAU), University of Benin (UNIBEN), University of Nigeria Nsukka (UNN), Ahmadu Bello University (ABU) Zaria, Federal University of Technology Akure (FUTA), Federal University of Technology Minna (FUTMINNA), University of Ilorin (UNILORIN), University of Port Harcourt (UNIPORT), Bayero University Kano (BUK), Federal University of Agriculture Abeokuta (FUNAAB), University of Jos (UNIJOS), University of Calabar (UNICAL), Federal University Oye-Ekiti (FUOYE), and all other accredited federal universities.
2. **State Universities (63 Institutions):**
   - **Osun State University (UNIOSUN) [ACTIVE LAUNCH CAMPUS]**
   - Lagos State University (LASU), Olabisi Onabanjo University (OOU), Ekiti State University (EKSU), Kwara State University (KWASU), Delta State University (DELSU), Plateau State University (PLASU), Adekunle Ajasin University (AAUA), Kaduna State University (KASU), Rivers State University (RSU), Ambrose Alli University (AAU) Ekpoma, Chukwuemeka Odumegwu Ojukwu University (COOU), and all other state-chartered universities.
3. **Federal Polytechnics (40 Institutions):**
   - Yaba College of Technology (YABATECH), Federal Polytechnic Ilaro, Federal Polytechnic Ado-Ekiti, Federal Polytechnic Ede, Federal Polytechnic Nekede, Federal Polytechnic Bida, Federal Polytechnic Offa, Federal Polytechnic Oko, Kaduna Polytechnic (KADPOLY), and other federal polytechnics nationwide.
4. **State Polytechnics (20 Institutions):**
   - The Polytechnic Ibadan, Lagos State Polytechnic (LASUSTECH), Osun State Polytechnic Iree, Rufus Giwa Polytechnic Owo, Moshood Abiola Polytechnic (MAPOLY) Abeokuta, Kwara State Polytechnic Ilorin, and other accredited state polytechnics.
5. **Public Colleges of Education & Specialized Institutes (8 Institutions):**
   - Federal College of Education Akoka, Osun State College of Education Ilesa, Alvan Ikoku Federal College of Education Owerri, Adeyemi Federal University of Education Ondo, Federal College of Education (Special) Oyo, and allied public educational institutions.

---

## 4. Active Launch Campus Strategy: Osun State University (UNIOSUN)

### 4.1 Exclusive Operational Status
**Osun State University (UNIOSUN) is currently the ONLY active, operational, and live university on Dormiqa.**

All active lodge listings, physical inspection schedules, and verified caretaker networks are currently live across UNIOSUN's six multi-campus towns:
1. **Osogbo Main Campus:** Oke-Baale Axis, Technical Road, Dada Estate, College of Health Sciences.
2. **Ejigbo Campus:** College of Agriculture, Inisa Road, General Hospital Area.
3. **Okuku Campus:** College of Management and Social Sciences, Offa Road, Palace Axis.
4. **Ikire Campus:** College of Humanities and Culture, Ibadan-Ife Expressway Axis.
5. **Ifetedo Campus:** College of Law, Garage Axis, Oke-Amola.
6. **Ipetu-Ijesha Campus:** College of Education, Ilesa Road.

### 4.2 Active UNIOSUN Features
- Real-time lodge availability with verified rental rates (₦120,000 to ₦450,000/year).
- Walking distance calculator calibrated to campus entrance gates.
- Free, in-person inspection bookings with zero advance viewing fees.
- Verified local caretaker direct WhatsApp and in-app chat connections.

---

## 5. Upcoming Institutions & Priority Campus Waitlist (183 Institutions)

Every non-launch public institution (183 schools) is configured in **Coming Soon** status:

### 5.1 "Preferred School" Dropdown UI Experience
In the onboarding and profile configuration screens (`src/components/UniversitySelector.tsx`):
- **Available Now (Active Campus):**
  - Osun State University (UNIOSUN) is featured prominently at the top with a vibrant emerald badge (`Active Campus • Available Now`).
- **Coming Soon (183 Institutions):**
  - Grouped into organized expandable/searchable categories:
    - *Upcoming Federal Universities*
    - *Upcoming State Universities*
    - *Upcoming Polytechnics & Colleges*
  - Marked with amber "Coming Soon" badges.

### 5.2 Interactive Priority Waitlist Modal
Clicking any upcoming institution triggers the Priority Campus Waitlist Modal:
- Displays institution name, city, state, and category.
- Collects student/agent contact details (Email and WhatsApp phone number).
- Submits alert subscription to `/api/waitlist`.
- **Immediate Action Option:** Features a primary button: **"Select Osun State University (UNIOSUN) Instead"** which instantly sets UNIOSUN as the active school and closes the modal, enabling the student to continue registration with zero friction.
- External survey link provided for detailed student housing demand analytics.

---

## 6. Student Onboarding & Account Registration Flow

To guarantee that new student accounts can be created smoothly without errors:

1. **Default Preselection:** The student registration form defaults to `uniosun` (Osun State University).
2. **Defensive Fallback Mechanism:**
   - If university data is loading or temporarily filtered, `OnboardingPage.tsx` automatically resolves `uniosun` fallback data to avoid `undefined` crashes.
   - Submissions made with an upcoming school gracefully prompt the student with the choice to either join that school's waitlist or switch to UNIOSUN to begin browsing right away.
3. **Google Authentication Integration:**
   - First-time Google sign-ins prompt for the student's phone number and preferred university (with UNIOSUN preselected as active).
4. **Seamless Role Selection:**
   - Students can choose between **"I'm a Student Looking for Housing"** and **"I'm an Agent / Caretaker Listing Properties"**.

---

## 7. Caretaker & Property Agent Standards

Dormiqa maintains a zero-tolerance fraud policy for student housing:
- **NIN & CAC Verification:** Caretakers must provide valid identification before listings go live.
- **Physical Verification:** Campus ambassadors verify property coordinates, electricity availability, water source, and fence security.
- **No Viewing Fees:** Agents who demand viewing fees or advance payment prior to physical lodge inspection are permanently banned.

---

## 8. Summary of File Architecture

| File Path | Description |
|:---|:---|
| `README.md` | General overview, quick-start guide, and feature matrix |
| `DORMIQA_SYSTEM_SPEC.md` | Comprehensive operational specification and policy architecture |
| `src/data/publicUniversities.ts` | Complete registry of 184 Nigerian public institutions (0 private) |
| `src/components/UniversitySelector.tsx` | Preferred School searchable dropdown with UNIOSUN active & Coming Soon waitlist |
| `src/components/OnboardingPage.tsx` | Student/Agent sign-up & sign-in with guarded school selection |
| `src/components/ComingSoonPage.tsx` | Standalone upcoming campus waitlist screen with quick switch to UNIOSUN |
| `src/services/supabase.ts` | Production Supabase client configuration |
| `server.ts` | Express REST API server providing `/api/universities`, `/api/waitlist`, `/api/listings` |
| `metadata.json` & `index.html` | Synced application metadata, OpenGraph cards, and SEO configuration |

---
*Dormiqa Technologies Limited — Building transparent, secure, and dignified student housing across Nigeria.*
