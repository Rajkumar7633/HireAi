import mongoose, { Schema, type Document } from "mongoose"

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId
  type: string
  details: string
  relatedEntity?: {
    id?: mongoose.Types.ObjectId
    type?: string
  }
  createdAt: Date
}

const HistorySchema = new Schema<IHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "resume_upload",
        "job_description_post",
        "match_generated",
        "profile_update",
        "password_change",
        "account_delete",
        "job_application",
        "test_assigned",
        "test_submitted",
        "interview_scheduled",
        "interview_feedback",
        "message_sent",
        "offer_sent",
        "offer_accepted",
        "offer_declined",
        "status_change",
        "background_verification",
      ],
    },
    details: { type: String, required: true },
    relatedEntity: {
      id: Schema.Types.ObjectId,
      type: String,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
)

export default mongoose.models.History || mongoose.model<IHistory>("History", HistorySchema)
