"use client";

import React from "react";
import { Mail, Phone, MapPin, Globe, Github, Linkedin } from "lucide-react";

export interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    address?: string;
  };
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    major?: string;
    institution: string;
    location?: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
  }>;
  skills: string[];
  projects: Array<{
    title: string;
    description?: string;
    technologies?: string[];
    url?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer?: string;
    issueDate?: string;
  }>;
  awards: Array<{
    name: string;
    date?: string;
    description?: string;
  }>;
  languages?: string[];
  interests?: string[];
}

export type TemplateId = "classic" | "minimal" | "modern" | "executive" | "elegant" | "tech" | "faang";

interface ResumePreviewProps {
  data: ResumeData;
  template?: TemplateId | string;
  theme?: { accentColor?: string; fontFamily?: string };
}

function fmtMonth(d: string) {
  if (!d) return "";
  try { return new Date(d + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }); } catch { return d; }
}
function fmtFull(d: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }); } catch { return d; }
}

export function ResumePreview({ data, template = "classic", theme }: ResumePreviewProps) {
  const accent = theme?.accentColor || "#7c3aed";
  const font = theme?.fontFamily;
  const base: React.CSSProperties = { fontFamily: font || "system-ui, -apple-system, sans-serif" };

  const p = data.personalInfo;
  const contacts = [
    p.email && { icon: <Mail className="w-3 h-3" />, val: p.email },
    p.phone && { icon: <Phone className="w-3 h-3" />, val: p.phone },
    p.address && { icon: <MapPin className="w-3 h-3" />, val: p.address },
    p.linkedin && { icon: <Linkedin className="w-3 h-3" />, val: p.linkedin },
    p.github && { icon: <Github className="w-3 h-3" />, val: p.github },
    p.portfolio && { icon: <Globe className="w-3 h-3" />, val: p.portfolio },
  ].filter(Boolean) as { icon: React.ReactNode; val: string }[];

  /* ─────────────────── CLASSIC / FAANG ─────────────────── */
  if (template === "classic" || template === "faang") {
    return (
      <div style={{ ...base, background: "#fff", color: "#111", padding: "40px 44px", fontSize: 13, lineHeight: 1.55, maxWidth: 816 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, color: "#111" }}>{p.name || "Your Name"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 16px", marginTop: 6, color: "#444", fontSize: 12 }}>
            {contacts.map((c, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{c.icon} {c.val}</span>
            ))}
          </div>
        </div>

        {/* Summary */}
        {data.summary && <Section title="PROFESSIONAL SUMMARY" accent={accent}><p style={{ color: "#333" }}>{data.summary}</p></Section>}

        {/* Skills */}
        {data.skills.length > 0 && (
          <Section title="TECHNICAL SKILLS" accent={accent}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 6px" }}>
              {data.skills.map((s, i) => (
                <span key={i} style={{ background: "#f5f3ff", borderLeft: `3px solid ${accent}`, padding: "2px 8px", borderRadius: 3, fontSize: 11, fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Experience */}
        {data.experience.length > 0 && (
          <Section title="PROFESSIONAL EXPERIENCE" accent={accent}>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.title}</div>
                    <div style={{ color: "#555", fontWeight: 500 }}>{e.company}{e.location && ` · ${e.location}`}</div>
                  </div>
                  <div style={{ color: "#666", fontSize: 12, whiteSpace: "nowrap" }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</div>
                </div>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                  {e.description.map((d, j) => <li key={j} style={{ color: "#333", marginBottom: 2 }}>{d}</li>)}
                </ul>
              </div>
            ))}
          </Section>
        )}

        {/* Projects */}
        {data.projects.length > 0 && (
          <Section title="PROJECTS" accent={accent}>
            {data.projects.map((p2, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 700 }}>{p2.title}</div>
                  {p2.url && <div style={{ color: "#2563eb", fontSize: 11 }}>{p2.url}</div>}
                </div>
                {p2.description && <p style={{ color: "#333", margin: "3px 0" }}>{p2.description}</p>}
                {p2.technologies?.length && <p style={{ color: "#666", fontSize: 11 }}><b>Tech:</b> {p2.technologies.join(", ")}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Education */}
        {data.education.length > 0 && (
          <Section title="EDUCATION" accent={accent}>
            {data.education.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{e.degree}{e.major && ` in ${e.major}`}</div>
                  <div style={{ color: "#555", fontSize: 12 }}>{e.institution}{e.location && ` · ${e.location}`}</div>
                  {e.gpa && <div style={{ color: "#666", fontSize: 11 }}>GPA: {e.gpa}</div>}
                </div>
                <div style={{ color: "#666", fontSize: 12, whiteSpace: "nowrap" }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</div>
              </div>
            ))}
          </Section>
        )}

        <BottomSections data={data} accent={accent} fmtFull={fmtFull} />
      </div>
    );
  }

  /* ─────────────────── MINIMAL ─────────────────── */
  if (template === "minimal") {
    return (
      <div style={{ ...base, background: "#fff", color: "#111", padding: "44px 52px", fontSize: 12.5, lineHeight: 1.6, maxWidth: 816 }}>
        <div style={{ borderBottom: `2px solid ${accent}`, paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: 2, color: "#111" }}>{p.name || "Your Name"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, color: "#666", fontSize: 11.5 }}>
            {contacts.map((c, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{c.icon} {c.val}</span>)}
          </div>
        </div>

        {data.summary && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 5 }}>Summary</div>
            <p style={{ color: "#444" }}>{data.summary}</p>
          </div>
        )}

        {data.skills.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 5 }}>Skills</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {data.skills.map((s, i) => <span key={i} style={{ border: `1px solid #e5e7eb`, padding: "1px 8px", borderRadius: 2, fontSize: 11, color: "#333" }}>{s}</span>)}
            </div>
          </div>
        )}

        {data.experience.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8 }}>Experience</div>
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{e.title}</span>
                  <span style={{ color: "#888", fontSize: 11 }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</span>
                </div>
                <div style={{ color: "#666", fontSize: 11.5, marginBottom: 3 }}>{e.company}{e.location && ` · ${e.location}`}</div>
                <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                  {e.description.map((d, j) => <li key={j} style={{ color: "#444", marginBottom: 1 }}>{d}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {data.projects.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8 }}>Projects</div>
            {data.projects.map((pr, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{pr.title}</span>
                  {pr.url && <span style={{ color: "#2563eb", fontSize: 10 }}>{pr.url}</span>}
                </div>
                {pr.description && <p style={{ color: "#444", fontSize: 12 }}>{pr.description}</p>}
                {pr.technologies?.length && <p style={{ color: "#888", fontSize: 10.5 }}>{pr.technologies.join(" · ")}</p>}
              </div>
            ))}
          </div>
        )}

        {data.education.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8 }}>Education</div>
            {data.education.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.degree}{e.major && ` in ${e.major}`}</div>
                  <div style={{ color: "#666", fontSize: 11.5 }}>{e.institution}{e.location && ` · ${e.location}`}{e.gpa && ` · GPA: ${e.gpa}`}</div>
                </div>
                <div style={{ color: "#888", fontSize: 11, whiteSpace: "nowrap" }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</div>
              </div>
            ))}
          </div>
        )}

        <BottomSections data={data} accent={accent} fmtFull={fmtFull} />
      </div>
    );
  }

  /* ─────────────────── MODERN (Colored Sidebar) ─────────────────── */
  if (template === "modern") {
    return (
      <div style={{ ...base, display: "flex", maxWidth: 816, background: "#fff", color: "#111", boxShadow: "0 2px 24px rgba(0,0,0,0.10)" }}>
        {/* Sidebar */}
        <div style={{ width: 230, background: accent, color: "#fff", padding: "36px 22px", flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>{p.name || "Your Name"}</div>
          <div style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.7 }}>
            {contacts.map((c, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, wordBreak: "break-all" }}>{c.icon} {c.val}</div>)}
          </div>

          {data.skills.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.75, marginBottom: 8 }}>Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {data.skills.map((s, i) => <span key={i} style={{ background: "rgba(255,255,255,0.18)", padding: "2px 8px", borderRadius: 3, fontSize: 10.5 }}>{s}</span>)}
              </div>
            </div>
          )}

          {data.education.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.75, marginBottom: 8 }}>Education</div>
              {data.education.map((e, i) => (
                <div key={i} style={{ marginBottom: 10, fontSize: 11 }}>
                  <div style={{ fontWeight: 700 }}>{e.degree}</div>
                  {e.major && <div style={{ opacity: 0.8 }}>{e.major}</div>}
                  <div style={{ opacity: 0.75 }}>{e.institution}</div>
                  <div style={{ opacity: 0.65, fontSize: 10 }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</div>
                  {e.gpa && <div style={{ opacity: 0.65, fontSize: 10 }}>GPA: {e.gpa}</div>}
                </div>
              ))}
            </div>
          )}

          {data.languages && data.languages.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>Languages</div>
              {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11, opacity: 0.9 }}>{l}</div>)}
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "36px 32px", fontSize: 12.5, lineHeight: 1.55 }}>
          {data.summary && (
            <div style={{ marginBottom: 18 }}>
              <SidebarSection title="Profile" accent={accent} />
              <p style={{ color: "#444" }}>{data.summary}</p>
            </div>
          )}

          {data.experience.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SidebarSection title="Experience" accent={accent} />
              {data.experience.map((e, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{e.title}</div>
                    <div style={{ color: "#888", fontSize: 11 }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</div>
                  </div>
                  <div style={{ color: "#666", fontSize: 11.5, marginBottom: 3 }}>{e.company}{e.location && ` · ${e.location}`}</div>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                    {e.description.map((d, j) => <li key={j} style={{ color: "#333", marginBottom: 2 }}>{d}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {data.projects.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SidebarSection title="Projects" accent={accent} />
              {data.projects.map((pr, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 600 }}>{pr.title}</div>
                    {pr.url && <div style={{ color: "#2563eb", fontSize: 10.5 }}>{pr.url}</div>}
                  </div>
                  {pr.description && <p style={{ color: "#444", fontSize: 12 }}>{pr.description}</p>}
                  {pr.technologies?.length && <p style={{ color: "#888", fontSize: 11 }}>{pr.technologies.join(" · ")}</p>}
                </div>
              ))}
            </div>
          )}

          {data.certifications.length > 0 && (
            <div>
              <SidebarSection title="Certifications" accent={accent} />
              {data.certifications.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <div style={{ fontWeight: 500 }}>{c.name}{c.issuer && <span style={{ color: "#888", fontWeight: 400 }}> · {c.issuer}</span>}</div>
                  {c.issueDate && <div style={{ color: "#888", fontSize: 11 }}>{fmtFull(c.issueDate)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────── EXECUTIVE (Premium two-column with banner) ─────────────────── */
  if (template === "executive") {
    return (
      <div style={{ ...base, maxWidth: 816, background: "#fff", color: "#111" }}>
        {/* Banner Header */}
        <div style={{ background: `linear-gradient(135deg, ${accent} 0%, #1e1b4b 100%)`, color: "#fff", padding: "32px 40px" }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>{p.name || "Your Name"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 11.5, opacity: 0.88 }}>
            {contacts.map((c, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>{c.icon} {c.val}</span>)}
          </div>
        </div>

        <div style={{ display: "flex" }}>
          {/* Left col */}
          <div style={{ width: 220, padding: "24px 18px 24px 28px", borderRight: "1px solid #f0f0f0", flexShrink: 0 }}>
            {data.skills.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8, borderBottom: `1px solid ${accent}`, paddingBottom: 4 }}>Core Skills</div>
                {data.skills.map((s, i) => (
                  <div key={i} style={{ fontSize: 11.5, padding: "3px 0", borderBottom: "1px solid #f5f5f5", color: "#333" }}>
                    <span style={{ color: accent, marginRight: 5 }}>▸</span>{s}
                  </div>
                ))}
              </div>
            )}

            {data.education.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8, borderBottom: `1px solid ${accent}`, paddingBottom: 4 }}>Education</div>
                {data.education.map((e, i) => (
                  <div key={i} style={{ marginBottom: 10, fontSize: 11.5 }}>
                    <div style={{ fontWeight: 700 }}>{e.degree}</div>
                    {e.major && <div style={{ color: "#555" }}>{e.major}</div>}
                    <div style={{ color: "#666" }}>{e.institution}</div>
                    <div style={{ color: "#888", fontSize: 10.5 }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</div>
                    {e.gpa && <div style={{ color: "#888", fontSize: 10.5 }}>GPA: {e.gpa}</div>}
                  </div>
                ))}
              </div>
            )}

            {data.certifications.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8, borderBottom: `1px solid ${accent}`, paddingBottom: 4 }}>Certifications</div>
                {data.certifications.map((c, i) => (
                  <div key={i} style={{ fontSize: 11.5, marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.issuer && <div style={{ color: "#666", fontSize: 10.5 }}>{c.issuer}</div>}
                  </div>
                ))}
              </div>
            )}

            {data.languages && data.languages.length > 0 && (
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8, borderBottom: `1px solid ${accent}`, paddingBottom: 4 }}>Languages</div>
                {data.languages.map((l, i) => <div key={i} style={{ fontSize: 11.5, color: "#333" }}>{l}</div>)}
              </div>
            )}
          </div>

          {/* Right col */}
          <div style={{ flex: 1, padding: "24px 28px", fontSize: 12.5, lineHeight: 1.55 }}>
            {data.summary && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8, borderBottom: `1px solid ${accent}`, paddingBottom: 4 }}>Executive Summary</div>
                <p style={{ color: "#333", fontStyle: "italic" }}>{data.summary}</p>
              </div>
            )}

            {data.experience.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 10, borderBottom: `1px solid ${accent}`, paddingBottom: 4 }}>Professional Experience</div>
                {data.experience.map((e, i) => (
                  <div key={i} style={{ marginBottom: 14, paddingLeft: 10, borderLeft: `3px solid ${accent}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13.5 }}>{e.title}</div>
                        <div style={{ color: "#555", fontWeight: 500 }}>{e.company}{e.location && ` · ${e.location}`}</div>
                      </div>
                      <div style={{ color: "#888", fontSize: 11, whiteSpace: "nowrap", background: "#f9f9f9", padding: "2px 8px", borderRadius: 3 }}>
                        {fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}
                      </div>
                    </div>
                    <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
                      {e.description.map((d, j) => <li key={j} style={{ color: "#333", marginBottom: 2 }}>{d}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {data.projects.length > 0 && (
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 10, borderBottom: `1px solid ${accent}`, paddingBottom: 4 }}>Key Projects</div>
                {data.projects.map((pr, i) => (
                  <div key={i} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: `3px solid #e5e7eb` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 700 }}>{pr.title}</div>
                      {pr.url && <div style={{ color: "#2563eb", fontSize: 10.5 }}>{pr.url}</div>}
                    </div>
                    {pr.description && <p style={{ color: "#444", fontSize: 12 }}>{pr.description}</p>}
                    {pr.technologies?.length && <p style={{ color: "#888", fontSize: 11 }}><b>Stack:</b> {pr.technologies.join(", ")}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────── ELEGANT (Serif-inspired, thin lines) ─────────────────── */
  if (template === "elegant") {
    const elegantFont = font || "Georgia, 'Times New Roman', serif";
    return (
      <div style={{ ...base, fontFamily: elegantFont, background: "#fffef9", color: "#111", padding: "44px 52px", fontSize: 12.5, lineHeight: 1.65, maxWidth: 816 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#111" }}>{p.name || "Your Name"}</div>
          <div style={{ width: 60, height: 2, background: accent, margin: "10px auto", borderRadius: 2 }} />
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 16px", fontSize: 11.5, color: "#666" }}>
            {contacts.map((c, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{c.icon} {c.val}</span>)}
          </div>
        </div>

        {data.summary && (
          <div style={{ marginBottom: 22, textAlign: "center", fontStyle: "italic", color: "#555" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: accent, marginBottom: 6 }}>About</div>
            <p>{data.summary}</p>
            <div style={{ width: 40, height: 1, background: "#ddd", margin: "14px auto 0" }} />
          </div>
        )}

        {data.skills.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <ElegantTitle title="Skills" accent={accent} />
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
              {data.skills.map((s, i) => <span key={i} style={{ fontSize: 11.5, color: "#444", padding: "2px 10px", border: `1px solid ${accent}55`, borderRadius: 20 }}>{s}</span>)}
            </div>
          </div>
        )}

        {data.experience.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <ElegantTitle title="Experience" accent={accent} />
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #ddd", paddingBottom: 4, marginBottom: 6 }}>
                  <div><span style={{ fontWeight: 700, fontSize: 13.5 }}>{e.title}</span> <span style={{ color: "#777" }}>at {e.company}{e.location && `, ${e.location}`}</span></div>
                  <span style={{ color: "#888", fontSize: 11, fontStyle: "italic" }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</span>
                </div>
                <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
                  {e.description.map((d, j) => <li key={j} style={{ color: "#333", marginBottom: 3 }}>{d}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {data.projects.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <ElegantTitle title="Projects" accent={accent} />
            {data.projects.map((pr, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontWeight: 700 }}>{pr.title}</span>
                  {pr.url && <span style={{ color: "#2563eb", fontSize: 11 }}>{pr.url}</span>}
                </div>
                {pr.description && <p style={{ color: "#555" }}>{pr.description}</p>}
                {pr.technologies?.length && <p style={{ color: "#888", fontSize: 11, fontStyle: "italic" }}>{pr.technologies.join(" · ")}</p>}
              </div>
            ))}
          </div>
        )}

        {data.education.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <ElegantTitle title="Education" accent={accent} />
            {data.education.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{e.degree}{e.major && ` in ${e.major}`}</span>
                  <div style={{ color: "#666", fontSize: 12 }}>{e.institution}{e.location && `, ${e.location}`}{e.gpa && ` · GPA: ${e.gpa}`}</div>
                </div>
                <div style={{ color: "#888", fontSize: 11, fontStyle: "italic", whiteSpace: "nowrap" }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</div>
              </div>
            ))}
          </div>
        )}

        <BottomSections data={data} accent={accent} fmtFull={fmtFull} center />
      </div>
    );
  }

  /* ─────────────────── TECH (Dark header, developer-focused) ─────────────────── */
  if (template === "tech") {
    const techFont = font || "'Courier New', 'Fira Code', monospace";
    return (
      <div style={{ ...base, maxWidth: 816, background: "#fff", color: "#111" }}>
        {/* Dark header */}
        <div style={{ background: "#0f172a", color: "#e2e8f0", padding: "28px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: techFont, fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>
                <span style={{ color: accent }}>{"< "}</span>{p.name || "YourName"}<span style={{ color: accent }}>{" />"}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 8, fontSize: 11.5, color: "#94a3b8", fontFamily: techFont }}>
                {contacts.map((c, i) => <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>{c.icon} {c.val}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex" }}>
          {/* Left sidebar */}
          <div style={{ width: 200, background: "#1e293b", color: "#e2e8f0", padding: "24px 18px", flexShrink: 0 }}>
            {data.skills.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: techFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8 }}>// skills</div>
                {data.skills.map((s, i) => (
                  <div key={i} style={{ fontSize: 11, padding: "2px 0", color: "#cbd5e1", fontFamily: techFont }}>
                    <span style={{ color: "#64748b" }}>{'> '}</span>{s}
                  </div>
                ))}
              </div>
            )}

            {data.education.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: techFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8 }}>// education</div>
                {data.education.map((e, i) => (
                  <div key={i} style={{ marginBottom: 10, fontSize: 11 }}>
                    <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{e.degree}</div>
                    {e.major && <div style={{ color: "#94a3b8" }}>{e.major}</div>}
                    <div style={{ color: "#64748b" }}>{e.institution}</div>
                    <div style={{ color: "#475569", fontSize: 10 }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Now"}</div>
                  </div>
                ))}
              </div>
            )}

            {data.certifications.length > 0 && (
              <div>
                <div style={{ fontFamily: techFont, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "uppercase", marginBottom: 8 }}>// certs</div>
                {data.certifications.map((c, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>
                    <div>{c.name}</div>
                    {c.issuer && <div style={{ color: "#64748b", fontSize: 10 }}>{c.issuer}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main */}
          <div style={{ flex: 1, padding: "24px 28px", fontSize: 12.5, lineHeight: 1.55 }}>
            {data.summary && (
              <div style={{ marginBottom: 18 }}>
                <TechSection title="summary" accent={accent} techFont={techFont} />
                <p style={{ color: "#334155", borderLeft: `3px solid ${accent}`, paddingLeft: 12 }}>{data.summary}</p>
              </div>
            )}

            {data.experience.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <TechSection title="experience" accent={accent} techFont={techFont} />
                {data.experience.map((e, i) => (
                  <div key={i} style={{ marginBottom: 14, padding: "8px 0 8px 12px", borderLeft: `2px solid ${accent}30` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: "#111" }}>{e.title}</div>
                      <div style={{ color: "#888", fontSize: 11, fontFamily: techFont }}>{fmtMonth(e.startDate)} – {e.endDate ? fmtMonth(e.endDate) : "Present"}</div>
                    </div>
                    <div style={{ color: accent, fontSize: 12, fontFamily: techFont, marginBottom: 4 }}>{e.company}{e.location && ` · ${e.location}`}</div>
                    <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                      {e.description.map((d, j) => <li key={j} style={{ color: "#333", marginBottom: 2 }}>{d}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {data.projects.length > 0 && (
              <div>
                <TechSection title="projects" accent={accent} techFont={techFont} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {data.projects.map((pr, i) => (
                    <div key={i} style={{ border: `1px solid ${accent}30`, borderRadius: 6, padding: 10 }}>
                      <div style={{ fontWeight: 700, color: "#111" }}>{pr.title}</div>
                      {pr.url && <div style={{ color: "#2563eb", fontSize: 10, fontFamily: techFont }}>{pr.url}</div>}
                      {pr.description && <p style={{ color: "#555", fontSize: 11, margin: "4px 0" }}>{pr.description}</p>}
                      {pr.technologies?.length && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                          {pr.technologies.map((t, j) => <span key={j} style={{ background: `${accent}15`, color: accent, fontSize: 10, padding: "1px 6px", borderRadius: 3, fontFamily: techFont }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <div style={{ padding: 32, color: "#888" }}>Select a template</div>;
}

/* ── Helper components ── */
function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 8, color: "#111" }}>{title}</div>
      {children}
    </div>
  );
}
function SidebarSection({ title, accent }: { title: string; accent: string }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: accent, borderBottom: `1px solid ${accent}40`, paddingBottom: 3, marginBottom: 8 }}>{title}</div>;
}
function ElegantTitle({ title, accent }: { title: string; accent: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: "#ddd" }} />
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: accent }}>{title}</div>
        <div style={{ flex: 1, height: 1, background: "#ddd" }} />
      </div>
    </div>
  );
}
function TechSection({ title, accent, techFont }: { title: string; accent: string; techFont: string }) {
  return <div style={{ fontFamily: techFont, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: "lowercase", marginBottom: 8 }}>{"// "}{title}</div>;
}
function BottomSections({ data, accent, fmtFull, center }: { data: ResumeData; accent: string; fmtFull: (d: string) => string; center?: boolean }) {
  const align = center ? "center" as const : "left" as const;
  return (
    <>
      {data.certifications.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Section title="CERTIFICATIONS" accent={accent}>
            {data.certifications.map((c, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                <div><span style={{ fontWeight: 600 }}>{c.name}</span>{c.issuer && <span style={{ color: "#666" }}> · {c.issuer}</span>}</div>
                {c.issueDate && <span style={{ color: "#888", fontSize: 11 }}>{fmtFull(c.issueDate)}</span>}
              </div>
            ))}
          </Section>
        </div>
      )}
      {data.awards.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <Section title="AWARDS" accent={accent}>
            {data.awards.map((a, i) => (
              <div key={i} style={{ marginBottom: 6, textAlign: align }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{a.name}{a.date && <span style={{ color: "#888", fontWeight: 400, fontSize: 11 }}> · {fmtFull(a.date)}</span>}</div>
                {a.description && <div style={{ color: "#555", fontSize: 11.5 }}>{a.description}</div>}
              </div>
            ))}
          </Section>
        </div>
      )}
      {(data.languages?.length || data.interests?.length) ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {data.languages?.length ? (
            <div><Section title="LANGUAGES" accent={accent}><p style={{ color: "#444", textAlign: align }}>{data.languages.join(" · ")}</p></Section></div>
          ) : null}
          {data.interests?.length ? (
            <div><Section title="INTERESTS" accent={accent}><p style={{ color: "#444", textAlign: align }}>{data.interests.join(" · ")}</p></Section></div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
