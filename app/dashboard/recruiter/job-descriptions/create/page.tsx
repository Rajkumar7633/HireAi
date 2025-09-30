"use client";

import { useRouter } from "next/navigation";
import PremiumJobForm from "@/components/premium-job-form";

export default function CreateJobPage() {
  const router = useRouter();

  const handleSave = () => {
    router.push("/dashboard/recruiter/job-descriptions");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card/30 to-accent/5 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Create Premium Job Posting
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Design compelling job postings with our advanced tools and real-time
            preview to attract the best candidates.
          </p>
        </div>
        <PremiumJobForm onSave={handleSave} />
      </div>
    </div>
  );
}
