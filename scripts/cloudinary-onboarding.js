#!/usr/bin/env node
/**
 * Cloudinary onboarding script — upload, inspect, and transform a demo image.
 * Run: node scripts/cloudinary-onboarding.js
 */

const { v2: cloudinary } = require("cloudinary");

// ─── Inline credentials (no .env file) ─────────────────────────────────────────
cloudinary.config({
  cloud_name: "dbewx3gae",
  api_key: "227253862341918",
  api_secret: "YOUR_API_SECRET", // ← replace this with your API secret from Cloudinary console
  secure: true,
});

const DEMO_IMAGE_URL =
  "https://res.cloudinary.com/demo/image/upload/sample.jpg";

async function main() {
  console.log("Uploading demo image to Cloudinary...\n");

  const uploadResult = await cloudinary.uploader.upload(DEMO_IMAGE_URL, {
    folder: "hireai/onboarding-test",
    resource_type: "image",
  });

  console.log("Upload complete!");
  console.log("  Secure URL:", uploadResult.secure_url);
  console.log("  Public ID: ", uploadResult.public_id);
  console.log();

  const details = await cloudinary.api.resource(uploadResult.public_id, {
    resource_type: "image",
  });

  console.log("Image metadata:");
  console.log("  Width:      ", details.width, "px");
  console.log("  Height:     ", details.height, "px");
  console.log("  Format:     ", details.format);
  console.log("  Bytes:      ", details.bytes);
  console.log();

  // f_auto — Cloudinary picks the best image format for the visitor's browser (e.g. WebP)
  // q_auto — Cloudinary optimizes quality vs file size automatically
  const transformedUrl = cloudinary.url(uploadResult.public_id, {
    transformation: [{ fetch_format: "auto", quality: "auto" }],
    secure: true,
  });

  console.log(
    "Done! Click link below to see optimized version of the image. Check the size and the format."
  );
  console.log("Transformed URL:", transformedUrl);
}

main().catch((err) => {
  console.error("Cloudinary onboarding failed:", err.message || err);
  process.exit(1);
});
