import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Optional S3 presign support; falls back to 501 when SDK/ENV not present.
  try {
    const { AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env as Record<string, string | undefined>;
    if (!AWS_S3_BUCKET || !AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json({ message: "S3 not configured" }, { status: 501 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename") || `upload-${Date.now()}`;
    const contentType = searchParams.get("contentType") || "application/octet-stream";
    const sizeStr = searchParams.get("size") || "0";
    const size = parseInt(sizeStr, 10) || 0;

    // Server-side validation: 10 MB limit and allowed types
    const MAX_BYTES = 10 * 1024 * 1024;
    if (size <= 0 || size > MAX_BYTES) {
      return NextResponse.json({ message: "File too large (max 10 MB)" }, { status: 400 });
    }
    const allowed = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/zip",
    ]);
    if (!allowed.has(contentType)) {
      return NextResponse.json({ message: "Unsupported file type" }, { status: 400 });
    }

    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const client = new S3Client({ region: AWS_REGION, credentials: { accessKeyId: AWS_ACCESS_KEY_ID!, secretAccessKey: AWS_SECRET_ACCESS_KEY! } });

    const safeName = filename.replace(/[^A-Za-z0-9_.-]/g, "_");
    const fileKey = `messages/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
    const command = new PutObjectCommand({ Bucket: AWS_S3_BUCKET!, Key: fileKey, ContentType: contentType, ContentLength: size });
    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 60 });

    const publicUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`;
    return NextResponse.json({ presignedUrl, publicUrl, provider: "s3" });
  } catch (e) {
    return NextResponse.json({ message: "S3 SDK unavailable" }, { status: 501 });
  }
}
