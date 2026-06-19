# HireAI — AI-Powered Recruitment & Campus Placement Platform

HireAI is a full-stack hiring and placement platform that connects **job seekers**, **recruiters**, **colleges**, and **admins** in one system. It combines AI-assisted screening, coding assessments, campus drives, proctored tests, analytics, and real-time notifications.

**Live stack:** Next.js 14 (App Router) + Express backend + MongoDB + Redis + Socket.IO + Judge0 (code execution) + Groq/OpenAI (AI features).

---

## Table of Contents

1. [What HireAI Does](#what-hireai-does)
2. [Architecture](#architecture)
3. [User Roles](#user-roles)
4. [Feature Overview by Role](#feature-overview-by-role)
5. [Core Platform Features (Existing)](#core-platform-features-existing)
6. [Recently Added & Enhanced](#recently-added--enhanced)
7. [Campus Drive Pipeline](#campus-drive-pipeline)
8. [Technology Stack](#technology-stack)
9. [Getting Started](#getting-started)
10. [Environment Variables](#environment-variables)
11. [Project Structure](#project-structure)
12. [API Overview](#api-overview)
13. [Documentation & Guides](#documentation--guides)

---

## What HireAI Does

| Stakeholder | Primary use |
|-------------|-------------|
| **Job seeker** | Build profile/resume, apply to jobs, take coding tests & assessments, practice interviews, analyze skill gaps, apply to campus drives |
| **Recruiter** | Post jobs, screen candidates, assign tests, run analytics, manage campus drive proposals, video interviews, offer letters |
| **College / placement cell** | Onboard students, run campus drives, invite companies, track placements, bulk operations, partnerships |
| **Admin** | User moderation, security, job stats, email templates, system oversight |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js 14     │────▶│  Express API     │────▶│  MongoDB        │
│  (port 3000)    │     │  (port 5001)     │     │  (Mongoose)     │
│  App + API      │     │  Auth, jobs, ML  │     │                 │
└────────┬────────┘     └────────┬─────────┘     └─────────────────┘
         │                       │
         │              ┌────────▼─────────┐
         │              │  Redis, Socket.IO │
         └──────────────│  Judge0, Groq AI  │
                        └──────────────────┘
```

- **Frontend:** `app/` — dashboards, UI, and many Next.js API routes (`app/api/*`)
- **Backend:** `backend/` — Express server, legacy routes, auth (OTP login), webhooks
- **Shared models:** `models/` — Mongoose schemas used by Next.js API routes
- **Real-time:** Socket.IO for notifications and live updates

---

## User Roles

| Role | Dashboard path | Description |
|------|----------------|-------------|
| `job_seeker` | `/dashboard/job-seeker` | Candidates and students |
| `recruiter` | `/dashboard/recruiter` | Companies and hiring teams |
| `college` / `college_admin` | `/dashboard/college` | Placement cells and college admins |
| `admin` | `/dashboard/admin` | Platform administrators |

Authentication uses **JWT** (HttpOnly cookies) with **email OTP** login via the backend.

---

## Feature Overview by Role

### Job Seeker (`/dashboard/job-seeker`)

| Feature | Route | Status |
|---------|-------|--------|
| Dashboard home | `/dashboard/job-seeker` | ✅ Existing |
| Profile & profile setup | `profile`, `profile-setup` | ✅ Existing |
| Resume builder | `resume-builder` | ✅ Existing |
| Resume chatbot (AI) | `resume-chatbot`, `resume-chatbot-simple` | ✅ Existing |
| Applications | `applications` | ✅ **Enhanced** — improved UI, status tracking |
| Job matches (AI) | `matches` | ✅ Existing |
| **Skill gap analyzer** | `skill-gap` | ✅ **Enhanced** — role presets, AI analysis, history, export |
| **Interview coach** | `interview-coach` | ✅ **Enhanced** — STAR, filler detection, session stats |
| Mock interview | `mock-interview` | ✅ Existing |
| Coding tests (Monaco) | `tests`, `tests/[id]` | ✅ **Enhanced** — proctored take flow, fullscreen preflight, Judge0 |
| Assessments | `assessments` | ✅ Existing |
| Campus drives (apply) | `campus-drives` | ✅ Existing |
| Video interviews | `video-interviews` | ✅ Existing |
| **Offer letters** | `offer-letters` | ✅ **New** — view, download, track offers |
| **Meetings** | `meetings`, `meetings/[id]` | ✅ **New** — LiveKit video meetings |
| Social feed & connections | `social/*` | ✅ Existing |
| LinkedIn/GitHub import | `social-import` | ✅ Existing |
| My college | `my-college` | ✅ Existing |
| Status portal | `status-portal` | ✅ Existing |
| Skills assessments | `skills` | ✅ Existing |
| **History** | `history` | ✅ **New** — activity timeline |

### Recruiter (`/dashboard/recruiter`)

| Feature | Route | Status |
|---------|-------|--------|
| Dashboard | `/dashboard/recruiter` | ✅ Existing |
| Jobs & job descriptions | `jobs`, `job-descriptions` | ✅ Existing |
| AI job description tailor | `job-description-tailor` | ✅ Existing |
| Candidates & talent pool | `candidates`, `talent-pool` | ✅ Existing |
| AI matching & screening | `ai-matching`, `ai-screening` | ✅ **Enhanced** — improved matching, shortlist generation |
| **Coding tests** | `tests`, `tests/create/coding` | ✅ **Enhanced** — create with security suite toggles |
| **Test analytics** | `tests/[id]/analytics` | ✅ **Enhanced** — KPIs, leaderboard, **live security dashboard** |
| **Test assign** | `tests/[id]/assign` | ✅ **Enhanced** — email invite flow |
| Assessments | `assessments` | ✅ Existing |
| **Campus Drive Hub** | `campus-drives` | ✅ **New** — browse colleges, send/receive proposals |
| Video interviews | `video-interviews` | ✅ **Enhanced** — improved UI, feedback wizard |
| AI interview | `ai-interview` | ✅ Existing |
| **Offer letters** | `offer-letters`, `offer-letters/create` | ✅ **Enhanced** — PDF generation, tracking |
| Interview scorecards | `interview-scorecards` | ✅ Existing |
| Candidate benchmark | `benchmark/[id]` | ✅ Existing |
| Analytics (basic + advanced) | `analytics`, `analytics/advanced` | ✅ Existing |
| **Background verification** | `background-verification` | ✅ **Enhanced** — multi-provider, analytics |
| **Email templates** | `email-templates` | ✅ **Enhanced** — customizable templates, logs, settings |
| Collaboration | `collaboration` | ✅ Existing |
| **History** | `history` | ✅ **New** — activity timeline |

### College (`/dashboard/college`)

| Feature | Route | Status |
|---------|-------|--------|
| Dashboard | `/dashboard/college` | ✅ **Enhanced** — real analytics data, notifications dropdown |
| Students & onboarding | `students`, `onboard-student`, `students/[id]` | ✅ Existing |
| **Campus drives** | `campus-drives`, `create`, `[id]` | ✅ **Enhanced** — full CRUD, tabbed interface, eligibility criteria |
| **Partnerships & invites** | `partnerships` | ✅ **Enhanced** — browse companies, bidirectional invites, performance tracking |
| **Placements** | `placements` | ✅ **New** — offer tracking, status management, document management |
| **Interviews** | `interviews` | ✅ **New** — scheduling, result tracking, feedback, analytics |
| **Analytics** | `analytics` | ✅ **New** — comprehensive placement analytics, trends, at-risk students |
| Placement analytics | `placement-analytics` | ✅ Existing |
| Student tracking (multi-year) | `student-tracking` | ✅ Existing |
| Bulk operations | `bulk-operations` | ✅ Existing |
| Assign tests | `assign-tests` | ✅ Existing |
| Leaderboard | `leaderboard` | ✅ Existing |
| Drive shortlist | `drive-shortlist` | ✅ Existing |
| Support requests | `support-requests` | ✅ Existing |
| Reports | `reports` | ✅ Existing |
| **Meetings** | `meetings`, `meetings/[id]` | ✅ **New** — LiveKit video meetings for placement cells |
| Tests | `tests`, `tests/[id]`, `tests/create` | ✅ Existing |
| Profile | `profile` | ✅ Existing |

### Shared / All roles

| Feature | Route | Status |
|---------|-------|--------|
| Login / Signup | `/login`, `/signup` | ✅ **Enhanced** — premium UI, OTP login, lightweight backdrop |
| Forgot / reset password | `/auth/forgot-password`, `/auth/reset-password` | ✅ **New** — email link + OTP reset |
| Terms & Privacy | `/terms`, `/privacy` | ✅ **New** — full legal content |
| **Notification Center** | `/dashboard/notifications` | ✅ **Enhanced** — filters, bulk actions, deep links |
| Messages | `/dashboard/messages` | ✅ Existing |
| Calendar | `/dashboard/calendar` | ✅ Existing |
| Referrals | `/dashboard/referrals` | ✅ Existing |
| Export reports | `/dashboard/export` | ✅ Existing |
| Settings | `/dashboard/settings` | ✅ Existing |
| Global search | `/dashboard/search` | ✅ Existing |

### Admin (`/dashboard/admin`)

| Feature | Route | Status |
|---------|-------|--------|
| Overview & stats | `admin`, `stats` | ✅ Existing |
| Jobs management | `jobs` | ✅ Existing |
| Users | `users` | ✅ Existing |
| Security & moderation | `security` | ✅ Existing |
| Email templates | `email-templates` | ✅ Existing |

---

## Core Platform Features (Existing)

These were part of the original HireAI scope and remain available:

1. **AI job description tailoring** — analyze and optimize JDs  
2. **Candidate benchmark vs job** — skill/experience matching  
3. **Offer letter workflow** — create, send, track, PDF  
4. **Referral engine** — codes, bonuses, leaderboard  
5. **Multi-year student tracking** — placement readiness by year/branch  
6. **Placement readiness analytics** — heatmaps, funnel, company performance  
7. **Bulk student operations** — CSV import/export, bulk invite  
8. **Real-time notifications** — SSE, categories, unread counts  
9. **Advanced recruiter analytics** — funnel, time-to-hire, skill demand  
10. **Calendar integration** — Google/Outlook sync (routes exist)  
11. **Background verification** — multi-provider placeholders  
12. **Security middleware** — rate limiting, XSS/SQL detection  
13. **LinkedIn/GitHub profile import**  
14. **Email template system**  
15. **Export reports (CSV/PDF)**  
16. **Interview scorecards**  
17. **Proctoring** — BlazeFace face AI, COCO-SSD object detection, voice monitoring, fullscreen lock, periodic snapshots, tab-switch guard  
18. **Video interviews** — rooms, feedback  
19. **Social network** — posts, connections, endorsements  
20. **Billing / Stripe** — subscription hooks (where configured)

---

## Recently Added & Enhanced

Work completed in recent development cycles:

### Campus Drive Hub (Recruiter ↔ College)

- **Bidirectional proposals:** recruiter → college OR college → recruiter (specific company)
- **Recruiter:** `/dashboard/recruiter/campus-drives` — browse colleges, send proposals, received invitations, sent proposals, partnerships, pipeline guide, activity feed
- **College:** `/dashboard/college/partnerships` — browse companies, send invites, accept/decline company proposals
- **Auto-publish:** accepting a proposal creates a live campus drive for students + notifies eligible students
- **Direction tracking:** `createdByRole`, `createdByUserId`, notification-based backfill for legacy rows

### College Dashboard Updates

- **Analytics Dashboard:** `/dashboard/college/analytics` — comprehensive placement analytics with real data, overview stats, department/branch distribution, placement status, readiness distribution, monthly trends, drive performance, top packages, at-risk student identification
- **Placements Tracking:** `/dashboard/college/placements` — student placement tracking with offer details, offer status management (Accepted, Pending, Rejected, Deferred), package and location tracking, document management, interview rounds tracking
- **Interview Management:** `/dashboard/college/interviews` — interview scheduling with date, time, venue, interview type categorization (Technical, HR, GD, Aptitude), status and result tracking, feedback management, analytics dashboard
- **Campus Drives:** `/dashboard/college/campus-drives` — full CRUD operations for campus drives, tabbed interface (Upcoming, Ongoing, Completed, All), drive creation dialog with eligibility criteria, student registration and interview scheduling
- **Partnerships:** `/dashboard/college/partnerships` — partnership management with company details, performance tracking (drives conducted, students placed), notes system for partnership communication, tabbed interface by status (Active, Pending, Inactive, All)
- **Notifications Integration:** real-time notifications dropdown in header, unread count indicator, priority-based color coding, mark as read functionality, mark all as read option

### Notification Center

- Full redesign at `/dashboard/notifications`
- Categories, filters, stats, bulk mark read/delete, deep links per role
- Bell component + SSE hooks
- Real-time notifications with priority-based color coding

### Interview Coach (Job Seeker)

- `/dashboard/job-seeker/interview-coach`
- Presets, STAR framework, filler-word detection, session history, AI questions (with fallback)

### Skill Gap Analyzer (Job Seeker)

- `/dashboard/job-seeker/skill-gap`
- Role presets, match score, learning path, radar charts, analysis history, export

### Auth, Password Recovery & Legal Pages

- **Login** (`/login`) — split layout, OTP boxes, remember me, social "coming soon", `AuthPageBackdrop` (CSS + light canvas, no Three.js)
- **Signup** (`/signup`) — 3-step wizard (profile → security → role), password strength, secure password generator, role cards
- **Forgot password** (`/auth/forgot-password`) — branded email with reset link + 6-digit OTP
- **Reset password** (`/auth/reset-password`) — strength meter, OTP boxes, resend countdown
- **Terms** (`/terms`) and **Privacy** (`/privacy`) — full sectioned legal content with table of contents
- Middleware allows public access to `/auth/*`, `/terms`, `/privacy`

### Live Coding Test Proctoring

Multi-layer anti-cheat for candidate test-taking (`/dashboard/job-seeker/tests/[id]`):

| Layer | Description |
|-------|-------------|
| **Fullscreen lock** | Required before start; exits logged |
| **Face AI (BlazeFace)** | No face, multi-face, off-screen, movement |
| **Object AI (COCO-SSD)** | Phone, book, extra person detection |
| **Voice monitoring** | Mic level + sustained speech alerts |
| **Tab switch guard** | Configurable limit; auto-terminate |
| **Periodic snapshots** | Webcam stills every ~20s stored for review |
| **Copy/paste block** | Clipboard + context menu blocked |
| **Preflight wizard** | Fullscreen → camera/mic → face verify → consent |

Recruiters configure security when creating tests at `/dashboard/recruiter/tests/create/coding` (Security tab). Settings persist on the test document (`settings` field).

### Security Analytics Dashboard

- **Route:** `/dashboard/recruiter/tests/[id]/analytics` → **Security** tab
- **API:** `GET /api/tests/[id]/security`
- Live data from `ProctorEvent` collection + submission `integrityAudit` logs
- Per-candidate: integrity %, risk level, tab/face/audio/object/fullscreen counts, snapshot gallery, event timeline
- Auto-refreshes every 10 seconds with the rest of analytics

### Coding Tests & Analytics (existing enhancements)

- **Judge0 CE** default for code execution (`JUDGE0_URL=https://ce.judge0.com`)
- Java `Solution` → `Main` auto-rename for Judge0 compatibility
- **Assign by email** — `/api/tests/[id]/invite` actually assigns tests
- **Analytics deduplication** — one row per candidate (fixes duplicate leaderboard entries)
- Recruiter analytics: Overview, Problems, Candidates, Leaderboard, Security tabs

### Auth & Session

- OTP login via backend (`/api/auth/login` → `/api/auth/verify-otp`)
- Password reset via link or OTP (`/api/auth/forgot-password`, `/api/auth/reset-password`)
- HttpOnly `auth-token` cookie + refresh token
- Normalized `userId` in session for consistent MongoDB queries

### Background Verification System

- **Route:** `/dashboard/recruiter/background-verification`
- **API:** `GET/POST /api/background-verification`, `GET /api/background-verification/[id]`, `GET /api/background-verification/candidates`, `GET /api/background-verification/stats`, `GET /api/background-verification/export`
- Multi-provider background verification with candidate tracking
- Verification status management, document uploads, verification reports
- Analytics dashboard with verification statistics and trends

### Email Templates & Communication

- **Route:** `/dashboard/recruiter/email-templates`
- **API:** `GET/POST /api/communication/email-templates`, `GET/POST /api/communication/email-templates/[id]`, `GET /api/communication/email/logs`, `GET/POST /api/communication/email/settings`
- Customizable email templates for various platform events
- Email logs and tracking for sent emails
- Email settings configuration (SMTP, branding, defaults)
- Status change email automation with template-based notifications

### Offer Letter Management

- **Route:** `/dashboard/recruiter/offer-letters`, `/dashboard/job-seeker/offer-letters`
- **API:** `GET/POST /api/offer-letter`, `GET/POST /api/offer-letter/[id]`, `GET /api/offer-letter/[id]/download`
- PDF generation for offer letters
- Offer letter creation, tracking, and management
- Downloadable PDFs for candidates
- Offer status tracking (Sent, Viewed, Accepted, Rejected, Expired)

### LiveKit Integration for Meetings

- **Route:** `/dashboard/college/meetings`, `/dashboard/job-seeker/meetings`
- **API:** `GET/POST /api/college/meetings`, `GET /api/college/meetings/[id]`, `GET /api/college/meetings/[id]/join`, `GET /api/college/meetings/livekit-token`
- Teams-style video meetings for college placement cells
- Real-time video conferencing with LiveKit
- Meeting scheduling and management
- Join room functionality with token-based authentication

### Interview Feedback Wizard

- **Component:** `components/interview-feedback-wizard.tsx`
- **API:** `POST /api/video-interviews/[id]/feedback`
- Structured interview feedback collection
- Multi-step wizard for comprehensive feedback
- Feedback categories: technical, communication, cultural fit
- Auto-sync with interview records

### Activity Timeline & History

- **Route:** `/dashboard/history`
- **API:** `GET /api/history`
- Comprehensive activity timeline for all user actions
- History tracking for applications, interviews, tests, placements
- Filterable by date, type, and status
- Export functionality for activity reports

### AI Matching & Screening Enhancements

- **Route:** `/dashboard/recruiter/ai-matching`
- **API:** `GET/POST /api/ai/matching`, `GET /api/ai/matching/shortlist`
- Enhanced AI-powered candidate matching
- Shortlist generation with AI scoring
- Improved job-candidate compatibility analysis
- Real-time matching with live updates

### Video Interview Enhancements

- **Route:** `/dashboard/recruiter/video-interviews`
- **API:** `GET/POST /api/video-interviews`, `GET/POST /api/video-interviews/[id]`, `POST /api/video-interviews/[id]/feedback`
- Improved video interview room with better UI
- Enhanced feedback collection and management
- Better recording and playback functionality
- Integration with interview feedback wizard

### Coding Test Security & Validation

- **API:** `POST /api/code/validate-hidden`
- Hidden test case validation for coding tests
- Security checks for code submissions
- Integrity scoring for test submissions
- Automated plagiarism detection

---

## Campus Drive Pipeline

End-to-end flow:

```
1. Discover    → Browse colleges (recruiter) or companies (college)
2. Propose     → Send drive proposal (title, date, roles, package)
3. Confirm     → Other party accepts or declines
4. Publish     → Campus drive goes live; students can apply
```

| Who sends | Recruiter sees | College sees | Who accepts |
|-----------|----------------|--------------|-------------|
| Recruiter → College | **Sent proposals** (waiting) | **Proposals from companies** | College admin |
| College → Recruiter | **Received** (Accept/Decline) | **Invitations you sent** | Recruiter |

**Key APIs:**

- `GET/POST /api/recruiter/campus-drives` — recruiter dashboard + send proposal  
- `GET /api/recruiter/colleges` — college directory  
- `GET/POST /api/college/campus-drive-invites` — college send + list  
- `GET /api/college/recruiters` — company directory  
- `GET /api/college/campus-partners` — college invite stats + activity  
- `PATCH/DELETE /api/college/campus-drive-invites/[id]` — accept, decline, cancel  

**Models:** `CampusDriveInvite`, `CampusDrive`, `CollegePartnership`

---

## Technology Stack

| Layer | Technologies |
|-------|----------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Radix UI |
| Editor | Monaco Editor (coding tests) |
| Charts | Recharts |
| Proctoring ML | BlazeFace + COCO-SSD (TensorFlow.js via CDN) |
| Backend | Express.js, Node.js |
| Database | MongoDB, Mongoose |
| Cache | Redis (ioredis) |
| Auth | JWT, bcrypt, OTP email |
| Code execution | Judge0 CE (default), Piston fallback |
| AI | Groq, OpenAI (via `@ai-sdk/groq`, `ai` package) |
| Real-time | Socket.IO |
| Email | Nodemailer |
| Files | Cloudinary, AWS S3 (optional) |
| Testing | Jest + Supertest (backend) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, for caching)
- SMTP credentials (for OTP email)

### 1. Clone and install

```bash
git clone <repository-url>
cd HireAi
npm install
cd backend && npm install && cd ..
```

### 2. Environment

```bash
cp .env.example .env.local
# Edit .env.local — set MONGODB_URI, JWT_SECRET, SMTP_*, NEXT_PUBLIC_BACKEND_URL
```

### 3. Run development servers

**Terminal 1 — Next.js (frontend + API routes):**

```bash
npm run dev
# http://localhost:3000
```

**Terminal 2 — Express backend:**

```bash
cd backend
npm run dev
# http://localhost:5001 (default)
```

Or use the project’s `server.js` if configured for combined startup.

### 4. First login

1. Open `http://localhost:3000/login`
2. Register or use existing account
3. Complete OTP verification (check console in dev for OTP if email not configured)

---

## Environment Variables

See `.env.example` for the full list. Critical variables:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Token signing (must match backend) |
| `NEXT_PUBLIC_BACKEND_URL` | Express API URL (e.g. `http://localhost:5001`) |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. `http://localhost:3000`) |
| `JUDGE0_URL` | Code execution (default: `https://ce.judge0.com`) |
| `SMTP_*` | Email for OTP and notifications |
| `OPENAI_API_KEY` / Groq | AI features (skill gap, interview coach, JD tailor) |
| `REDIS_URL` / `REDIS_ENABLED` | Optional caching (`REDIS_ENABLED=false` for local dev) |
| `NEXT_PUBLIC_COMPANY_NAME` | Brand name on auth/legal emails |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support contact on Terms/Privacy |

---

## Project Structure

```
HireAi/
├── app/
│   ├── api/                    # Next.js API routes (256+ endpoints)
│   ├── dashboard/              # Role-based dashboards
│   │   ├── job-seeker/         # Candidate features
│   │   ├── recruiter/          # Hiring features
│   │   ├── college/            # Placement cell features
│   │   └── admin/              # Admin panel
│   ├── login/                  # Auth pages (login, signup)
│   ├── auth/                   # Forgot/reset password
│   ├── terms/, privacy/        # Legal pages
│   └── layout.tsx
├── backend/
│   ├── routes/                 # Express routes
│   ├── models/                 # Backend Mongoose models
│   ├── services/               # authService, etc.
│   ├── middleware/             # auth, security, rate limit
│   └── tests/                  # Jest tests
├── components/
│   ├── proctor/                # FaceProctor, preflight, coding-test-proctor
│   ├── analytics/              # Security analytics panels
│   └── auth-page-backdrop.tsx  # Lightweight auth backgrounds
├── lib/
│   ├── proctor-*.ts            # Face/object detection, security analytics
│   └── coding-test-security.ts # Security settings & integrity scoring
├── hooks/                      # useSession, useNotifications, etc.
├── models/                     # Shared Mongoose models (Next.js)
├── public/
├── server.js                   # Optional custom server (Socket.IO)
├── .env.example
└── README.md
```

---

## API Overview

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Initiate OTP login (proxies to backend) |
| POST | `/api/auth/verify-otp` | Verify OTP, set cookies |
| POST | `/api/auth/forgot-password` | Send reset link + OTP email |
| POST | `/api/auth/reset-password` | Reset password with token or OTP |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/auth/client-token` | Sync token for client-side `authFetch` |

### Campus drives

| Method | Endpoint | Role |
|--------|----------|------|
| GET/POST | `/api/recruiter/campus-drives` | Recruiter |
| GET | `/api/recruiter/colleges` | Recruiter |
| GET/POST | `/api/college/campus-drive-invites` | College / Recruiter |
| PATCH/DELETE | `/api/college/campus-drive-invites/[id]` | Accept / decline / cancel |
| GET | `/api/college/campus-partners` | College |
| GET/POST | `/api/college/campus-drives` | College (student-facing drives) |

### Tests & code

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tests` | List/create tests |
| POST | `/api/tests/[id]/invite` | Assign test to candidates |
| GET | `/api/tests/[id]/analytics` | Test analytics |
| GET | `/api/tests/[id]/security` | Proctoring & integrity analytics |
| GET | `/api/tests/[id]/submissions` | Submissions (deduped) |
| POST | `/api/proctoring/event` | Record proctor violation/snapshot |
| GET | `/api/proctoring/event` | List proctor events (recruiter) |
| POST | `/api/code/execute` | Run code (Judge0) |
| POST | `/api/code/validate-hidden` | Validate hidden test cases |

### Job seeker tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/skill-gap` | Skill gap analysis |
| GET/POST/DELETE | `/api/interview-coach` | Interview practice sessions |
| GET/POST | `/api/notifications` | Notification center |
| GET/POST | `/api/applications/[id]/start-test` | Start assigned test |
| POST | `/api/applications/[id]/submit-test` | Submit test results |

### Background verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/background-verification` | List/create verifications |
| GET | `/api/background-verification/[id]` | Get verification details |
| GET | `/api/background-verification/candidates` | Get candidate verifications |
| GET | `/api/background-verification/stats` | Verification statistics |
| GET | `/api/background-verification/export` | Export verification data |

### Email & communication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/communication/email-templates` | List/create email templates |
| GET/POST | `/api/communication/email-templates/[id]` | Manage template |
| GET | `/api/communication/email/logs` | Email delivery logs |
| GET/POST | `/api/communication/email/settings` | Email settings |
| POST | `/api/communication/email/send` | Send email |

### Offer letters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/offer-letter` | List/create offer letters |
| GET/POST | `/api/offer-letter/[id]` | Manage offer letter |
| GET | `/api/offer-letter/[id]/download` | Download PDF |

### Meetings (LiveKit)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/college/meetings` | List/create meetings |
| GET | `/api/college/meetings/[id]` | Get meeting details |
| GET | `/api/college/meetings/[id]/join` | Join meeting room |
| GET | `/api/college/meetings/livekit-token` | Get LiveKit token |

### History & activity

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history` | Get activity timeline |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/users` | User management |
| GET/POST | `/api/admin/moderation` | User moderation |
| GET | `/api/admin/security` | Security events |

### Legacy backend (Express)

Many features also expose routes under `backend/routes/` — job tailoring, referrals, offer letters, bulk ops, analytics, calendar, etc. Next.js API routes often proxy or duplicate this logic.

---

## Documentation & Guides

| Document | Description |
|----------|-------------|
| `DRAG_DROP_USER_GUIDE.md` | Drag-and-drop UI usage |
| `.env.example` | Environment variable reference |

---

## Testing

```bash
cd backend
npm test
```

Backend tests cover: job description tailoring, referrals, offer letters, student tracking, bulk operations, interview scorecards, background verification, email templates, export, social import.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)  
3. Commit changes  
4. Push and open a Pull Request  

---

## License

MIT License

---

## Support

For bugs and feature requests, open an issue on the repository.

---

*Last updated: college dashboard enhancements (analytics, placements, interviews, partnerships), background verification system, email templates & communication, offer letter management with PDF generation, LiveKit integration for meetings, interview feedback wizard, activity timeline & history, AI matching enhancements, video interview improvements, coding test security & validation, admin dashboard updates.*
