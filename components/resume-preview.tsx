"use client";

import React from "react";
// import { Card } from "@/components/ui/card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, MapPin, Globe, Github, Linkedin } from "lucide-react";

interface ResumeData {
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

interface ResumePreviewProps {
  data: ResumeData;
  template?: "faang" | "minimal" | "modern";
  theme?: {
    accentColor?: string;
    fontFamily?: string;
  };
}

export function ResumePreview({
  data,
  template = "faang",
  theme,
}: ResumePreviewProps) {
  const styleVars: React.CSSProperties = {
    // enable theme via CSS vars
    ["--resume-accent" as any]: theme?.accentColor || "#7c3aed",
    fontFamily: theme?.fontFamily || undefined,
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString + "-01");
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const formatFullDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  if (template === "faang") {
    return (
      <div className="bg-white text-black p-8 font-sans text-sm leading-relaxed max-w-[8.5in] mx-auto shadow-lg" style={styleVars}>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2 tracking-wide">
            {data.personalInfo.name || "Your Name"}
          </h1>
          <div className="flex flex-wrap justify-center gap-4 text-gray-700">
            {data.personalInfo.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>{data.personalInfo.email}</span>
              </div>
            )}
            {data.personalInfo.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{data.personalInfo.phone}</span>
              </div>
            )}
            {data.personalInfo.address && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{data.personalInfo.address}</span>
              </div>
            )}
            {data.personalInfo.linkedin && (
              <div className="flex items-center gap-1">
                <Linkedin className="w-3 h-3" />
                <span className="text-blue-600">
                  {data.personalInfo.linkedin}
                </span>
              </div>
            )}
            {data.personalInfo.github && (
              <div className="flex items-center gap-1">
                <Github className="w-3 h-3" />
                <span className="text-blue-600">
                  {data.personalInfo.github}
                </span>
              </div>
            )}
            {data.personalInfo.portfolio && (
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span className="text-blue-600">
                  {data.personalInfo.portfolio}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Professional Summary */}
        {data.summary && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
              PROFESSIONAL SUMMARY
            </h2>
            <p className="text-gray-800 leading-relaxed">{data.summary}</p>
          </div>
        )}

        {/* Technical Skills */}
        {data.skills.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
              TECHNICAL SKILLS
            </h2>
            <div className="flex flex-wrap gap-1">
              {data.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-gray-100 px-2 py-1 rounded text-xs font-medium"
                  style={{ borderLeft: `2px solid var(--resume-accent)` }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {data.experience.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
              PROFESSIONAL EXPERIENCE
            </h2>
            {data.experience.map((exp, index) => (
              <div key={index} className="mb-4">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-bold text-base">{exp.title}</h3>
                    <p className="font-semibold text-gray-700">
                      {exp.company}
                      {exp.location && ` • ${exp.location}`}
                    </p>
                  </div>
                  <div className="text-right text-gray-600 text-sm">
                    <p>
                      {formatDate(exp.startDate)} -{" "}
                      {exp.endDate ? formatDate(exp.endDate) : "Present"}
                    </p>
                  </div>
                </div>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  {exp.description.map((desc, descIndex) => (
                    <li key={descIndex} className="text-gray-800">
                      {desc}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {data.projects.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
              PROJECTS
            </h2>
            {data.projects.map((project, index) => (
              <div key={index} className="mb-3">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold">{project.title}</h3>
                  {project.url && (
                    <span className="text-blue-600 text-sm underline">
                      {project.url}
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-gray-800 mb-1">{project.description}</p>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <p className="text-gray-600 text-sm">
                    <strong>Technologies:</strong>{" "}
                    {project.technologies.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {data.education.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
              EDUCATION
            </h2>
            {data.education.map((edu, index) => (
              <div key={index} className="mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">
                      {edu.degree}
                      {edu.major && ` in ${edu.major}`}
                    </h3>
                    <p className="text-gray-700">
                      {edu.institution}
                      {edu.location && ` • ${edu.location}`}
                    </p>
                    {edu.gpa && (
                      <p className="text-gray-600 text-sm">GPA: {edu.gpa}</p>
                    )}
                  </div>
                  <div className="text-right text-gray-600 text-sm">
                    <p>
                      {formatDate(edu.startDate)} -{" "}
                      {edu.endDate ? formatDate(edu.endDate) : "Present"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {data.certifications.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
              CERTIFICATIONS
            </h2>
            {data.certifications.map((cert, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{cert.name}</h3>
                    {cert.issuer && (
                      <p className="text-gray-700 text-sm">{cert.issuer}</p>
                    )}
                  </div>
                  {cert.issueDate && (
                    <p className="text-gray-600 text-sm">
                      {formatFullDate(cert.issueDate)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Awards */}
        {data.awards.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
              AWARDS & ACHIEVEMENTS
            </h2>
            {data.awards.map((award, index) => (
              <div key={index} className="mb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{award.name}</h3>
                    {award.description && (
                      <p className="text-gray-700 text-sm">
                        {award.description}
                      </p>
                    )}
                  </div>
                  {award.date && (
                    <p className="text-gray-600 text-sm">
                      {formatFullDate(award.date)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Additional Sections */}
        <div className="grid grid-cols-2 gap-6">
          {data.languages && data.languages.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
                LANGUAGES
              </h2>
              <p className="text-gray-800">{data.languages.join(", ")}</p>
            </div>
          )}
          {data.interests && data.interests.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-2 border-b border-gray-300 pb-1">
                INTERESTS
              </h2>
              <p className="text-gray-800">{data.interests.join(", ")}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Minimal Professional Template
  if (template === "minimal") {
    return (
      <div className="bg-white text-black p-8 font-sans text-[13px] leading-relaxed max-w-[8.5in] mx-auto shadow-lg" style={styleVars}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {data.personalInfo.name || "Your Name"}
          </h1>
          <div className="mt-1 text-gray-700 text-sm flex flex-wrap gap-x-4 gap-y-1">
            {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
            {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
            {data.personalInfo.linkedin && (
              <span className="text-blue-600">{data.personalInfo.linkedin}</span>
            )}
            {data.personalInfo.github && (
              <span className="text-blue-600">{data.personalInfo.github}</span>
            )}
            {data.personalInfo.portfolio && (
              <span className="text-blue-600">{data.personalInfo.portfolio}</span>
            )}
          </div>
        </div>

        {data.summary && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800 mb-1">
              Summary
            </h2>
            <p className="text-gray-800">{data.summary}</p>
          </div>
        )}

        {data.skills.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800 mb-1">
              Skills
            </h2>
            <div className="flex flex-wrap gap-1">
              {data.skills.map((s, i) => (
                <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs" style={{ borderLeft: `2px solid var(--resume-accent)` }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.experience.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800 mb-2">
              Experience
            </h2>
            {data.experience.map((exp, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between">
                  <div className="font-semibold">{exp.title}</div>
                  <div className="text-gray-600 text-xs">
                    {formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : "Present"}
                  </div>
                </div>
                <div className="text-gray-700 text-sm mb-1">
                  {exp.company}
                  {exp.location && ` • ${exp.location}`}
                </div>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  {exp.description.map((d, j) => (
                    <li key={j}>{d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {data.projects.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800 mb-2">
              Projects
            </h2>
            {data.projects.map((p, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between">
                  <div className="font-semibold">{p.title}</div>
                  {p.url && <div className="text-blue-600 text-xs underline">{p.url}</div>}
                </div>
                {p.description && <p className="text-gray-800 text-sm">{p.description}</p>}
                {p.technologies && p.technologies.length > 0 && (
                  <p className="text-gray-600 text-xs">
                    <strong>Tech:</strong> {p.technologies.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {data.education.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800 mb-2">
              Education
            </h2>
            {data.education.map((e, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between">
                  <div className="font-semibold">
                    {e.degree}
                    {e.major && ` in ${e.major}`}
                  </div>
                  <div className="text-gray-600 text-xs">
                    {formatDate(e.startDate)} - {e.endDate ? formatDate(e.endDate) : "Present"}
                  </div>
                </div>
                <div className="text-gray-700 text-sm">
                  {e.institution}
                  {e.location && ` • ${e.location}`}
                </div>
                {e.gpa && <div className="text-gray-600 text-xs">GPA: {e.gpa}</div>}
              </div>
            ))}
          </div>
        )}

        {data.certifications.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800 mb-2">
              Certifications
            </h2>
            {data.certifications.map((c, i) => (
              <div key={i} className="flex justify-between text-sm mb-1">
                <div className="font-medium">{c.name}</div>
                {c.issueDate && <div className="text-gray-600 text-xs">{formatFullDate(c.issueDate)}</div>}
              </div>
            ))}
          </div>
        )}

        {data.awards.length > 0 && (
          <div className="mb-2">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800 mb-2">
              Awards
            </h2>
            {data.awards.map((a, i) => (
              <div key={i} className="flex justify-between text-sm mb-1">
                <div className="font-medium">{a.name}</div>
                {a.date && <div className="text-gray-600 text-xs">{formatFullDate(a.date)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Modern Creative Template
  if (template === "modern") {
    return (
      <div className="relative bg-white text-black max-w-[8.5in] mx-auto shadow-lg" style={styleVars}>
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 text-white p-6" style={{
            background: `linear-gradient(180deg, var(--resume-accent), #2563eb)`
          }}>
            <h1 className="text-xl font-bold leading-tight">
              {data.personalInfo.name || "Your Name"}
            </h1>
            <div className="mt-2 text-[12px] space-y-1 opacity-90">
              {data.personalInfo.email && <div>{data.personalInfo.email}</div>}
              {data.personalInfo.phone && <div>{data.personalInfo.phone}</div>}
              {data.personalInfo.linkedin && (
                <div className="truncate">{data.personalInfo.linkedin}</div>
              )}
              {data.personalInfo.github && (
                <div className="truncate">{data.personalInfo.github}</div>
              )}
              {data.personalInfo.portfolio && (
                <div className="truncate">{data.personalInfo.portfolio}</div>
              )}
              {data.personalInfo.address && <div>{data.personalInfo.address}</div>}
            </div>

            {data.skills.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xs font-semibold tracking-wider uppercase opacity-90">
                  Skills
                </h2>
                <div className="mt-2 flex flex-wrap gap-1">
                  {data.skills.map((s, i) => (
                    <span key={i} className="bg-white/10 px-2 py-0.5 rounded text-[11px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main */}
          <div className="flex-1 p-8 text-[13px]">
            {data.summary && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-1">
                  Profile
                </h2>
                <p className="text-gray-800">{data.summary}</p>
              </div>
            )}

            {data.experience.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Experience
                </h2>
                {data.experience.map((exp, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{exp.title}</div>
                        <div className="text-gray-700 text-sm">
                          {exp.company}
                          {exp.location && ` • ${exp.location}`}
                        </div>
                      </div>
                      <div className="text-gray-600 text-xs">
                        {formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : "Present"}
                      </div>
                    </div>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      {exp.description.map((d, j) => (
                        <li key={j}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {data.projects.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Projects
                </h2>
                {data.projects.map((p, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex justify-between">
                      <div className="font-semibold">{p.title}</div>
                      {p.url && <div className="text-indigo-600 text-xs underline">{p.url}</div>}
                    </div>
                    {p.description && <p className="text-gray-800 text-sm">{p.description}</p>}
                    {p.technologies && p.technologies.length > 0 && (
                      <p className="text-gray-600 text-xs">
                        <strong>Tech:</strong> {p.technologies.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {data.education.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Education
                </h2>
                {data.education.map((e, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between">
                      <div className="font-semibold">
                        {e.degree}
                        {e.major && ` in ${e.major}`}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {formatDate(e.startDate)} - {e.endDate ? formatDate(e.endDate) : "Present"}
                      </div>
                    </div>
                    <div className="text-gray-700 text-sm">
                      {e.institution}
                      {e.location && ` • ${e.location}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.certifications.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Certifications
                </h2>
                {data.certifications.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm mb-1">
                    <div className="font-medium">{c.name}</div>
                    {c.issueDate && <div className="text-gray-600 text-xs">{formatFullDate(c.issueDate)}</div>}
                  </div>
                ))}
              </div>
            )}

            {data.awards.length > 0 && (
              <div className="mb-2">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  Awards
                </h2>
                {data.awards.map((a, i) => (
                  <div key={i} className="flex justify-between text-sm mb-1">
                    <div className="font-medium">{a.name}</div>
                    {a.date && <div className="text-gray-600 text-xs">{formatFullDate(a.date)}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return <div className="bg-white p-8 text-sm text-gray-600">Template not found</div>;
}
