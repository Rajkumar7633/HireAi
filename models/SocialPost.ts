import mongoose, { Schema, type Document } from "mongoose";

export interface ISocialPost extends Document {
  authorId: mongoose.Types.ObjectId | string;
  content: string;
  images?: string[]; // optional image URLs/base64
  likes: number;
  likedBy: Array<mongoose.Types.ObjectId | string>;
  commentsCount: number;
  hiddenBy: Array<mongoose.Types.ObjectId | string>;
  reports?: {
    count: number;
    reporters: Array<mongoose.Types.ObjectId | string>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SocialPostSchema = new Schema<ISocialPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    likes: { type: Number, default: 0 },
    likedBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    commentsCount: { type: Number, default: 0 },
    hiddenBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    reports: {
      count: { type: Number, default: 0 },
      reporters: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    },
  },
  { timestamps: true },
);

SocialPostSchema.index({ createdAt: -1 });

export default mongoose.models.SocialPost ||
  mongoose.model<ISocialPost>("SocialPost", SocialPostSchema);
