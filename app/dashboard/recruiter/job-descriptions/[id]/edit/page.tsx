"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import JobDescriptionForm from "@/components/job-description-form"

interface JobDescriptionData {
  _id: string
  title: string
  description: string
  requirements: string[]
  responsibilities: string[]
  location: string
  salary: string
  employmentType: string
  skills: string[]
}

export default function EditJobPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const { toast } = useToast()

  const [jobData, setJobData] = useState<JobDescriptionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobId) {
      fetchJobData()
    }
  }, [jobId])

  const fetchJobData = async () => {
    try {
      const response = await fetch(`/api/job-descriptions/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setJobData(data.jobDescription)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch job details.",
          variant: "destructive",
        })
        router.push("/dashboard/recruiter/job-descriptions")
      }
    } catch (error) {
      console.error("Error fetching job data:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch job details.",
        variant: "destructive",
      })
      router.push("/dashboard/recruiter/job-descriptions")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    router.push("/dashboard/recruiter/job-descriptions")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading job details...</p>
      </div>
    )
  }

  if (!jobData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">Job not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <JobDescriptionForm initialData={jobData} onSave={handleSave} />
    </div>
  )
}
