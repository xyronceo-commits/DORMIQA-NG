# Dormiqa

Dormiqa is a verified student accommodation platform connecting tertiary students directly with verified property hosts and caretakers near campus gates in Nigeria.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env.local`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Building & Production
1. Build the application:
   ```bash
   npm run build
   ```
2. Start production server:
   ```bash
   npm start
   ```

## Architecture
- **Frontend**: React, TypeScript, Tailwind CSS, Vite.
- **Backend**: Express.js server (`server.ts`) with Supabase PostgreSQL database and Supabase Auth.
