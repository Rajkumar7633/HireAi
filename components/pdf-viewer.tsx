"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ExternalLink, FileText } from "lucide-react";

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
}

export function PDFViewer({ fileUrl, fileName, className }: PDFViewerProps) {
  const [viewMode, setViewMode] = useState<"embed" | "link">("embed");
  const [loadError, setLoadError] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const handleViewInNewTab = () => {
    window.open(fileUrl, "_blank");
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Original Resume
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!loadError ? (
          <div className="w-full">
            <iframe
              src={fileUrl}
              className="w-full h-[600px] border rounded-md"
              title={`Resume: ${fileName}`}
              onError={() => setLoadError(true)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Unable to display PDF</h3>
              <p className="text-muted-foreground">
                Your browser may not support inline PDF viewing.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleViewInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View in New Tab
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
