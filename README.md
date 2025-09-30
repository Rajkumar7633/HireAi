# HireAI

A full-stack Next.js app with a collaborative video interview room, live code editor (Monaco + Yjs), Judge0 code execution, recruiter dashboards, and pipeline analytics.

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

## Required Environment Variables
See `.env.example` for the complete list. Key ones:

- Runtime
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`

- Database
  - `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`

- Judge0 (Code Runner)
  - Option A (Public CE, no key):
    - `JUDGE0_URL=https://ce.judge0.com`
  - Option B (RapidAPI, higher limits):
    - `JUDGE0_URL=https://judge0-ce.p.rapidapi.com`
    - `JUDGE0_KEY=<your_rapidapi_key>`

- Mail (optional, for email flows)
  - `SMTP_HOST=...`
  - `SMTP_PORT=465`
  - `SMTP_USER=...`
  - `SMTP_PASS=...`
  - `EMAIL_FROM=Your App <no-reply@yourapp.com>`

- Cloudinary (optional, for uploads)
  - `CLOUDINARY_CLOUD_NAME=...`
  - `CLOUDINARY_API_KEY=...`
  - `CLOUDINARY_API_SECRET=...`

## Video Interview Notes
- End Call triggers a feedback dialog. On submit, interview is auto-marked `completed` (sets `endedAt`).
- Reschedule from recruiter list updates `scheduledDate` and resets session fields.
- Status rules (with 15-minute grace):
  - scheduled, in-progress, completed, cancelled, missed, expired.

## Scripts
- Seed demo data (optional): see `scripts/` directory.

## Security
- Do not commit `.env*` files. `.gitignore` excludes them.
- Use GitHub noreply email for commits if you keep email private.

## Troubleshooting
- Judge0 key missing: use public CE or add `JUDGE0_KEY` for RapidAPI.
- Build errors about dynamic routes: we set `export const dynamic = "force-dynamic"` on API pages that need it.

## License
MIT (add your license text if different).
