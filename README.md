# SmartWaste

**Kenya's behavior-driven waste management platform.** Scan QR-coded bins, dispose waste, earn points instantly, and redeem them for airtime, vouchers, and merchandise.

Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

---

## Features

### For Individuals
- **QR Bin Scanning** — Scan any SmartWaste bin to log a disposal
- **8 Waste Categories** — Plastic, paper, metal, glass, organic, e-waste, LED bulbs, batteries (each with different point values)
- **Instant Rewards** — Points credited immediately, redeemable for airtime, vouchers, and merch
- **Streaks & Achievements** — Daily streak bonuses and milestone achievements
- **Leaderboards** — Compete by campus, estate, or community
- **CO₂ Impact Tracking** — See real-time environmental impact
- **Offline Support** — PWA with service worker for offline access

### For Institutions (Universities, Schools, Hospitals, Estates, Municipalities)
- **Admin-Approved Access** — Institutions are created by the SmartWaste admin; staff sign up and select their institution, then get approved
- **Campus Analytics** — Disposal trends, participation rates, waste category breakdowns
- **Sustainability Reporting** — CO₂ savings, waste diverted from landfill
- **Subscription Plans** — Pilot (trial), Starter, Pro, Enterprise

### For Collection Partners
- **Admin-Approved Access** — Partners apply during signup with organization details; admin approves
- **Collection Requests** — Manage bin collection schedules
- **Recovery Reports** — Log recovered waste quantities, weights, and items recycled
- **Facilitation Fees** — Track fees earned from verified waste stream coordination

### For SmartWaste Admins
- **Role Request Approvals** — Review and approve/reject institution and partner access requests
- **Institution Management** — Create and manage institutional customers
- **User Management** — View all users, suspend/unsuspend, adjust points
- **Fraud Detection** — Flagged disposal monitoring with severity levels
- **Bin Management** — Create QR-coded bins, assign to partners and institutions
- **Sponsored Campaigns** — Brand-funded environmental challenges with reward pools
- **Revenue Dashboard** — Subscription revenue, sponsorship value, and partner fee tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS 3, PostCSS, Autoprefixer |
| Icons | Lucide React |
| Charts | Recharts |
| QR Codes | html5-qrcode (scanning), qrcode (generation) |
| Backend & Auth | Supabase (PostgreSQL, Auth, Row Level Security) |
| PWA | Custom service worker, Web App Manifest |
| SEO | Structured data (JSON-LD), Open Graph, Twitter Cards, sitemap |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm (or pnpm/yarn)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The dev server starts automatically in this environment. In other environments, run `npm run dev` to start Vite.

### Build

```bash
npm run build
```

### Type Check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

---

## Project Structure

```
project/
├── public/                  # Static assets (logo, manifest, robots.txt, sitemap, service worker)
├── src/
│   ├── components/
│   │   └── Navbar.tsx       # Sidebar navigation (role-aware)
│   ├── contexts/
│   │   ├── AuthContext.tsx  # Supabase auth, profile fetching, role-request signup
│   │   └── LanguageContext.tsx  # EN/SW language toggle
│   ├── hooks/
│   │   └── useNetwork.tsx   # Online/offline detection + indicator
│   ├── lib/
│   │   └── supabase.ts      # Supabase client singleton
│   ├── pages/
│   │   ├── LandingPage.tsx       # Public marketing page
│   │   ├── AuthPage.tsx          # Login + role-selective registration
│   │   ├── UserDashboard.tsx     # Individual user home
│   │   ├── DisposalPage.tsx      # QR scan + waste logging
│   │   ├── RewardsPage.tsx      # Reward catalog + redemption
│   │   ├── LeaderboardPage.tsx   # Campus/community rankings
│   │   ├── HistoryPage.tsx       # Disposal & transaction history
│   │   ├── ProfilePage.tsx       # User profile + settings
│   │   ├── AdminDashboard.tsx   # Admin management console
│   │   ├── PartnerDashboard.tsx # Collection partner console
│   │   └── InstitutionDashboard.tsx # Institution analytics console
│   ├── types/
│   │   └── index.ts         # All TypeScript interfaces & types
│   ├── App.tsx              # Root component, routing, auth guards
│   ├── main.tsx             # Entry point, service worker registration
│   └── index.css            # Tailwind directives + custom utilities
├── supabase/
│   └── migrations/          # SQL migrations (schema, RLS, role requests)
├── index.html               # SEO meta tags, structured data, fonts
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## Database Schema

The backend is powered by Supabase (PostgreSQL with Row Level Security). Key tables:

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (extends Supabase auth.users) with role, points, streaks |
| `waste_categories` | 8 waste types with point values and CO₂ savings |
| `bins` | QR-coded smart bins with location, partner, and institution links |
| `disposals` | Individual waste disposal records (user + bin + category + points) |
| `points_transactions` | Points ledger (earn, redeem, bonus, adjust, expire) |
| `rewards` | Redeemable rewards (airtime, vouchers, merch) |
| `reward_redemptions` | User redemption records with unique codes |
| `collection_partners` | Partner organizations (collectors/recyclers) |
| `institutions` | Institutional customers with subscription plans |
| `role_requests` | Admin-approval queue for institution/partner access |
| `fraud_flags` | Flagged disposals with severity and resolution status |
| `achievements` | Milestone badges with bonus points |
| `user_achievements` | Earned achievements per user |
| `challenges` | Time-limited waste challenges with reward points |
| `sponsored_campaigns` | Brand-funded campaigns with reward pools |
| `subscriptions` | Institution subscription billing records |
| `recovery_reports` | Partner recovery logs with facilitility fees |
| `collection_requests` | Bin collection scheduling between partners and bins |

### Row Level Security

All tables have RLS enabled. Access is scoped by role:
- **Users** can read/write only their own data
- **Partners** can manage their assigned bins and recovery reports
- **Institutions** can view analytics for their own institution
- **Admins** have full access to all tables

### Role Request Flow

1. User signs up (default role: `user`)
2. During registration, selects "Institution" or "Partner" role
3. A `role_requests` row is created with status `pending`
4. Admin reviews in Admin Dashboard → Role Requests tab
5. Admin approves → user's `profiles.role` is updated and linked to the institution/partner
6. Admin rejects → user remains a regular `user`

---

## Authentication

- **Email/Password** — Default signup and login
- **Google OAuth** — One-click sign-in
- **Session Management** — Supabase handles JWT sessions with auto-refresh
- **Role-Based Routing** — After login, users are redirected to their role-specific dashboard

---

## SEO

The site includes comprehensive SEO optimization:
- **Meta tags** — Title, description, keywords, geo-targeting (Kenya)
- **Structured data** — Organization, WebApplication, and FAQ schema (JSON-LD)
- **Open Graph & Twitter Cards** — Rich social media link previews
- **robots.txt** — Allows crawling of public pages, blocks authenticated routes
- **sitemap.xml** — Lists public landing page sections
- **PWA manifest** — Installable on mobile devices
- **noscript fallback** — Content visible without JavaScript

---

## Languages

The app supports English and Swahili (`en` / `sw`) via the LanguageContext. The toggle is available in the navbar and landing page.

---

## License

Private. All rights reserved.
