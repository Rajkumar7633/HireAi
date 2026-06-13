"use client";

import React from "react";
import { Check, Star } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  tag: string;
  tagColor: string;
  preview: React.ReactNode;
}

function Line({ w = "100%", h = 3, color = "#e5e7eb", mt = 3 }: { w?: string | number; h?: number; color?: string; mt?: number }) {
  return <div style={{ width: w, height: h, background: color, borderRadius: 2, marginTop: mt }} />;
}

function ClassicPreview() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#fff", padding: "8px 7px", fontFamily: "serif", overflow: "hidden" }}>
      <div style={{ textAlign: "center", borderBottom: "2px solid #1e293b", paddingBottom: 5, marginBottom: 5 }}>
        <div style={{ height: 7, background: "#1e293b", borderRadius: 1, width: "60%", margin: "0 auto 3px" }} />
        <div style={{ height: 3, background: "#94a3b8", borderRadius: 1, width: "80%", margin: "0 auto 2px" }} />
        <div style={{ height: 3, background: "#94a3b8", borderRadius: 1, width: "55%", margin: "0 auto" }} />
      </div>
      {["EXPERIENCE", "EDUCATION", "SKILLS"].map((s, i) => (
        <div key={s} style={{ marginBottom: 5 }}>
          <div style={{ fontSize: 4, fontWeight: 800, color: "#1e293b", letterSpacing: 1, borderBottom: "1px solid #1e293b", marginBottom: 2, paddingBottom: 1 }}>{s}</div>
          <Line w="90%" h={2} color="#475569" mt={2} />
          <Line w="75%" h={2} color="#94a3b8" mt={2} />
          {i === 0 && <Line w="80%" h={2} color="#94a3b8" mt={2} />}
        </div>
      ))}
      <div style={{ display: "flex", gap: 2, marginTop: 4, flexWrap: "wrap" }}>
        {["React", "Node", "AWS", "Go"].map(sk => (
          <span key={sk} style={{ background: "#ede9fe", color: "#7c3aed", fontSize: 3.5, padding: "1px 4px", borderRadius: 6, fontWeight: 600 }}>{sk}</span>
        ))}
      </div>
    </div>
  );
}

function MinimalPreview() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#fff", padding: "8px 7px", overflow: "hidden" }}>
      <div style={{ borderBottom: "1.5px solid #e2e8f0", paddingBottom: 5, marginBottom: 5 }}>
        <div style={{ height: 6, background: "#0f172a", borderRadius: 1, width: "55%", marginBottom: 3 }} />
        <div style={{ height: 2.5, background: "#64748b", borderRadius: 1, width: "70%", marginBottom: 2 }} />
        <div style={{ height: 2.5, background: "#94a3b8", borderRadius: 1, width: "50%" }} />
      </div>
      {["EXPERIENCE", "EDUCATION", "SKILLS"].map((s) => (
        <div key={s} style={{ marginBottom: 5 }}>
          <div style={{ fontSize: 4, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>{s}</div>
          <Line w="85%" h={2} color="#334155" mt={1} />
          <Line w="68%" h={2} color="#94a3b8" mt={2} />
          <Line w="75%" h={2} color="#94a3b8" mt={2} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap" }}>
        {["Python", "TypeScript", "Docker"].map(sk => (
          <span key={sk} style={{ border: "0.5px solid #334155", color: "#334155", fontSize: 3.5, padding: "1px 4px", borderRadius: 10 }}>{sk}</span>
        ))}
      </div>
    </div>
  );
}

function ModernPreview() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden" }}>
      <div style={{ width: "38%", background: "linear-gradient(180deg,#4f46e5 0%,#7c3aed 100%)", padding: "8px 5px", color: "#fff" }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.25)", margin: "0 auto 5px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,255,255,0.5)" }} />
        </div>
        <Line w="80%" h={3} color="rgba(255,255,255,0.7)" mt={2} />
        <Line w="60%" h={2} color="rgba(255,255,255,0.4)" mt={2} />
        <div style={{ marginTop: 8, fontSize: 3.5, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }}>SKILLS</div>
        {["React", "Node.js", "AWS", "Docker"].map(sk => (
          <div key={sk} style={{ height: 2, background: "rgba(255,255,255,0.4)", borderRadius: 1, marginTop: 3, width: `${Math.random() * 30 + 55}%` }} />
        ))}
        <div style={{ marginTop: 6, fontSize: 3.5, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }}>EDUCATION</div>
        <Line w="75%" h={2} color="rgba(255,255,255,0.4)" mt={2} />
        <Line w="55%" h={2} color="rgba(255,255,255,0.3)" mt={2} />
      </div>
      <div style={{ flex: 1, background: "#fff", padding: "8px 6px" }}>
        <div style={{ height: 6, background: "#1e293b", borderRadius: 1, width: "70%", marginBottom: 3 }} />
        <div style={{ height: 2.5, background: "#94a3b8", borderRadius: 1, width: "80%", marginBottom: 6 }} />
        <div style={{ fontSize: 3.5, color: "#4f46e5", fontWeight: 700, marginBottom: 3, letterSpacing: 0.5 }}>EXPERIENCE</div>
        {[85, 70, 75].map((w, i) => <Line key={i} w={`${w}%`} h={2} color={i === 0 ? "#475569" : "#cbd5e1"} mt={2} />)}
        <div style={{ fontSize: 3.5, color: "#4f46e5", fontWeight: 700, marginTop: 5, marginBottom: 3, letterSpacing: 0.5 }}>PROJECTS</div>
        {[80, 65, 72].map((w, i) => <Line key={i} w={`${w}%`} h={2} color={i === 0 ? "#475569" : "#cbd5e1"} mt={2} />)}
      </div>
    </div>
  );
}

function ExecutivePreview() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#fff", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg,#1e293b 0%,#334155 100%)", padding: "7px 8px", marginBottom: 5 }}>
        <div style={{ height: 7, background: "rgba(255,255,255,0.9)", borderRadius: 1, width: "65%", marginBottom: 3 }} />
        <div style={{ height: 3, background: "rgba(255,255,255,0.5)", borderRadius: 1, width: "80%", marginBottom: 2 }} />
        <div style={{ height: 2.5, background: "rgba(255,255,255,0.3)", borderRadius: 1, width: "60%" }} />
      </div>
      <div style={{ display: "flex", gap: 4, padding: "0 7px" }}>
        <div style={{ width: "38%" }}>
          <div style={{ fontSize: 3.5, color: "#1e293b", fontWeight: 700, borderBottom: "0.5px solid #1e293b", paddingBottom: 1, marginBottom: 3 }}>SKILLS</div>
          {["Leadership", "Strategy", "Cloud", "DevOps"].map(sk => (
            <div key={sk} style={{ height: 2, background: "#64748b", borderRadius: 1, marginBottom: 2, width: "80%" }} />
          ))}
          <div style={{ fontSize: 3.5, color: "#1e293b", fontWeight: 700, borderBottom: "0.5px solid #1e293b", paddingBottom: 1, marginBottom: 3, marginTop: 4 }}>EDUCATION</div>
          <Line w="85%" h={2} color="#475569" mt={1} />
          <Line w="65%" h={2} color="#94a3b8" mt={2} />
        </div>
        <div style={{ flex: 1, borderLeft: "0.5px solid #e2e8f0", paddingLeft: 4 }}>
          <div style={{ fontSize: 3.5, color: "#1e293b", fontWeight: 700, marginBottom: 3 }}>EXPERIENCE</div>
          {[90, 75, 80, 65].map((w, i) => <Line key={i} w={`${w}%`} h={2} color={i === 0 ? "#334155" : "#cbd5e1"} mt={2} />)}
          <div style={{ fontSize: 3.5, color: "#1e293b", fontWeight: 700, marginTop: 4, marginBottom: 3 }}>SUMMARY</div>
          {[85, 78, 70].map((w, i) => <Line key={i} w={`${w}%`} h={2} color="#94a3b8" mt={2} />)}
        </div>
      </div>
    </div>
  );
}

function ElegantPreview() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#fffdf8", padding: "8px 8px", overflow: "hidden", fontFamily: "serif" }}>
      <div style={{ textAlign: "center", marginBottom: 5 }}>
        <div style={{ height: 7, background: "#44403c", borderRadius: 1, width: "60%", margin: "0 auto 3px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 2 }}>
          <div style={{ flex: 1, height: 0.5, background: "#d6d3d1" }} />
          <div style={{ width: 4, height: 4, background: "#a16207", borderRadius: "50%" }} />
          <div style={{ flex: 1, height: 0.5, background: "#d6d3d1" }} />
        </div>
        <div style={{ height: 2.5, background: "#78716c", borderRadius: 1, width: "70%", margin: "0 auto 2px" }} />
        <div style={{ height: 2.5, background: "#a8a29e", borderRadius: 1, width: "50%", margin: "0 auto" }} />
      </div>
      {["Experience", "Education", "Skills"].map((s, i) => (
        <div key={s} style={{ marginBottom: 4 }}>
          <div style={{ textAlign: "center", fontSize: 4, color: "#44403c", letterSpacing: 2, marginBottom: 2 }}>— {s.toUpperCase()} —</div>
          {i < 2 ? (
            <>
              <Line w="85%" h={2} color="#57534e" mt={1} />
              <Line w="72%" h={2} color="#a8a29e" mt={2} />
            </>
          ) : (
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
              {["Python", "React", "ML"].map(sk => (
                <span key={sk} style={{ background: "#fef3c7", border: "0.5px solid #d97706", color: "#92400e", fontSize: 3.5, padding: "1px 4px", borderRadius: 8 }}>{sk}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TechPreview() {
  return (
    <div style={{ width: "100%", height: "100%", background: "#0f172a", overflow: "hidden" }}>
      <div style={{ background: "#0f172a", padding: "7px 7px 5px", borderBottom: "1px solid #22d3ee" }}>
        <div style={{ fontFamily: "monospace", fontSize: 6, color: "#22d3ee", marginBottom: 2 }}>{"<"}<span style={{ color: "#f1f5f9", fontWeight: 700 }}>Dev</span>{"/>"}</div>
        <div style={{ height: 2.5, background: "#64748b", borderRadius: 1, width: "70%", marginBottom: 2 }} />
        <div style={{ height: 2, background: "#334155", borderRadius: 1, width: "55%" }} />
      </div>
      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ width: "35%", background: "#1e293b", padding: "5px 4px" }}>
          <div style={{ fontSize: 3, color: "#22d3ee", letterSpacing: 0.5, marginBottom: 3 }}>// SKILLS</div>
          {["TypeScript", "React", "AWS", "Docker"].map((sk, i) => (
            <div key={sk} style={{ fontSize: 3, color: "#94a3b8", marginBottom: 2, paddingLeft: 2 }}>
              <span style={{ color: "#f59e0b" }}>▸</span> {sk}
            </div>
          ))}
          <div style={{ fontSize: 3, color: "#22d3ee", letterSpacing: 0.5, marginTop: 5, marginBottom: 3 }}>// EDUCATION</div>
          <Line w="85%" h={2} color="#475569" mt={1} />
          <Line w="65%" h={2} color="#334155" mt={2} />
        </div>
        <div style={{ flex: 1, background: "#0f172a", padding: "5px 5px" }}>
          <div style={{ fontSize: 3, color: "#22d3ee", letterSpacing: 0.5, marginBottom: 3 }}>// EXPERIENCE</div>
          {[80, 65, 72, 60].map((w, i) => <Line key={i} w={`${w}%`} h={2} color={i === 0 ? "#94a3b8" : "#334155"} mt={2} />)}
          <div style={{ fontSize: 3, color: "#22d3ee", letterSpacing: 0.5, marginTop: 5, marginBottom: 3 }}>// PROJECTS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ border: "0.5px solid #22d3ee", borderRadius: 2, padding: 2 }}>
                <Line w="70%" h={2} color="#94a3b8" mt={0} />
                <Line w="90%" h={1.5} color="#334155" mt={1.5} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const templates: Template[] = [
  {
    id: "faang",
    name: "Classic / FAANG",
    description: "ATS-optimized for FAANG & top tech companies",
    tag: "Recommended",
    tagColor: "#7c3aed",
    preview: <ClassicPreview />,
  },
  {
    id: "minimal",
    name: "Minimal Pro",
    description: "Ultra-clean, works for any industry",
    tag: "Universal",
    tagColor: "#0369a1",
    preview: <MinimalPreview />,
  },
  {
    id: "modern",
    name: "Modern Sidebar",
    description: "Colored sidebar with accent header",
    tag: "Creative",
    tagColor: "#4f46e5",
    preview: <ModernPreview />,
  },
  {
    id: "executive",
    name: "Executive",
    description: "Dark banner, two-column layout",
    tag: "Senior",
    tagColor: "#1e293b",
    preview: <ExecutivePreview />,
  },
  {
    id: "elegant",
    name: "Elegant Serif",
    description: "Formal serif with decorative elements",
    tag: "Traditional",
    tagColor: "#a16207",
    preview: <ElegantPreview />,
  },
  {
    id: "tech",
    name: "Tech Dark",
    description: "Dark theme, monospace, code-style",
    tag: "Developer",
    tagColor: "#0e7490",
    preview: <TechPreview />,
  },
];

interface TemplateSelectorProps {
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

export function TemplateSelector({ selectedTemplate, onTemplateSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {templates.map((template) => {
          const isSelected = selectedTemplate === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onTemplateSelect(template.id)}
              className="text-left group focus:outline-none"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              <div
                style={{
                  border: isSelected ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                  borderRadius: 10,
                  overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxShadow: isSelected ? "0 0 0 3px rgba(124,58,237,0.15)" : "0 1px 3px rgba(0,0,0,0.07)",
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = "#a78bfa"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb"; }}
              >
                {/* Preview thumbnail */}
                <div style={{ height: 120, position: "relative", overflow: "hidden" }}>
                  {template.preview}
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <Check style={{ width: 11, height: 11, color: "#fff", strokeWidth: 3 }} />
                    </div>
                  )}
                </div>
                {/* Label */}
                <div style={{ padding: "7px 9px 8px", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "#1e293b" }}>{template.name}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 10,
                      background: `${template.tagColor}18`, color: template.tagColor,
                    }}>{template.tag}</span>
                  </div>
                  <p style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.3, margin: 0 }}>{template.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
