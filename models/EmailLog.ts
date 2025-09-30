import mongoose, { Schema, type Document } from "mongoose";

export interface IEmailLog extends Document {
  to: string;
  subject: string;
  html?: string;
  templateId?: mongoose.Types.ObjectId;
  variables?: Record<string, any>;
  applicationId?: mongoose.Types.ObjectId;
  jobDescriptionId?: mongoose.Types.ObjectId;
  jobSeekerId?: mongoose.Types.ObjectId;
  recruiterId?: mongoose.Types.ObjectId;
  category?: string; // interview, application_update, offer, etc.
  sentAt: Date;
  opens?: number;
  clicks?: number;
  lastOpenedAt?: Date;
  lastClickedAt?: Date;
}

const EmailLogSchema = new Schema<IEmailLog>({
  to: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  html: { type: String },
  templateId: { type: Schema.Types.ObjectId, ref: "EmailTemplate" },
  variables: { type: Schema.Types.Mixed },
  applicationId: { type: Schema.Types.ObjectId, ref: "Application", index: true },
  jobDescriptionId: { type: Schema.Types.ObjectId, ref: "JobDescription", index: true },
  jobSeekerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  recruiterId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  category: { type: String },
  sentAt: { type: Date, default: Date.now },
  opens: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  lastOpenedAt: { type: Date },
  lastClickedAt: { type: Date },
},{ timestamps: true });

export default mongoose.models.EmailLog || mongoose.model<IEmailLog>("EmailLog", EmailLogSchema);
