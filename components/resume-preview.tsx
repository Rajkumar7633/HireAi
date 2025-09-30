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
}

export function ResumePreview({
  data,
  template = "faang",
}: ResumePreviewProps) {
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
      <div className="bg-white text-black p-8 font-sans text-sm leading-relaxed max-w-[8.5in] mx-auto shadow-lg">
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

  // Add other templates here (minimal, modern)
  return <div>Template not found</div>;
}
