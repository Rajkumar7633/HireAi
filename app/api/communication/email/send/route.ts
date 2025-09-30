import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import EmailTemplate from "@/models/EmailTemplate";
import { sendEmail, renderTemplate } from "@/lib/email-service";
import { buildProfessionalTemplate } from "@/lib/email-templates";
import { buildIcs } from "@/lib/ics";
import jwt from "jsonwebtoken";
import EmailLog from "@/models/EmailLog";
import Application from "@/models/Application";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { to, templateId, variables = {}, subjectOverride, ctaUrl, ctaLabel, subject: rawSubject, content: rawContentInput } = await request.json();

    if (!to) return NextResponse.json({ message: "Missing 'to'" }, { status: 400 });

    await connectDB();

    let subjectFromDb: string | undefined;
    let contentFromDb: string | undefined;
    if (templateId) {
      const template = await EmailTemplate.findOne({
        _id: templateId,
        $or: [{ createdBy: session.userId }, { isDefault: true }],
      }).lean();
      if (!template) return NextResponse.json({ message: "Template not found" }, { status: 404 });
      subjectFromDb = (template as any).subject;
      contentFromDb = (template as any).content;
    }

    const baseSubject = subjectFromDb ?? rawSubject;
    const baseContent = contentFromDb ?? rawContentInput;
    if (!baseSubject || !baseContent) {
      return NextResponse.json({ message: "Missing 'templateId' or raw 'subject' and 'content'" }, { status: 400 });
    }

    const subject = subjectOverride || renderTemplate(baseSubject, variables);
    const rawContent = renderTemplate(baseContent, variables);

    const recipientName = variables.candidateName || variables.name || "there";

    // Detect interview context early
    const hasInterview = !!(
      variables.interviewDate &&
      variables.interviewTime &&
      (variables.duration || variables.interviewDuration)
    );

    // Helper formatters
    const formatDate = (isoLike: string) => {
      const d = new Date(isoLike);
      try {
        return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "2-digit" });
      } catch {
        return isoLike;
      }
    };
    const formatTime = (hhmm: string) => {
      const [hStr, mStr] = String(hhmm).split(":");
      let h = parseInt(hStr || "0", 10);
      const m = parseInt(mStr || "0", 10);
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      const mm = (m < 10 ? "0" : "") + m;
      return `${h}:${mm} ${ampm}`;
    };
    const formatDuration = (min: number) => {
      if (!isFinite(min) || min <= 0) return "";
      const h = Math.floor(min / 60);
      const m = min % 60;
      const parts: string[] = [];
      if (h) parts.push(`${h} hr${h > 1 ? "s" : ""}`);
      if (m) parts.push(`${m} min`);
      return parts.join(" ") || `${min} min`;
    };

    // Build details and preheader for interview emails
    let badge: string | undefined;
    let details: Record<string, string> | undefined;
    let preheader: string | undefined;
    const prettyTime = (s: string) => s;
    if (hasInterview) {
      badge = "Interview";
      details = {
        Date: formatDate(String(variables.interviewDate)),
        Time: formatTime(String(variables.interviewTime)),
        Location: String(variables.interviewLocation || variables.location || "Online"),
        Duration: formatDuration(Number(variables.duration || variables.interviewDuration || 30)),
      };
      preheader = renderTemplate("Interview invitation for {{jobTitle}}", variables);
    }

    // Determine if the raw content already has a greeting like Hello/Dear to avoid duplication
    const contentHasGreeting = /^\s*(hello|dear)\b/i.test(rawContent);

    // Yes/No confirmation links (untracked target URLs for now)
    let primaryUrl = ctaUrl;
    let secondaryUrl: string | undefined;
    let primaryLabel = ctaLabel;
    let secondaryLabel: string | undefined;

    const origin = new URL(request.url).origin;
    if (hasInterview && variables.applicationId) {
      const secret = process.env.JWT_SECRET || "dev-secret";
      const yesToken = jwt.sign({ applicationId: String(variables.applicationId), response: "yes" }, secret, { expiresIn: "7d" });
      const noToken = jwt.sign({ applicationId: String(variables.applicationId), response: "no" }, secret, { expiresIn: "7d" });
      primaryUrl = `${origin}/api/communication/email/confirm?token=${encodeURIComponent(yesToken)}`;
      primaryLabel = primaryLabel || "Yes, I can attend";
      secondaryUrl = `${origin}/api/communication/email/confirm?token=${encodeURIComponent(noToken)}`;
      secondaryLabel = "No, I can’t";
    }

    // Create an EmailLog now to embed tracking
    let logDoc: any = null;
    try {
      let appDoc: any = null;
      if (variables.applicationId) {
        appDoc = await (Application as any).findOne({ _id: variables.applicationId }, { jobDescriptionId: 1, jobSeekerId: 1 }).lean();
      }
      logDoc = await (EmailLog as any).create({
        to,
        subject, // preliminary
        templateId: templateId || undefined,
        variables,
        applicationId: variables.applicationId || undefined,
        jobDescriptionId: appDoc?.jobDescriptionId,
        jobSeekerId: appDoc?.jobSeekerId,
        recruiterId: session.userId,
        category: hasInterview ? "interview" : undefined,
        sentAt: new Date(),
      });
    } catch { }

    // Wrap CTAs with tracked click redirect if log exists
    const track = (url?: string) => (logDoc && url ? `${origin}/api/communication/email/click?id=${String(logDoc._id)}&target=${encodeURIComponent(url)}` : url);
    const trackedPrimary = track(primaryUrl);
    const trackedSecondary = track(secondaryUrl);

    // Fetch recruiter profile for branding/signature
    let recruiter: any = null;
    try {
      recruiter = await (User as any).findById(session.userId).lean();
    } catch { }

    const companyName = recruiter?.companyName || process.env.NEXT_PUBLIC_COMPANY_NAME;
    const companyWebsite = recruiter?.website || process.env.NEXT_PUBLIC_COMPANY_WEBSITE;
    const logoUrl = recruiter?.companyLogo || process.env.NEXT_PUBLIC_COMPANY_LOGO;
    const brandColor = process.env.NEXT_PUBLIC_BRAND_COLOR || "#6d28d9";
    const accentColor = process.env.NEXT_PUBLIC_ACCENT_COLOR || "#eef2ff";

    const signatureLines: string[] = [];
    if (variables.recruiterName || recruiter?.name) signatureLines.push(`<strong>${variables.recruiterName || recruiter?.name}</strong>`);
    if (companyName) signatureLines.push(companyName);
    // Per request: do NOT include recruiter phone number
    if (companyWebsite) signatureLines.push(`<a href="${companyWebsite}" target="_blank" rel="noreferrer">${companyWebsite}</a>`);
    const signatureHtml = signatureLines.length ? `<p>${signatureLines.join("<br/>")}</p>` : undefined;

    // If content already includes a manual 'Interview Details' section, strip it and rely on the details card only
    let contentForHtml = rawContent;
    if (hasInterview) {
      // Remove a block beginning with 'Interview Details' and up to 10 following bullet/blank lines
      const lines = contentForHtml.split(/\r?\n/);
      const out: string[] = [];
      let skipping = false;
      let skipCount = 0;
      for (const line of lines) {
        if (!skipping && /^(\s*|\s*[*-]\s*)?Interview Details:?/i.test(line)) {
          skipping = true; skipCount = 0; continue;
        }
        if (skipping) {
          // skip bullets like '- Date:', '- Time:', etc. and blank lines
          if (/^\s*[-*]\s*/.test(line) || /^\s*$/.test(line)) {
            skipCount++;
            if (skipCount > 10) skipping = false; // safety
            continue;
          }
          // first non-bullet line ends skipping
          skipping = false;
        }
        out.push(line);
      }
      contentForHtml = out.join("\n");
      // collapse multiple blank lines
      contentForHtml = contentForHtml.replace(/\n{3,}/g, "\n\n");
    }

    // Prepare inline logo attachment (CID) when logoUrl is provided; inline bytes for raster images.
    let logoCid: string | undefined;
    let attachments: any[] | undefined;
    let hideLogoImage = false;
    try {
      if (logoUrl && logoUrl.startsWith('data:')) {
        // Handle data URL like data:image/png;base64,....
        const match = /^data:([^;]+);base64,(.+)$/i.exec(logoUrl);
        if (match) {
          const ct = match[1];
          const b64 = match[2];
          logoCid = 'logo@inline';
          const buf = Buffer.from(b64, 'base64');
          if (/svg\+xml|image\/svg/i.test(ct)) {
            // Do not embed SVG; use monogram fallback for reliability
            hideLogoImage = true;
            logoCid = undefined;
          } else {
            const filename = ct.includes('png') ? 'logo.png' : ct.includes('jpeg') || ct.includes('jpg') ? 'logo.jpg' : 'logo.bin';
            attachments = [{ filename, content: buf, cid: logoCid, contentType: ct }];
          }
        }
      } else if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
        const urlObj = new URL(logoUrl);
        logoCid = `logo@${urlObj.hostname}`;
        // Fetch the asset. If it's a raster image, embed bytes. If SVG, attach as-is or fall back to remote path.
        try {
          const ac = new AbortController();
          const t = setTimeout(() => ac.abort(), 7000);
          const res = await fetch(logoUrl, { signal: ac.signal });
          clearTimeout(t);
          if (res.ok) {
            const ct = res.headers.get("content-type") || "";
            const buf = Buffer.from(await res.arrayBuffer());
            if (/svg\+xml|image\/svg/i.test(ct) || (urlObj.pathname.endsWith('.svg'))) {
              // Avoid SVG in emails: show monogram instead
              hideLogoImage = true;
              logoCid = undefined;
            } else if (/^image\//i.test(ct)) {
              // Use original bytes; keep provided content type
              const filename = urlObj.pathname.split('/').pop() || 'logo';
              attachments = [{ filename, content: buf, cid: logoCid, contentType: ct.split(';')[0] }];
            } else {
              // Unknown type: prefer monogram fallback
              hideLogoImage = true;
              logoCid = undefined;
            }
          } else {
            // Fetch failed: prefer monogram fallback
            hideLogoImage = true;
            logoCid = undefined;
          }
        } catch {
          // Network/timeout: prefer monogram fallback
          hideLogoImage = true;
          logoCid = undefined;
        }
      } else if (logoUrl && logoUrl.startsWith('/')) {
        // Relative path: make absolute with origin and fetch
        const absolute = `${origin}${logoUrl}`;
        const urlObj = new URL(absolute);
        logoCid = `logo@${urlObj.hostname}`;
        try {
          const ac = new AbortController();
          const t = setTimeout(() => ac.abort(), 7000);
          const res = await fetch(absolute, { signal: ac.signal });
          clearTimeout(t);
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            const buf = Buffer.from(await res.arrayBuffer());
            if (/^image\//i.test(ct)) {
              const filename = urlObj.pathname.split('/').pop() || 'logo';
              attachments = [{ filename, content: buf, cid: logoCid, contentType: ct.split(';')[0] }];
            } else {
              attachments = [{ filename: urlObj.pathname.split('/').pop() || 'logo.png', path: absolute, cid: logoCid, contentType: 'image/png' }];
            }
          } else {
            attachments = [{ filename: urlObj.pathname.split('/').pop() || 'logo.png', path: absolute, cid: logoCid, contentType: 'image/png' }];
          }
        } catch {
          attachments = [{ filename: urlObj.pathname.split('/').pop() || 'logo.png', path: absolute, cid: logoCid, contentType: 'image/png' }];
        }
      }
    } catch { }

    const htmlBody = buildProfessionalTemplate({
      recipientName,
      heading: "Hello",
      messageHtml: contentForHtml.replace(/\n/g, "<br/>")
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
      ctaUrl: trackedPrimary,
      ctaLabel: primaryLabel,
      secondaryCtaUrl: trackedSecondary,
      secondaryCtaLabel: secondaryLabel,
      footerNote: "This message was sent to you by a recruiter via HireAI.",
      badge,
      details,
      preheader,
      includeGreeting: !contentHasGreeting,
      companyName,
      companyWebsite,
      logoUrl,
      logoCid,
      brandColor,
      accentColor,
      signatureHtml,
      hideLogoImage,
    });

    // Append open pixel if we have a log id
    const pixel = logDoc ? `<img src="${origin}/api/communication/email/open?id=${String(logDoc._id)}" width="1" height="1" style="display:none" alt=""/>` : "";
    const html = `${htmlBody}${pixel}`;

    // Optional ICS invite for interview templates/variables
    // Preserve ICS attachments (and merge with logo when present)
    if (!attachments) attachments = undefined;
    if (hasInterview) {
      try {
        const dateStr = String(variables.interviewDate); // e.g., 2025-09-26
        const timeStr = String(variables.interviewTime); // e.g., 14:30
        const durationMin = Number(variables.duration || variables.interviewDuration || 30);
        const location = variables.interviewLocation || variables.location || "Online";

        const [hour, minute] = timeStr.split(":").map((v: string) => parseInt(v, 10));
        const startLocal = new Date(dateStr);
        startLocal.setHours(hour || 9, minute || 0, 0, 0);
        // convert to UTC preserving local wall time offset
        const startUtc = new Date(startLocal.getTime());
        const endUtc = new Date(startUtc.getTime() + durationMin * 60 * 1000);

        const organizerName = variables.recruiterName || session.name || "Recruiter";
        const organizerEmail = session.email || process.env.EMAIL_SERVICE_USER || process.env.SMTP_USER || "noreply@example.com";

        const ics = buildIcs({
          summary: renderTemplate("Interview - {{jobTitle}}", variables),
          description: rawContent.replace(/<[^>]+>/g, " ").slice(0, 2000),
          start: startUtc,
          end: endUtc,
          location,
          organizer: { name: organizerName, email: organizerEmail },
          attendees: [{ name: recipientName, email: to }],
        });
        const icsAttachment = {
          filename: "invite.ics",
          content: ics,
          contentType: "text/calendar; method=REQUEST; charset=UTF-8",
        };
        attachments = attachments ? [...attachments, icsAttachment] : [icsAttachment];
      } catch (e) {
        // continue without ICS if parsing fails
      }
    }

    const result = await sendEmail({ to, subject, html, attachments });

    // Update log with final subject if needed
    try {
      if (logDoc) {
        await (EmailLog as any).findByIdAndUpdate(String(logDoc._id), { $set: { subject } });
      }
    } catch { }
    return NextResponse.json({ ok: true, to, result });
  } catch (e: any) {
    console.error("send recruiter email error", e);
    return NextResponse.json({ ok: false, message: e?.message || "Failed to send email" }, { status: 500 });
  }
}
