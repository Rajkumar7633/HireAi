import mongoose, { Schema, type Document } from "mongoose";

export interface ISocialUserPrefs extends Document {
  userId: mongoose.Types.ObjectId;
  location?: string;
  title?: string;
  skills?: string[];
  sort?: string; // recent | name_asc
  compactCards?: boolean;
  lastProfileTab?: string;
  lastProfileScroll?: number;
  analyticsSavedViews?: Array<{ name: string; payload: { timeRange: string; normalizeFunnel: boolean } }>;
  updatedAt: Date;
  createdAt: Date;
}

const SocialUserPrefsSchema = new Schema<ISocialUserPrefs>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    location: { type: String, trim: true },
    title: { type: String, trim: true },
    skills: { type: [String], default: [] },
    sort: { type: String, default: "recent" },
    compactCards: { type: Boolean, default: false },
    lastProfileTab: { type: String, default: "" },
    lastProfileScroll: { type: Number, default: 0 },
    analyticsSavedViews: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

export default (mongoose.models.SocialUserPrefs as mongoose.Model<ISocialUserPrefs>) ||
  mongoose.model<ISocialUserPrefs>("SocialUserPrefs", SocialUserPrefsSchema);
