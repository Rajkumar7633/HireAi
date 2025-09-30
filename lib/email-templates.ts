export interface ProfessionalTemplateProps {
  recipientName: string;
  heading?: string;
  messageHtml: string; // safe HTML string already sanitized upstream
  ctaUrl?: string;
  ctaLabel?: string;
  secondaryCtaUrl?: string;
  secondaryCtaLabel?: string;
  footerNote?: string;
  companyName?: string;
  companyWebsite?: string;
  logoUrl?: string;
  logoCid?: string; // optional inline CID for logo image
  hideLogoImage?: boolean; // force hide logo image and use monogram fallback
  preheader?: string;
  badge?: string; // e.g., Interview, Offer, Update
  details?: Record<string, string>; // key/value pairs rendered in a table
  includeGreeting?: boolean; // default true
  // Optional branding & signature
  brandColor?: string;   // primary brand color (e.g., #6d28d9)
  accentColor?: string;  // softer accent (e.g., #eef2ff)
  signatureHtml?: string; // recruiter signature block (safe HTML)
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildProfessionalTemplate({
  recipientName,
  heading = "Hello",
  messageHtml,
  ctaUrl,
  ctaLabel,
  secondaryCtaUrl,
  secondaryCtaLabel,
  footerNote,
  companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI",
  companyWebsite = process.env.NEXT_PUBLIC_COMPANY_WEBSITE || "https://hireai.example.com",
  logoUrl = process.env.NEXT_PUBLIC_COMPANY_LOGO || "https://dummyimage.com/120x32/6b46c1/ffffff&text=HireAI",
  logoCid,
  hideLogoImage,
  preheader = "",
  badge,
  details,
  includeGreeting = true,
  brandColor = process.env.NEXT_PUBLIC_BRAND_COLOR || "#6d28d9",
  accentColor = process.env.NEXT_PUBLIC_ACCENT_COLOR || "#eef2ff",
  signatureHtml,
}: ProfessionalTemplateProps) {
  const now = new Date();
  const formatted = now.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const safeRecipient = escapeHtml(recipientName || "there");

  const filteredDetails = details
    ? Object.entries(details).filter(([_, v]) => v != null && String(v).trim() !== "")
    : [];
  const iconFor = (k: string) => {
    const key = k.toLowerCase();
    if (key.includes("date")) return "📅 ";
    if (key.includes("time")) return "⏰ ";
    if (key.includes("location")) return "📍 ";
    if (key.includes("duration")) return "⏳ ";
    return "";
  };
  const detailsTable = filteredDetails.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:12px;overflow:hidden;margin:0">
        ${filteredDetails
      .map(
        ([k, v], idx) => `
          <tr style="${idx % 2 === 0 ? "background:#fafafa" : ""}">
            <td style="padding:8px 12px;color:#6b7280;font-size:13px;width:42%;vertical-align:top;">${escapeHtml(iconFor(k) + k)}</td>
            <td style="padding:8px 12px;color:#111827;font-size:14px;vertical-align:top;">${escapeHtml(v)}</td>
          </tr>`
      )
      .join("")}
       </table>`
    : "";

  const detailsHtml = filteredDetails.length
    ? `<div style="margin-top:22px;border:1px solid #eef2f7;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 6px 16px rgba(2,6,23,0.06)">
         <div style="padding:10px 14px;background:${accentColor};color:#111827;font-weight:700;font-size:12px;letter-spacing:.3px;text-transform:uppercase;">${badge === "Interview" ? "Interview Details" : "Details"}</div>
         <div style="padding:4px 4px 8px 4px">${detailsTable}</div>
       </div>`
    : "";

  const safePreheader = preheader
    ? `<div style="display:none!important;visibility:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(preheader)}</div>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(companyName)} Message</title>
    <style>
      body { margin:0; padding:0; background:#f7f8fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; color:#111827; }
      .container { max-width:680px; margin:0 auto; padding:24px; }
      .card { background:#ffffff; border-radius:16px; box-shadow:0 10px 34px rgba(2,6,23,0.10); overflow:hidden; }
      .topbar { height:4px; background:${brandColor}; }
      .header { padding:16px 22px; border-bottom:1px solid #eef2f7; display:flex; align-items:center; gap:12px; }
      .brand { font-weight:800; color:#3b0764; letter-spacing:0.2px; font-size:17px; }
      .ribbon { margin-left:auto; background:${accentColor}; background-image:linear-gradient(135deg, rgba(255,255,255,0.35), rgba(0,0,0,0.06)); color:#3730a3; font-size:11px; font-weight:700; padding:6px 12px; border-radius:999px; text-transform:uppercase; letter-spacing:0.3px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04); border:1px solid rgba(0,0,0,0.04); }
      .content { padding:32px 28px; line-height:1.7; font-size:16px; }
      .intro { margin:0 0 10px 0; font-size:17px; }
      .message { font-size:16px; color:#111827; }
      .divider { height:1px; background:#eef2f7; margin:24px 0; }
      .cta { margin-top:24px; }
      .btn { display:inline-block; background:${brandColor}; color:#fff !important; text-decoration:none; padding:12px 20px; border-radius:10px; font-weight:700; letter-spacing:0.2px; box-shadow:0 8px 22px rgba(0,0,0,0.10); }
      .btn.secondary { background:#e5e7eb; color:#111827 !important; }
      .muted { color:#6b7280; font-size:12px; }
      .footer { text-align:center; color:#6b7280; font-size:12px; padding:20px 8px 0; }
      a { color:#4f46e5; }
    </style>
  </head>
  <body>
    ${safePreheader}
    <div class="container">
      <div class="card">
        <div class="topbar"></div>
        <div class="header">
          ${hideLogoImage ? `
            <div style="width:28px;height:28px;border-radius:6px;background:${brandColor};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;letter-spacing:0.2px">${escapeHtml((companyName || '')[0] || '•')}</div>
          ` : `
            <img src="${logoCid ? `cid:${logoCid}` : logoUrl}" alt="${escapeHtml(companyName)}" height="28" style="display:block; border-radius:4px;" />
          `}
          <div class="brand">${escapeHtml(companyName)}</div>
          ${badge ? `<div class="ribbon">${escapeHtml(badge)}</div>` : `<div style="margin-left:auto" class="muted">${escapeHtml(formatted)}</div>`}
        </div>
        <div class="content">
          ${includeGreeting ? `<p class="intro"><strong>${escapeHtml(heading)}, ${safeRecipient}</strong></p>` : ""}
          <div class="message">${messageHtml}</div>
          ${detailsHtml}
          ${(ctaUrl && ctaLabel) || (secondaryCtaUrl && secondaryCtaLabel) ? `
            <div class="divider"></div>
            <div class="cta">
              ${ctaUrl && ctaLabel ? `<a class="btn" href="${ctaUrl}" target="_blank" rel="noreferrer" style="margin-right:10px">${escapeHtml(ctaLabel)}</a>` : ""}
              ${secondaryCtaUrl && secondaryCtaLabel ? `<a class="btn secondary" href="${secondaryCtaUrl}" target="_blank" rel="noreferrer">${escapeHtml(secondaryCtaLabel)}</a>` : ""}
            </div>` : ""}
          ${signatureHtml ? `<div class="divider"></div><div class="message">${signatureHtml}</div>` : ""}
          ${footerNote ? `<div class="divider"></div><p class="muted" style="margin-top:6px;">${escapeHtml(footerNote)}</p>` : ""}
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${escapeHtml(companyName)} • <a href="${companyWebsite}" target="_blank" rel="noreferrer">${companyWebsite}</a></p>
      </div>
    </div>
  </body>
</html>`;
}
