import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get("image") as File
    const type = formData.get("type") as string // "profile" or "company"

    if (!image) {
      return NextResponse.json({ message: "No image file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json({ message: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 })
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (image.size > maxSize) {
      return NextResponse.json({ message: "File size too large. Maximum size is 5MB." }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = image.name.split(".").pop()
    const filename = `${type}_${session.userId}_${timestamp}.${fileExtension}`

    // For now, we'll use a simple base64 data URL approach
    // In production, you'd want to use a proper file storage service like Vercel Blob
    const base64 = buffer.toString("base64")
    const dataUrl = `data:${image.type};base64,${base64}`

    // In a real application, you would:
    // 1. Upload to cloud storage (AWS S3, Vercel Blob, etc.)
    // 2. Return the public URL
    // For this demo, we'll return the data URL

    return NextResponse.json({
      message: "Image uploaded successfully",
      url: dataUrl,
      filename: filename,
      type: type,
    })
  } catch (error) {
    console.error("Image upload error:", error)
    return NextResponse.json({ message: "Internal server error during image upload" }, { status: 500 })
  }
}
