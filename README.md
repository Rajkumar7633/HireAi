# HireAI - AI-Powered Recruitment & Placement Platform

HireAI is a comprehensive AI-powered recruitment and placement management system designed for colleges, placement cells, recruiters, and job seekers. The platform leverages advanced NLP, machine learning, and real-time analytics to streamline the hiring process.

## Features

### Core Features

#### 1. AI Job Description Tailoring
- **Backend**: `/backend/routes/jobDescriptionTailoring.js`
- **Frontend**: `/app/dashboard/recruiter/job-description-tailor/page.tsx`
- **API**: `/app/api/job-description/tailor/route.ts`

AI-powered analysis and optimization of job descriptions for better clarity, inclusivity, and effectiveness.

**Features:**
- Analyze job descriptions for clarity, inclusivity, completeness, and effectiveness
- Get AI-powered suggestions for improvement
- Generate optimized versions of job descriptions
- Heuristic-based analysis with dynamic skill extraction

#### 2. Candidate Benchmark vs Job Requirements
- **Backend**: `/backend/routes/candidateBenchmark.js`
- **Frontend**: `/app/dashboard/recruiter/benchmark/[id]/page.tsx`
- **API**: `/app/api/benchmark/candidate/route.ts`

Compare candidate profiles against job requirements with detailed matching analysis.

**Features:**
- Skill matching analysis
- Experience comparison
- Education requirements check
- Keyword matching
- Soft skills assessment
- Strengths, gaps, and recommendations

#### 3. Offer Letter Workflow
- **Backend**: `/backend/routes/offerLetter.js`
- **Model**: `/backend/models/OfferLetter.js`
- **Frontend**: `/app/dashboard/recruiter/offer-letters/create/page.tsx`
- **API**: `/app/api/offer-letter/route.ts`

Complete offer letter management system with status tracking and PDF generation.

**Features:**
- Create and send offer letters
- Track offer status (Draft, Sent, Accepted, Rejected, Expired)
- PDF generation capability
- E-signature placeholders
- Audit trail for all changes
- Custom offer templates

#### 4. Referral Engine
- **Backend**: `/backend/routes/referral.js`
- **Model**: `/backend/models/Referral.js`
- **Frontend**: `/app/dashboard/referrals/page.tsx`
- **API**: `/app/referral/route.ts`

Employee referral program with bonus tracking and leaderboard.

**Features:**
- Create unique referral codes
- Track referral status (Pending, Signed Up, Applied, Hired, Bonus Paid)
- Bonus management and approval workflow
- Referral leaderboard
- Analytics on referral performance

#### 5. Multi-Year Student Tracking
- **Backend**: `/backend/routes/studentTracking.js`
- **Model**: `/backend/models/StudentTracking.js`
- **Frontend**: `/app/dashboard/college/student-tracking/page.tsx`
- **API**: `/app/api/student-tracking/route.ts`

Comprehensive student tracking system for placement cells to monitor progress from 1st year through placement.

**Features:**
- Year-wise progress tracking
- Academic information management (CGPA, attendance, skills)
- Placement readiness assessment
- Skill development tracking
- Alerts and recommendations
- At-risk student identification
- Analytics by year, branch, and batch

#### 6. Placement Readiness Analytics
- **Backend**: `/backend/routes/placementAnalytics.js`
- **Frontend**: `/app/dashboard/college/placement-analytics/page.tsx`
- **API**: `/app/api/placement-analytics/route.ts`

Advanced analytics dashboard for placement cells to make data-driven decisions.

**Features:**
- Overall placement readiness overview
- Skills heatmap showing strong/weak skills
- Referral leaderboard
- Placement funnel analytics
- Company-wise performance tracking
- Conversion rate analysis

#### 7. Bulk Student Operations
- **Backend**: `/backend/routes/bulkOperations.js`
- **Frontend**: `/app/dashboard/college/bulk-operations/page.tsx`
- **API**: `/app/api/bulk-operations/route.ts`

Bulk operations for managing large numbers of students efficiently.

**Features:**
- CSV import for student data
- Bulk eligibility filtering
- Bulk invitations for assessments/interviews
- Bulk student record updates
- Export student data to CSV
- Bulk delete operations

#### 8. Real-Time Notifications System
- **Backend**: `/backend/routes/realtimeNotifications.js`
- **Model**: `/backend/models/Notification.js` (existing)
- **Frontend**: `/app/api/notifications/route.ts` (existing)

Real-time notification system for keeping users updated on important events.

**Features:**
- Create notifications for various events
- Mark notifications as read/unread
- Bulk notification support
- Notification categories (new_match, application_status_update, interview_scheduled, etc.)
- Unread count tracking

#### 9. Advanced Analytics Dashboard
- **Backend**: `/backend/routes/advancedAnalytics.js`
- **Frontend**: `/app/dashboard/recruiter/analytics/advanced/page.tsx`
- **API**: `/app/api/analytics/advanced/route.ts`

Comprehensive analytics dashboard for recruiters with hiring funnel insights.

**Features:**
- Hiring funnel visualization
- Conversion rate analysis
- Time-to-hire metrics
- Job performance comparison
- Candidate quality analytics
- Skill demand analysis
- Time-series trends

#### 10. Calendar Integration
- **Backend**: `/backend/routes/calendar.js`
- **Frontend**: `/app/dashboard/calendar/page.tsx`
- **API**: `/app/api/calendar/route.ts`

Integration with external calendar providers (Google Calendar, Microsoft Outlook).

**Features:**
- Sync with Google Calendar
- Sync with Microsoft Outlook
- Create calendar events for interviews
- Update existing events
- Check availability for scheduling
- Delete calendar events

#### 11. Background Verification Integration
- **Backend**: `/backend/routes/backgroundVerification.js`
- **Model**: `/backend/models/BackgroundVerification.js`
- **Frontend**: `/app/dashboard/recruiter/background-verification/page.tsx`
- **API**: `/app/api/background-verification/route.ts`

Integration with background verification providers for comprehensive candidate screening.

**Features:**
- Initiate background verification
- Multiple provider support (Checkr, Hireright, Sterling, GoodHire)
- Component-wise verification (identity, education, employment, criminal, drug, reference)
- Status tracking (Pending, In Progress, Completed, Failed)
- Overall risk assessment
- Report generation

#### 12. Advanced Security Features
- **Backend**: `/backend/middleware/security.js`
- **Model**: `/backend/models/SecurityEvent.js`
- **Middleware**: `/backend/middleware/rateLimiter.js` (existing)

Enhanced security features to protect the platform and user data.

**Features:**
- SQL injection detection and prevention
- XSS attack detection
- CSRF protection
- IP blocking capability
- Session validation
- Input sanitization
- Security event logging
- Rate limiting (API, auth, upload, billing)

#### 13. LinkedIn/GitHub Profile Import
- **Backend**: `/backend/routes/socialImport.js`
- **Frontend**: `/app/dashboard/job-seeker/social-import/page.tsx`
- **API**: `/app/api/social-import/route.ts`

Import professional profiles from LinkedIn and GitHub to auto-fill candidate information.

**Features:**
- LinkedIn profile import with OAuth
- GitHub profile import with OAuth
- Public GitHub profile fetching (no auth required)
- Profile data mapping to user profile
- Repository and contribution tracking

#### 14. Email Template System
- **Backend**: `/backend/routes/emailTemplates.js`
- **Model**: `/backend/models/EmailTemplate.js`
- **Frontend**: `/app/dashboard/admin/email-templates/page.tsx`
- **API**: `/app/api/email-templates/route.ts` (existing)

Custom email template management for automated communications.

**Features:**
- Create custom email templates
- Template categories (recruiting, placement, notifications, marketing, system)
- Variable substitution for dynamic content
- Preview templates with sample data
- Default templates included
- Template versioning

#### 15. Export Reports CSV/PDF
- **Backend**: `/backend/routes/exportReports.js`
- **Frontend**: `/app/dashboard/export/page.tsx`
- **API**: `/app/api/export/route.ts`

Export data in CSV or PDF format for reporting and analysis.

**Features:**
- Export applications data
- Export student tracking data
- Export analytics reports
- CSV and PDF format support
- Time period filtering for analytics
- Customizable export options

#### 16. Interview Scorecards
- **Backend**: `/backend/routes/interviewScorecards.js`
- **Model**: `/backend/models/InterviewScorecard.js`
- **Frontend**: `/app/dashboard/recruiter/interview-scorecards/page.tsx`
- **API**: `/app/api/interview-scorecards/route.ts`

Structured interview evaluation system with scoring categories.

**Features:**
- Multiple scoring categories (technical, communication, problem-solving, culture-fit, leadership)
- Question and answer tracking
- Strengths and weaknesses assessment
- Overall recommendation (Strong Hire, Hire, Maybe, No Hire, Strong No Hire)
- Draft, Submitted, and Reviewed status
- Per-interviewer evaluations

## Technology Stack

### Backend
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT
- **File Processing**: CSV (csv-parser, json2csv), PDF (pdfkit)
- **External APIs**: LinkedIn, GitHub, Google Calendar, Microsoft Graph

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety

### Testing
- **Backend Testing**: Jest + Supertest
- Test files created for all major features:
  - `jobDescriptionTailoring.test.js`
  - `referral.test.js`
  - `offerLetter.test.js`
  - `studentTracking.test.js`
  - `bulkOperations.test.js`
  - `interviewScorecards.test.js`
  - `backgroundVerification.test.js`
  - `emailTemplates.test.js`
  - `exportReports.test.js`
  - `socialImport.test.js`

## Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

### Frontend Setup

```bash
cd app
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

### Environment Variables

**Backend (.env)**
```
MONGODB_URI=mongodb://localhost:27017/hireai
JWT_SECRET=your-jwt-secret
PORT=5000
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env)**
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

## Running Tests

```bash
cd backend
npm test
```

## API Documentation

### Authentication
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Key Endpoints

#### Job Description Tailoring
- `POST /api/job-description-tailoring/analyze` - Analyze job description
- `POST /api/job-description-tailoring/optimize` - Optimize job description

#### Candidate Benchmark
- `POST /api/benchmark/candidate` - Generate candidate benchmark

#### Offer Letters
- `POST /api/offer-letter/create` - Create offer letter
- `PUT /api/offer-letter/:id/send` - Send offer letter
- `PUT /api/offer-letter/:id/accept` - Accept offer
- `PUT /api/offer-letter/:id/reject` - Reject offer
- `GET /api/offer-letter/:id` - Get offer letter
- `DELETE /api/offer-letter/:id` - Delete offer letter

#### Referrals
- `POST /api/referral/create` - Create referral
- `GET /api/referral/code/:code` - Get referral by code
- `POST /api/referral/apply` - Apply referral code
- `GET /api/referral/my-referrals` - Get my referrals
- `GET /api/referral/leaderboard` - Get referral leaderboard

#### Student Tracking
- `POST /api/student-tracking/create` - Create/update student tracking
- `GET /api/student-tracking/student/:studentId` - Get student tracking
- `GET /api/student-tracking/college/:collegeId` - Get college tracking
- `PUT /api/student-tracking/:id/update-progress` - Update yearly progress
- `GET /api/student-tracking/analytics/:collegeId` - Get analytics

#### Bulk Operations
- `POST /api/bulk/import-students` - Import students from CSV
- `POST /api/bulk/eligibility-filter` - Filter by eligibility
- `POST /api/bulk/bulk-invite` - Send bulk invitations
- `POST /api/bulk/bulk-update` - Bulk update records
- `GET /api/bulk/export-students` - Export students

#### Analytics
- `GET /api/analytics/recruiter-dashboard` - Recruiter dashboard analytics
- `GET /api/analytics/timeseries` - Time-series data
- `GET /api/analytics/skill-demand` - Skill demand analysis
- `GET /api/analytics/candidate-quality` - Candidate quality metrics

#### Calendar
- `POST /api/calendar/sync` - Sync calendar
- `POST /api/calendar/event` - Create calendar event
- `PUT /api/calendar/event/:id` - Update event
- `DELETE /api/calendar/event/:id` - Delete event
- `GET /api/calendar/availability` - Check availability

#### Background Verification
- `POST /api/background-verification/initiate` - Initiate verification
- `GET /api/background-verification/:id` - Get verification
- `PUT /api/background-verification/:id/update-component` - Update component
- `PUT /api/background-verification/:id/finalize` - Finalize verification

#### Social Import
- `POST /api/social-import/linkedin` - Import LinkedIn profile
- `POST /api/social-import/github` - Import GitHub profile
- `GET /api/social-import/github/:username` - Get public GitHub profile

#### Email Templates
- `POST /api/email-templates/create` - Create template
- `GET /api/email-templates` - Get all templates
- `PUT /api/email-templates/:id` - Update template
- `DELETE /api/email-templates/:id` - Delete template
- `POST /api/email-templates/preview` - Preview template

#### Export
- `POST /api/export/applications` - Export applications
- `POST /api/export/students` - Export students
- `POST /api/export/analytics` - Export analytics

#### Interview Scorecards
- `POST /api/interview-scorecards/create` - Create scorecard
- `GET /api/interview-scorecards/:id` - Get scorecard
- `PUT /api/interview-scorecards/:id` - Update scorecard
- `PUT /api/interview-scorecards/:id/submit` - Submit scorecard
- `PUT /api/interview-scorecards/:id/review` - Review scorecard

## User Roles

- **job_seeker**: Can apply to jobs, view applications, import profiles
- **recruiter**: Can manage job descriptions, review applications, send offers, access analytics
- **college_admin**: Can manage student tracking, placement analytics, bulk operations
- **admin**: Full system access

## Project Structure

```
hireaiproject copy/
├── backend/
│   ├── models/              # Mongoose models
│   ├── routes/              # Express API routes
│   ├── middleware/          # Custom middleware
│   └── tests/               # Backend tests
├── app/
│   ├── api/                  # Next.js API routes
│   ├── dashboard/           # Dashboard pages
│   │   ├── recruiter/       # Recruiter-specific pages
│   │   ├── college/         # College admin pages
│   │   └── job-seeker/      # Job seeker pages
│   ├── lib/                  # Utility functions
│   └── models/               # Next.js models
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License

## Support

For support and questions, please open an issue on the repository.
