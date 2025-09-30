"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  recommended: boolean;
  features: string[];
}

const templates: Template[] = [
  {
    id: "faang",
    name: "FAANG Optimized",
    description:
      "Designed specifically for top tech companies like Google, Apple, Facebook, Amazon, Netflix",
    preview: "/api/placeholder/300/400?text=FAANG+Template",
    recommended: true,
    features: [
      "ATS-friendly format",
      "Technical skills emphasis",
      "Quantified achievements",
      "Clean, professional layout",
      "Optimized for tech roles",
    ],
  },
  {
    id: "minimal",
    name: "Minimal Professional",
    description: "Clean and simple design that works for any industry",
    preview: "/api/placeholder/300/400?text=Minimal+Template",
    recommended: false,
    features: [
      "Simple, clean design",
      "Universal compatibility",
      "Easy to read",
      "Professional appearance",
    ],
  },
  {
    id: "modern",
    name: "Modern Creative",
    description: "Contemporary design with subtle visual elements",
    preview: "/api/placeholder/300/400?text=Modern+Template",
    recommended: false,
    features: [
      "Modern typography",
      "Subtle design elements",
      "Creative layout",
      "Eye-catching format",
    ],
  },
];

interface TemplateSelectorProps {
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

export function TemplateSelector({
  selectedTemplate,
  onTemplateSelect,
}: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          Choose Your Resume Template
        </h3>
        <p className="text-muted-foreground text-sm">
          Select a template optimized for your target companies and industry
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTemplate === template.id
                ? "ring-2 ring-purple-500 border-purple-500"
                : "hover:border-gray-300"
            }`}
            onClick={() => onTemplateSelect(template.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {template.name}
                  {template.recommended && (
                    <Badge variant="secondary" className="text-xs">
                      Recommended
                    </Badge>
                  )}
                </CardTitle>
                {selectedTemplate === template.id && (
                  <Check className="h-5 w-5 text-purple-500" />
                )}
              </div>
              <CardDescription className="text-xs">
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="aspect-[3/4] bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                <img
                  src={template.preview || "/placeholder.svg"}
                  alt={`${template.name} preview`}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              <ul className="space-y-1">
                {template.features.map((feature, index) => (
                  <li
                    key={index}
                    className="text-xs text-muted-foreground flex items-center gap-1"
                  >
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
