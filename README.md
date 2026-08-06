# Campora — Verified Off-Campus Student Accommodation Platform

<p align="center">
  <img src="/public/campora-logo.svg" alt="Campora Logo" width="180" />
</p>

**Campora** is Africa’s leading digital marketplace technology platform connecting tertiary institution students directly with verified property hosts, estate caretakers, and landlords near university campus gates.

---

## 🌟 Overview & Core Value Proposition

Finding safe, affordable, and honest off-campus housing near African university gates has historically been fraught with fake listings, unverified middle-men, extortionate viewing fees, and lack of transparency.

**Campora transforms student accommodation hunting into a seamless, transparent experience.** By combining verified agent credentials, precise campus gate walking distance calculations, and scheduled physical inspection tools, Campora empowers students to secure ideal lodges with total peace of mind.

> **CRITICAL LEGAL NOTICE:** Campora operates strictly as a technology intermediary platform and venue. Campora does **not** own, rent, manage, or process payments for accommodation. All tenancy agreements, house inspections, and rent payments are executed directly between the student and the verified agent or landlord.

---

## 🚀 Key Features & Capabilities

### 🎓 For University Students
- **Campus Gate Walking Radius Search:** Filter hostels and self-contain apartments by walking minutes directly to specific university gates (e.g. UNILAG Main Gate, OAU Asherifa Gate, UI Sub Gate).
- **100% Free Physical Inspection Scheduling:** Pick preferred dates and times to view lodges in-person with verified caretakers without paying advance viewing fees.
- **In-App Verified Messaging & Chat:** Communicate directly with agents and schedule viewings securely.
- **AI Housing Assistant (Gemini-Powered):** Ask natural language queries like *"Find me a self-contain under ₦400,000 within 10 mins walk to UNILAG gate with 24/7 power."*
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
- **Complete Information Center:** Dedicated, searchable documentation hub for Terms, Privacy, Cookie Policy, Acceptable Use, Agent/Student Terms, Disclaimers, Verification Standards, and Help Center FAQs.

---

## 🛠️ Technology Stack & Architecture

- **Frontend Framework:** React 18 with TypeScript & Vite
- **Styling:** Tailwind CSS with fluid responsive layouts
- **Icons:** Lucide React
- **Backend & Server:** Express.js + Vite Development Middleware (`server.ts`)
- **Database & Persistence:** Firebase Firestore (Cloud Database) + Local Storage Fallbacks
- **AI Integration:** Google Gemini API (`@google/genai`) for natural language student search and AI housing assistance
- **Build & Bundle:** `esbuild` for production CommonJS bundle (`dist/server.cjs`)

---

## 📂 Directory Structure

```
├── public/
│   ├── favicon.svg             # Official Campora map pin roof logo
│   └── campora-logo.svg        # Campora logo with brand typography
├── src/
│   ├── App.tsx                 # Core App component & layout router
│   ├── main.tsx                # React DOM entrypoint
│   ├── index.css               # Global Tailwind CSS imports
│   ├── components/
│   │   ├── Navbar.tsx          # Campus switcher, role badge & header
│   │   ├── Footer.tsx          # Multi-column footer with legal doc links
│   │   ├── LandingPage.tsx     # Hero section, walking radius search & university selector
│   │   ├── InfoPagesModal.tsx  # Modal viewer for all 20+ legal & info documents
│   │   ├── StudentDashboard.tsx# Student inspections, saved lodges & roommate finder
│   │   ├── AgentDashboard.tsx  # Host property manager, appointment calendar & listings
│   │   ├── AdminDashboard.tsx  # Trust & safety moderation, agent NIN/CAC verifications
│   │   ├── AIChatbotWidget.tsx # AI student housing assistant drawer
│   │   └── ...
│   ├── data/
│   │   ├── infoPagesData.ts    # Comprehensive legal docs, terms, policies & FAQs
│   │   └── mockData.ts         # University campuses, verified listings & agents
│   └── types.ts                # TypeScript interfaces & types
├── server.ts                   # Express server entry point
├── package.json                # Project dependencies & npm scripts
├── vite.config.ts              # Vite configuration
└── README.md                   # Project documentation
```

---

## 🏁 Getting Started & Development

### Prerequisites
- Node.js 18+ or Bun
- npm or yarn package manager

### Local Installation
1. **Clone repository:**
   ```bash
   git clone https://github.com/campora/campora-applet.git
   cd campora-applet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file based on `.env.example`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

5. **Build for Production:**
   ```bash
   npm run build
   ```

6. **Start Production Server:**
   ```bash
   npm run start
   ```

---

## 🛡️ License & Legal

© 2026 Campora Technologies Limited. All rights reserved.
Campora is a registered trademark under the Federal Republic of Nigeria.
