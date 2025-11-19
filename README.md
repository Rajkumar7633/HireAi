# HireAI

Full‑stack Next.js platform for hiring and networking.

- **Interviews**: collaborative video room, Monaco editor with Yjs, Judge0 execution.
- **Recruiting**: recruiter dashboards, pipeline analytics.
- **Job Seekers**: rich profile, resume, assessments.
- **Social**: LinkedIn‑like features (search, connections, posts with images, 1:1 chat).

---

## Quick Start

1) Install dependencies
```bash
npm install
```

2) Copy env template and fill values
```bash
cp .env.example .env.local
# then edit .env.local
```

3) Run the app
```bash
npm run dev
```

App: http://localhost:3000

---

## Features (What’s included)

- **Interview Suite**
  - Real‑time code editor (Monaco + Yjs) with Judge0 execution.
  - Video/voice room; end call triggers feedback and marks session complete.

- **Recruiter Workspace**
  - Candidate pipeline, reschedule, and status logic (scheduled, in‑progress, completed, cancelled, missed, expired).
  - Multi‑round hiring with stage timeline and per‑round scores.
  - Assign online coding tests to candidates by application or by email.

- **Job Seeker Experience**
  - Profile + resume management.
  - **My Applications** timeline with current stage and round badges.
  - "Take Test" flows directly into the assigned coding test.

- **Social Networking**
  - **Search** (`/dashboard/job-seeker/social/search`): find people by name/title/email.
  - **Connections**: send requests, accept, view states (pending/outgoing/accepted).
  - **Feed** (`/dashboard/job-seeker/social/feed`): post achievements (text + up to 4 images).
    - Client‑side image compression; images render with object‑contain.
    - Server uploads to Cloudinary; if upload fails, data URLs are stored so images still show.
  - **Chat** (1:1): data models ready; UI shows participant names/avatars (WIP if not visible yet).

---

## Key Paths

- **Hiring & Applications**
  - Backend JobApplication model: `backend/models/JobApplication.js`
    - Fields: `currentStage` (application, hr_shortlist, coding_round, tech_round_1, hr_round, offer, etc.)
    - `rounds[]` with `{ roundName, stageKey, testId, submissions[], status, latestScore, notes }`.
  - Frontend Application model: `models/Application.ts` mirrors these fields.
  - Job seeker applications API: `app/api/applications/my-applications/route.ts`.
  - Single application API: `app/api/applications/[id]/route.ts`.
  - Stage update API: `app/api/applications/[id]/stage/route.ts`.

- **Coding Tests & Submissions**
  - Backend Test model: `backend/models/Test.js` (recruiter‑created tests).
  - Backend TestSubmission model: `backend/models/TestSubmission.js`
    - Tracks `roundStage` and `attemptNumber` for multi‑round/multi‑attempt.
  - Backend routes: `backend/routes/test.js`
    - `POST /api/applications/:id/assign-test` – assign test + update rounds.
    - `POST /api/applications/:id/submit-test` – score test, update rounds/latestScore.
    - `PUT  /api/applications/:id/stage` – update high‑level stage and round status.
    - `GET  /api/tests/:id/submissions` – recruiter submissions list.
    - `GET  /api/tests/:id/analytics` – attempts, average score, pass rate, plagiarism.
    - `POST /api/tests/:id/auto-select` – auto‑shortlist based on score/plagiarism.

- **Next.js API Proxies**
  - Assign test to application (recruiter candidates page):
    - `app/api/tests/assign/route.ts` – attaches `testId`, updates `currentStage` and `rounds`.
  - Stage update from recruiter UI:
    - `app/api/applications/[id]/stage/route.ts` – updates `currentStage` and optional round.
  - Job seeker takes test:
    - `app/api/applications/[id]/route.ts` – loads application (with populated `testId`).
    - `app/api/tests/[id]/route.ts` – for `job_seeker` role, loads the test directly from Mongo only if an application with that `testId` exists for the current user.
  - Recruiter tests list / details / analytics:
    - `app/api/tests/my-tests/route.ts`
    - `app/api/tests/[id]/submissions/route.ts`
    - `app/api/tests/[id]/analytics/route.ts`

- **Recruiter Pages**
  - Candidates for a job: `app/dashboard/recruiter/job-descriptions/[id]/candidates/page.tsx`
    - Shows `currentStage` + round badges (with `latestScore`).
    - Dropdown to move stages via `/api/applications/[id]/stage`.
    - "Assign Test" button uses `/api/tests/assign` with `roundStage`/`roundName`.
  - Test results & analytics: `app/dashboard/recruiter/tests/[id]/results/page.tsx`
    - Live summary + plagiarism overview.
    - Submissions table includes Round + Attempt columns.
    - Quick assign by email using `/api/tests/invite-by-email` and `/api/job-descriptions/my-jobs`.

- **Job Seeker Pages**
  - My applications timeline: `app/dashboard/job-seeker/applications/page.tsx`
    - Shows `currentStage` and per‑round badges with `latestScore`.
    - "Take Test" button for `Test Assigned` → `/dashboard/job-seeker/tests/{applicationId}`.
  - Take coding test: `app/dashboard/job-seeker/tests/[id]/page.tsx`
    - Loads application by id, resolves `testId`, loads test via `/api/tests/{testId}`.
    - Submits answers to `/api/applications/{applicationId}/submit-test`.

- **Social APIs**
  - Posts: `app/api/social/posts/route.ts`
  - Feed: `app/api/social/feed/route.ts`
  - Search: `app/api/social/search/route.ts`
  - Connections: `app/api/social/connections/route.ts`
  - Connection Request: `app/api/social/connections/request/route.ts`
  - Connection Accept: `app/api/social/connections/accept/route.ts`
  - Camera Upload (sample): `app/api/camera/upload/route.ts`

---

## Environment Variables (Common)

- **Runtime**
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`

- **Database**
  - `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`

- **Cloudinary (for uploads)**
  - `CLOUDINARY_CLOUD_NAME=...`
  - `CLOUDINARY_API_KEY=...`
  - `CLOUDINARY_API_SECRET=...`
  - Optional: `CLOUDINARY_FOLDER=hireai-social`

- **Judge0 (Code Runner)**
  - Option A (Public CE): `JUDGE0_URL=https://ce.judge0.com`
  - Option B (RapidAPI): `JUDGE0_URL=https://judge0-ce.p.rapidapi.com`, `JUDGE0_KEY=<key>`

- **Mail (optional)**
  - `SMTP_HOST`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

---

## How Social features work

- **Auth for APIs**
  - Resolved from `Authorization: Bearer <token>` or cookies `token` / `auth-token`.
  - Fallback to internal `/api/auth/me` to obtain `userId` when possible.

- **Posting with images**
  - Client compresses images and sends `data:` URLs.
  - Server uploads to Cloudinary via `utils/cloudinary.ts` and stores returned URLs.
  - If upload fails, the original `data:` URLs are stored to keep images visible.

- **Feed composition**
  - Feed returns posts from you and your accepted connections.
  - Each post is augmented with author profile fields for display.

- **Connections**
  - `request` creates/updates a connection document.
  - `accept` moves status to `accepted`.

---

## Scripts
- Seed demo data (optional): see `scripts/` directory.

## Security

- Do not commit `.env*` files.
- Use GitHub noreply email if you keep email private.

### Authentication & Session Security

- **OTP‑based login flow**
  - Users sign in with email + password.
  - If credentials are valid and the user exists, a 6‑digit OTP is generated and sent to the email.
  - The OTP is valid for 10 minutes and limited to a small number of attempts.
  - In development, the OTP is also logged to the server console to simplify testing.

- **Cookie‑only JWT tokens (no `localStorage`)**
  - After successful OTP verification, the backend issues:
    - A short‑lived **access token** (≈20 minutes).
    - A long‑lived **refresh token** (≈14 days).
  - Both tokens are stored as `httpOnly` cookies:
    - `auth-token`: access token, `httpOnly`, `secure` in production, `SameSite=lax`.
    - `refresh-token`: refresh token, `httpOnly`, `secure` in production, `SameSite=lax`.
  - The frontend never reads or writes JWTs directly; it relies on these cookies and `/api/auth/me`.

- **Access / Refresh model**
  - **Access token**
    - Payload includes `{ userId, email, name, role, type: "access" }`.
    - Used by backend auth middleware and Next.js `/api/auth/me` to identify the user.
  - **Refresh token**
    - Payload includes `{ userId, email, name, role, type: "refresh" }`.
    - Stored in `User.refreshTokens` so active sessions can be tracked.
    - On `/api/auth/refresh`, the backend:
      - Verifies the refresh token.
      - Ensures it is present in `user.refreshTokens`.
      - Issues a new access token + a rotated refresh token.
      - Replaces the old refresh token in `user.refreshTokens` (rotation).

- **Auto refresh on the frontend**
  - The `useSession` hook calls `/api/auth/me` to resolve the current user from the `auth-token` cookie.
  - If `/api/auth/me` returns `401` once, the hook calls `/api/auth/refresh` (Next.js proxy), which uses the `refresh-token` cookie.
  - If refresh succeeds, `useSession` retries the session fetch and the user stays logged in.
  - If refresh fails, the session is cleared and the user is treated as logged out.

- **Logout & Logout‑all‑devices**
  - `/api/auth/logout` (Next.js) clears `auth-token`, legacy `token`, and `refresh-token` cookies.
  - `/api/auth/logout-all` (backend) clears `user.refreshTokens`, so all devices lose the ability to refresh tokens.
  - After logout‑all, any remaining `refresh-token` cookies will fail on the next refresh attempt.

- **Rate limiting and OTP hardening**
  - Auth routes (login, OTP verify, refresh) are wrapped in configurable rate limiters.
  - In development, rate limiting is relaxed to simplify local testing.
  - OTP codes are normalized and attempts are capped to reduce brute‑force risk.

## Troubleshooting
- Judge0 key missing: use public CE or add `JUDGE0_KEY`.
- Large image payloads: client compresses; consider switching to unsigned direct‑to‑Cloudinary uploads for even smaller server payloads.
- Dynamic route warnings: many API routes set `export const dynamic = "force-dynamic"`.

---

## Billing and Subscriptions

- **Environment (backend)**
  - `BILLING_ENABLED=1`
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
  - `RECRUITER_PRO_PRICE=price_...` (monthly)
  - `STUDENT_PLUS_PRICE=price_...` (monthly)
  - `FRONTEND_URL=http://localhost:3000`

- **Environment (frontend / Next.js)**
  - `NEXT_PUBLIC_BACKEND_URL=http://localhost:5001`

- **Checkout flow**
  - Backend endpoint: `POST /api/billing/checkout` (auth required)
  - Success redirect: `${FRONTEND_URL}/dashboard/<role>?billing=success&session_id={CHECKOUT_SESSION_ID}`
  - Frontend triggers `/api/billing/sync` and shows Pro immediately (provisional), then profile reflects real status.

- **Webhook**
  - Route: `POST /api/billing/webhook` (mounted with `express.raw` before JSON parser)
  - On `checkout.session.completed`:
    - Saves `stripeCustomerId` to user
    - Creates a Stripe Subscription Schedule if one does not exist:
      - Phase 1: 2‑month price (auto‑created for same product/currency if missing), 1 iteration
      - Phase 2: switches to your monthly price
  - On subscription lifecycle events, user is updated with:
    - `subscription: { productId, priceId, status, currentPeriodEnd }`
    - `features`, `limits` derived from price via `backend/utils/entitlements.js`

- **Profile persistence**
  - Endpoint: `GET /api/user/profile`
  - If subscription is missing/inactive, it proactively calls backend `/api/billing/sync` using the auth token, then re‑reads the user so refresh/relogin stays Pro.

- **Testing**
  - Start backend and frontend
  - Do a fresh checkout
  - Verify in Stripe: Subscription Schedule with two phases; initial `current_period_end` ≈ 2 months out
  - Refresh app: profile shows `subscription.status = active` and correct `currentPeriodEnd`

---

## Analytics (Real Data Only) and Cache

- **APIs**
  - Recruiter dashboard: `GET /api/analytics/recruiter-dashboard` (no demo data)
  - Advanced metrics: `GET /api/analytics/advanced-metrics` (no demo data)
  - If DB has no data, endpoints return zeros/empty arrays and UI shows "No data" states.

- **Redis cache (optional)**
  - Frontend env:
    - `ANALYTICS_CACHE=1` to enable, or `0`/unset to disable
    - `REDIS_URL=redis://localhost:6379` (or your instance)
  - The client is hard‑fail and non‑retrying. If connect/ping fails, it disables caching and suppresses ioredis errors.
  - For local dev without Redis: set `ANALYTICS_CACHE=0` to avoid ETIMEDOUT logs.

- **Notes**
  - Analytics UI uses per‑request timeouts to avoid indefinite spinners.


## License
MIT (add your license text if different).
