import mongoose from "mongoose";

export interface IProctorEvent extends mongoose.Document {
  assessmentId: string;
  candidateId: string;
  type: string;
  message: string;
  snapshot?: string; // dataURL base64 (optional)
  meta?: Record<string, any>;
  createdAt: Date;
}

const ProctorEventSchema = new mongoose.Schema<IProctorEvent>({
  assessmentId: { type: String, required: true, index: true },
  candidateId: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true },
  message: { type: String, required: true },
  snapshot: { type: String },
  meta: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

// Helpful compound index for admin review queries
ProctorEventSchema.index({ assessmentId: 1, candidateId: 1, createdAt: -1 });

export default mongoose.models.ProctorEvent || mongoose.model<IProctorEvent>("ProctorEvent", ProctorEventSchema);
