import Link from "next/link"
import { ArrowLeft, FileText, Shield, Scale } from "lucide-react"

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI"
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@hireai.app"
const LAST_UPDATED = "June 8, 2026"

export const metadata = {
  title: `Terms of Service — ${COMPANY}`,
  description: `Terms of Service for ${COMPANY} recruitment and talent platform.`,
}

const SECTIONS = [
  {
    id: "introduction",
    title: "1. Introduction",
    body: (
      <>
        <p>
          Welcome to {COMPANY} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). These Terms of Service
          (&quot;Terms&quot;) govern your access to and use of our website, applications, APIs, and related
          services (collectively, the &quot;Platform&quot;).
        </p>
        <p className="mt-3">
          By creating an account, signing in, or using any part of the Platform, you agree to these Terms and
          our{" "}
          <Link href="/privacy" className="text-violet-700 underline hover:text-violet-900 dark:text-violet-400">
            Privacy Policy
          </Link>
          . If you do not agree, you must not use the Platform.
        </p>
      </>
    ),
  },
  {
    id: "definitions",
    title: "2. Definitions",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Job Seeker</strong> — an individual using the Platform to find employment, complete assessments,
          or participate in interviews.
        </li>
        <li>
          <strong>Recruiter</strong> — an individual or organization representative posting jobs, reviewing
          candidates, or managing hiring workflows.
        </li>
        <li>
          <strong>College Admin</strong> — an authorized campus placement representative managing drives and
          student outcomes.
        </li>
        <li>
          <strong>Content</strong> — resumes, profiles, job posts, messages, recordings, assessment answers, and
          any material you submit or generate on the Platform.
        </li>
        <li>
          <strong>AI Features</strong> — matching scores, recommendations, summaries, and automated suggestions
          powered by machine learning.
        </li>
      </ul>
    ),
  },
  {
    id: "eligibility",
    title: "3. Eligibility",
    body: (
      <>
        <p>
          You must be at least 16 years old (or the minimum age required in your jurisdiction) to use the
          Platform. By registering, you represent that you have the legal capacity to enter into these Terms.
        </p>
        <p className="mt-3">
          College administrators must use an authorized institutional email address where required during
          registration. Recruiters must have authority to act on behalf of their organization when posting jobs
          or contacting candidates.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "4. Accounts & security",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Provide accurate, current, and complete registration information.</li>
        <li>Keep your password confidential and do not share OTP or reset codes with anyone.</li>
        <li>You are responsible for all activity under your account, including actions by anyone using your credentials.</li>
        <li>Notify us immediately at {CONTACT_EMAIL} if you suspect unauthorized access.</li>
        <li>We may suspend accounts that appear compromised or violate these Terms.</li>
      </ul>
    ),
  },
  {
    id: "acceptable-use",
    title: "5. Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Upload false resumes, fake credentials, or impersonate another person or company.</li>
          <li>Harass, discriminate against, or send unlawful content to other users.</li>
          <li>Scrape, crawl, reverse engineer, or attempt to bypass security or rate limits.</li>
          <li>Use the Platform for spam, phishing, malware distribution, or unauthorized advertising.</li>
          <li>Interfere with assessments, interviews, or proctoring integrity (cheating, proxy test-taking).</li>
          <li>Violate employment, privacy, export-control, or anti-discrimination laws in your jurisdiction.</li>
        </ul>
      </>
    ),
  },
  {
    id: "job-seekers",
    title: "6. Job seeker terms",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Application status updates depend on recruiter actions; we do not guarantee interviews or offers.</li>
        <li>Assessment and interview scores are shared with recruiters you apply to or who invite you.</li>
        <li>You may withdraw applications where the feature is available, subject to recruiter visibility rules.</li>
        <li>Profile and resume data may be used for AI matching with jobs you opt into or apply for.</li>
      </ul>
    ),
  },
  {
    id: "recruiters",
    title: "7. Recruiter terms",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Job postings must be accurate, lawful, and for genuine openings (no bait-and-switch listings).</li>
        <li>You must comply with equal opportunity and fair hiring laws when reviewing candidates.</li>
        <li>Bulk email and messaging must respect candidate preferences and applicable anti-spam regulations.</li>
        <li>AI matching and ranking tools are decision-support only — final hiring decisions remain your responsibility.</li>
        <li>You are responsible for how you store, export, or share candidate data outside the Platform.</li>
      </ul>
    ),
  },
  {
    id: "college",
    title: "8. College admin terms",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Access is limited to authorized placement-cell or institutional representatives.</li>
        <li>Student data must be handled per your institution&apos;s policies and applicable education privacy rules.</li>
        <li>Campus drive and placement analytics are provided for operational use, not as official accreditation records.</li>
      </ul>
    ),
  },
  {
    id: "ai",
    title: "9. AI, assessments & interviews",
    body: (
      <>
        <p>
          {COMPANY} provides AI-assisted matching, coding tests, skill assessments, video interviews, and analytics.
          These features may produce incomplete or incorrect outputs. They do not constitute legal, medical, or
          professional advice.
        </p>
        <p className="mt-3">
          Where video or screen recording is enabled, you consent to capture and storage for interview review,
          quality assurance, and fraud prevention, as described in our Privacy Policy.
        </p>
      </>
    ),
  },
  {
    id: "content-ip",
    title: "10. Content & intellectual property",
    body: (
      <>
        <p>
          You retain ownership of Content you submit. You grant {COMPANY} a worldwide, non-exclusive license to
          host, process, display, and transmit that Content solely to operate and improve the Platform.
        </p>
        <p className="mt-3">
          The {COMPANY} name, logo, software, and design elements are our property. You may not copy or use our
          branding without written permission.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    title: "11. Subscriptions & billing",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Paid plans bill according to the cycle shown at checkout (monthly, annual, or custom).</li>
        <li>Fees are generally non-refundable except where required by law or stated in a separate agreement.</li>
        <li>We may change pricing with reasonable notice; continued use after changes constitutes acceptance.</li>
        <li>Failure to pay may result in suspension of premium features.</li>
      </ul>
    ),
  },
  {
    id: "termination",
    title: "12. Suspension & termination",
    body: (
      <p>
        We may suspend or terminate access for violations of these Terms, legal requirements, or risk to the
        Platform or other users. You may request account closure by emailing {CONTACT_EMAIL}. Some data may be
        retained as described in our Privacy Policy.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "13. Disclaimers",
    body: (
      <p>
        THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
        EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO
        NOT WARRANT UNINTERRUPTED SERVICE, ERROR-FREE AI OUTPUTS, JOB PLACEMENT, OR HIRING OUTCOMES.
      </p>
    ),
  },
  {
    id: "liability",
    title: "14. Limitation of liability",
    body: (
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY.toUpperCase()} AND ITS AFFILIATES SHALL NOT BE LIABLE FOR
        INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR
        GOODWILL, ARISING FROM YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE
        AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM, OR ONE HUNDRED U.S. DOLLARS (USD $100),
        WHICHEVER IS GREATER.
      </p>
    ),
  },
  {
    id: "indemnity",
    title: "15. Indemnification",
    body: (
      <p>
        You agree to indemnify and hold harmless {COMPANY}, its officers, employees, and partners from claims,
        damages, and expenses (including reasonable legal fees) arising from your Content, your use of the
        Platform, or your violation of these Terms or applicable law.
      </p>
    ),
  },
  {
    id: "changes",
    title: "16. Changes to these Terms",
    body: (
      <p>
        We may update these Terms from time to time. We will post the revised version with an updated &quot;Last
        updated&quot; date. Material changes may be communicated by email or in-app notice. Continued use after
        changes take effect constitutes acceptance.
      </p>
    ),
  },
  {
    id: "contact",
    title: "17. Contact",
    body: (
      <p>
        Questions about these Terms:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 underline hover:text-violet-900 dark:text-violet-400">
          {CONTACT_EMAIL}
        </a>
        . See also our{" "}
        <Link href="/privacy" className="text-violet-700 underline hover:text-violet-900 dark:text-violet-400">
          Privacy Policy
        </Link>
        .
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/30 text-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <Link
          href="/signup"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-violet-700 hover:underline dark:text-violet-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <header className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Terms of Service
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {COMPANY} · Last updated: {LAST_UPDATED}
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                Please read these terms carefully before using {COMPANY}. They explain your rights and
                responsibilities on our recruitment and talent platform.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <FileText className="h-3.5 w-3.5" /> Legal agreement
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Shield className="h-3.5 w-3.5" /> Applies to all roles
            </span>
          </div>
        </header>

        <nav className="mt-8 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Table of contents
          </p>
          <ol className="mt-3 columns-1 gap-x-8 text-sm sm:columns-2">
            {SECTIONS.map((s) => (
              <li key={s.id} className="mb-1.5 break-inside-avoid">
                <a
                  href={`#${s.id}`}
                  className="text-violet-700 hover:underline dark:text-violet-400"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="mt-8 space-y-8">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8"
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{section.title}</h2>
              <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
                {section.body}
              </div>
            </section>
          ))}
        </article>

        <footer className="mt-10 border-t border-slate-200 pt-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p>
            © {new Date().getFullYear()} {COMPANY}. All rights reserved.
          </p>
          <p className="mt-2">
            <Link href="/privacy" className="text-violet-700 hover:underline dark:text-violet-400">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/login" className="text-violet-700 hover:underline dark:text-violet-400">
              Sign in
            </Link>
            {" · "}
            <Link href="/signup" className="text-violet-700 hover:underline dark:text-violet-400">
              Create account
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
