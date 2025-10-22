import mongoose, { Schema, type Document } from "mongoose";

export interface ICameraCapture extends Document {
  userId?: mongoose.Types.ObjectId | string;
  sessionId?: string;
  mimeType: string; // e.g., image/jpeg or image/png
  dataUrl: string; // base64 data URL
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: Date;
}

const CameraCaptureSchema = new Schema<ICameraCapture>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, index: true },
    mimeType: { type: String, required: true },
    dataUrl: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

CameraCaptureSchema.index({ createdAt: -1 });

export default mongoose.models.CameraCapture ||
  mongoose.model<ICameraCapture>("CameraCapture", CameraCaptureSchema);
