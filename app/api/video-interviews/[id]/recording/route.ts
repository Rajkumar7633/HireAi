import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import VideoInterview from "@/models/VideoInterview"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    await connectDB()
    const interviewId = params.id
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ message: "file is required" }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const folder = process.env.CLOUDINARY_FOLDER || "hireai/interviews"

    const upload = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "video" },
        (err, result) => {
          if (err) return reject(err)
          resolve(result)
        },
      )
      stream.end(buffer)
    })

    const recordingUrl = upload.secure_url as string

    const interview = await VideoInterview.findByIdAndUpdate(
      interviewId,
      { $set: { recordingUrl } },
      { new: true },
    )
    if (!interview) return NextResponse.json({ message: "Interview not found" }, { status: 404 })

    return NextResponse.json({ success: true, recordingUrl })
  } catch (error: any) {
    console.error("[recording][upload] error", error)
    return NextResponse.json({ success: false, message: error.message || "Upload failed" }, { status: 500 })
  }
}
