import mongoose, { Schema } from "mongoose";

const SocialRecommendationSchema = new Schema({
  fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  toUserId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
  text:        { type: String, required: true, maxlength: 1000, trim: true },
  relationship:{ type: String, trim: true, default: "" }, // "Former colleague", "Manager", etc.
  recommenderName:  { type: String, trim: true },
  recommenderTitle: { type: String, trim: true },
  recommenderImage: { type: String },
}, { timestamps: true });

SocialRecommendationSchema.index({ toUserId: 1, createdAt: -1 });
SocialRecommendationSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

export default mongoose.models.SocialRecommendation ||
  mongoose.model("SocialRecommendation", SocialRecommendationSchema);
