import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Resume from "@/models/Resume"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

async function processResumeFile(file: File, userId: string, userEmail: string) {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Generate realistic mock parsed text based on file name
  const fileName = file.name.replace(/\.[^/.]+$/, "")
  const mockParsedText = `${fileName} - Professional Resume

CONTACT INFORMATION
Email: ${userEmail}
Phone: (555) 123-4567
Location: San Francisco, CA
LinkedIn: linkedin.com/in/${fileName.toLowerCase().replace(/\s+/g, "")}

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years of expertise in full-stack development, 
cloud architecture, and team leadership. Proven track record of building scalable 
systems serving millions of users and leading cross-functional teams to deliver 
high-impact products.

TECHNICAL SKILLS
• Programming Languages: JavaScript, TypeScript, Python, Java, Go
• Frontend: React, Next.js, Vue.js, HTML5, CSS3, Tailwind CSS
• Backend: Node.js, Express.js, Django, Spring Boot, GraphQL
• Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
• Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, Terraform
• Tools: Git, Linux, Agile/Scrum, System Design

PROFESSIONAL EXPERIENCE

Senior Software Engineer | Tech Innovations Inc. | 2021 - Present
• Led development of microservices architecture serving 10M+ daily active users
• Improved system performance by 40% through database optimization and caching strategies
• Mentored team of 5 junior engineers, with 3 receiving promotions within 12 months
• Implemented automated testing pipeline, increasing code coverage from 65% to 95%
• Collaborated with product and design teams to deliver 15+ major features

Software Engineer | StartupXYZ | 2019 - 2021
• Built responsive web applications using React and Node.js for 100K+ users
• Developed RESTful APIs and integrated third-party services (Stripe, SendGrid, AWS S3)
• Reduced deployment time by 60% through implementation of CI/CD pipelines
• Participated in agile development processes and code review practices
• Contributed to open-source projects and technical documentation

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2014 - 2018
GPA: 3.7/4.0

PROJECTS
E-commerce Platform | 2023
• Full-stack web application with user authentication, payment processing, and inventory management
• Technologies: React, Node.js, PostgreSQL, Stripe API, AWS S3

CERTIFICATIONS
• AWS Certified Solutions Architect - Associate (2023)
• Google Cloud Professional Developer (2022)`

  const atsScore = Math.floor(Math.random() * 30) + 70 // Random score between 70-100
  const skillsFound = ["JavaScript", "React", "Node.js", "Python", "AWS", "Docker", "TypeScript", "MongoDB"]

  return {
    parsedText: mockParsedText,
    atsScore: atsScore,
    extractedData: {
      name: fileName,
      email: userEmail,
      phone: "(555) 123-4567",
      skills: skillsFound,
      experience: [
        {
          title: "Senior Software Engineer",
          company: "Tech Innovations Inc.",
          duration: "2021 - Present",
        },
        {
          title: "Software Engineer",
          company: "StartupXYZ",
          duration: "2019 - 2021",
        },
      ],
      education: [
        {
          degree: "Bachelor of Science in Computer Science",
          school: "University of California, Berkeley",
          year: "2014 - 2018",
        },
      ],
    },
    analysis: {
      strengths: [
        "Strong technical skills in modern technologies",
        "Leadership and mentoring experience",
        "Quantified achievements with metrics",
        "Relevant certifications and continuous learning",
      ],
      improvements: [
        "Add more specific project outcomes",
        "Include soft skills and teamwork examples",
        "Consider adding volunteer or side projects",
        "Optimize keywords for target roles",
      ],
      keywordDensity: {
        JavaScript: 3,
        React: 4,
        Node_js: 3, // Replace dot with underscore to avoid Mongoose Map error
        AWS: 2,
        Python: 2,
      },
    },
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      console.log("Authentication failed:", { session })
      return NextResponse.json(
        {
          message: "Unauthorized. Please log in as a job seeker to upload your resume.",
          requiresAuth: true,
        },
        { status: 401 },
      )
    }

    console.log(`Processing resume upload for user: ${session.userId} (${session.email})`)

    const formData = await req.formData()
    const resumeFile = formData.get("resume") as File

    if (!resumeFile) {
      return NextResponse.json({ message: "No resume file provided" }, { status: 400 })
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if (!allowedTypes.includes(resumeFile.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Please upload a PDF, DOC, or DOCX file." },
        { status: 400 },
      )
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (resumeFile.size > maxSize) {
      return NextResponse.json({ message: "File too large. Please upload a file smaller than 5MB." }, { status: 400 })
    }

    await connectDB()

    const uploadsDir = join(process.cwd(), "uploads", "resumes")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const fileName = `${session.userId}_${Date.now()}_${resumeFile.name}`
    const filePath = join(uploadsDir, fileName)

    const bytes = await resumeFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const processedData = await processResumeFile(resumeFile, session.userId, session.email)

    const resume = new Resume({
      userId: session.userId,
      fileName: resumeFile.name,
      fileUrl: `/api/uploads/resumes/${fileName}`,
      rawText: processedData.parsedText,
      parsedSkills: processedData.extractedData.skills,
      experience: processedData.extractedData.experience
        .map((exp) => `${exp.title} at ${exp.company} (${exp.duration})`)
        .join("; "),
      education: processedData.extractedData.education
        .map((edu) => `${edu.degree} from ${edu.school} (${edu.year})`)
        .join("; "),
      atsScore: processedData.atsScore,
      analysis: processedData.analysis,
      extractedData: processedData.extractedData,
      status: "processed",
      size: resumeFile.size,
      mimeType: resumeFile.type,
    })

    await resume.save()

    return NextResponse.json(
      {
        message: "Resume uploaded and analyzed successfully! Your ATS score and detailed analysis are ready.",
        resume: {
          id: resume._id.toString(),
          filename: resume.fileName,
          originalName: resumeFile.name,
          size: resumeFile.size,
          mimeType: resumeFile.type,
          uploadDate: resume.uploadedAt.toISOString(),
          userId: session.userId,
          userEmail: session.email,
          status: resume.status,
          atsScore: resume.atsScore,
          extractedData: resume.extractedData,
          analysis: resume.analysis,
        },
        source: "database",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Resume upload API error:", error)
    return NextResponse.json({ message: "Internal server error. Please try again." }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized", requiresAuth: true }, { status: 401 })
    }

    await connectDB()

    const resumes = await Resume.find({ userId: session.userId }).sort({ uploadedAt: -1 }).select("-rawText") // Exclude large text field for list view

    return NextResponse.json(resumes, { status: 200 })
  } catch (error) {
    console.error("Error fetching resumes:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
