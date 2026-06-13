import mongoose, { Schema } from "mongoose";

const ProfileViewSchema = new Schema({
  profileUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  viewerUserId:  { type: Schema.Types.ObjectId, ref: "User" },
  viewedAt:      { type: Date, default: Date.now },
});

ProfileViewSchema.index({ profileUserId: 1, viewedAt: -1 });
ProfileViewSchema.index({ profileUserId: 1, viewerUserId: 1 });

export default mongoose.models.ProfileView ||
  mongoose.model("ProfileView", ProfileViewSchema);
