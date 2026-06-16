import Link from "next/link"
import { ArrowLeft, Lock, Shield } from "lucide-react"

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI"
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@hireai.app"
const LAST_UPDATED = "June 8, 2026"

export const metadata = {
  title: `Privacy Policy — ${COMPANY}`,
  description: `Privacy Policy for ${COMPANY} recruitment and talent platform.`,
}

const SECTIONS = [
  {
    id: "overview",
    title: "1. Overview",
    body: (
      <p>
        {COMPANY} (&quot;we&quot;, &quot;us&quot;) respects your privacy. This Privacy Policy explains what
        personal data we collect, how we use and share it, how long we keep it, and the choices available to you
        when you use our recruitment, assessment, and campus placement platform.
      </p>
    ),
  },
  {
    id: "collect",
    title: "2. Information we collect",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Account data:</strong> name, email address, password (stored hashed), role, phone (if provided),
          and profile photo.
        </li>
        <li>
          <strong>Professional data:</strong> resumes, skills, work history, education, applications, assessment
          responses, coding submissions, and interview recordings where enabled.
        </li>
        <li>
          <strong>Recruiter data:</strong> company name, job postings, pipeline notes, email templates, and
          billing information for paid plans.
        </li>
        <li>
          <strong>Usage data:</strong> IP address, browser type, device identifiers, pages visited, feature
          interactions, and security logs.
        </li>
        <li>
          <strong>Communications:</strong> in-app messages, emails sent through the Platform, and support tickets.
        </li>
      </ul>
    ),
  },
  {
    id: "use",
    title: "3. How we use your information",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Create and secure your account (including OTP login and password reset codes).</li>
        <li>Match job seekers to roles and power recruiter search, filtering, and AI recommendations.</li>
        <li>Deliver assessments, coding tests, video interviews, and analytics dashboards.</li>
        <li>Send transactional emails: login codes, password resets, application updates, and interview invites.</li>
        <li>Prevent fraud, abuse, and unauthorized access; enforce our Terms of Service.</li>
        <li>Improve product quality, fix bugs, and develop new features (often using aggregated or de-identified data).</li>
        <li>Comply with legal obligations and respond to lawful requests.</li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "4. How we share information",
    body: (
      <>
        <p className="mb-3 font-medium text-slate-900 dark:text-white">We do not sell your personal data.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>With recruiters:</strong> when you apply to a job, accept an invitation, or opt into visibility,
            your profile and relevant assessment results may be shared.
          </li>
          <li>
            <strong>With colleges:</strong> placement data may be visible to authorized college administrators for
            campus drives you participate in.
          </li>
          <li>
            <strong>Service providers:</strong> hosting, email delivery, payment processing, and analytics vendors
            under data-processing agreements.
          </li>
          <li>
            <strong>Legal & safety:</strong> when required by law, court order, or to protect rights, safety, and
            security of users and the Platform.
          </li>
          <li>
            <strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets, subject
            to this Policy.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "security",
    title: "5. Security",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Passwords are hashed using industry-standard algorithms; we do not store plain-text passwords.</li>
        <li>Password reset tokens and OTP codes are hashed and expire after a short period.</li>
        <li>Access to data is restricted by role (job seeker, recruiter, college admin, internal staff).</li>
        <li>We use HTTPS in production and monitor for suspicious activity.</li>
        <li>
          No method of transmission or storage is 100% secure. Report concerns to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 underline dark:text-violet-400">
            {CONTACT_EMAIL}
          </a>
          .
        </li>
      </ul>
    ),
  },
  {
    id: "retention",
    title: "6. Data retention",
    body: (
      <p>
        We retain personal data while your account is active and as needed to provide the service, resolve disputes,
        enforce agreements, and meet legal or regulatory requirements. Recruiters may retain export copies under
        their own policies. You may request deletion subject to applicable law and legitimate business needs.
      </p>
    ),
  },
  {
    id: "rights",
    title: "7. Your rights & choices",
    body: (
      <ul className="list-disc space-y-2 pl-5">
        <li>Access, correct, or update profile information in your dashboard where available.</li>
        <li>Request a copy or deletion of your data by contacting {CONTACT_EMAIL}.</li>
        <li>Opt out of non-essential marketing emails via unsubscribe links or settings.</li>
        <li>Depending on your region (e.g. GDPR, CCPA), you may have additional rights to portability or restriction.</li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "8. Cookies & similar technologies",
    body: (
      <p>
        We use essential cookies and local storage for authentication sessions and security. Optional analytics
        cookies, if enabled, help us understand how the Platform is used. You can control cookies through your
        browser settings; disabling essential cookies may limit functionality.
      </p>
    ),
  },
  {
    id: "children",
    title: "9. Children",
    body: (
      <p>
        The Platform is not directed at children under 16. We do not knowingly collect personal data from children.
        Contact us if you believe a child has provided data and we will delete it promptly.
      </p>
    ),
  },
  {
    id: "international",
    title: "10. International transfers",
    body: (
      <p>
        Your data may be processed in countries other than your own. Where required, we use appropriate safeguards
        (such as standard contractual clauses) for cross-border transfers.
      </p>
    ),
  },
  {
    id: "changes",
    title: "11. Changes to this Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. We will post the revised version with an updated date
        and, for material changes, provide notice by email or in the app. Continued use after changes take effect
        means you accept the updated Policy.
      </p>
    ),
  },
  {
    id: "contact",
    title: "12. Contact us",
    body: (
      <p>
        Privacy questions or requests:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-700 underline dark:text-violet-400">
          {CONTACT_EMAIL}
        </a>
        . Read our{" "}
        <Link href="/terms" className="text-violet-700 underline dark:text-violet-400">
          Terms of Service
        </Link>
        .
      </p>
    ),
  },
]

export default function PrivacyPage() {
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
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Privacy Policy
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {COMPANY} · Last updated: {LAST_UPDATED}
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">
                How we collect, use, and protect your personal information on {COMPANY}.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Shield className="h-3.5 w-3.5" /> Your data, your rights
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
                <a href={`#${s.id}`} className="text-violet-700 hover:underline dark:text-violet-400">
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
            <Link href="/terms" className="text-violet-700 hover:underline dark:text-violet-400">
              Terms of Service
            </Link>
            {" · "}
            <Link href="/login" className="text-violet-700 hover:underline dark:text-violet-400">
              Sign in
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
