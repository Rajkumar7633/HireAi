import mongoose, { Schema, type Document } from "mongoose";

export interface ISocialComment extends Document {
    postId: mongoose.Types.ObjectId | string;
    authorId: mongoose.Types.ObjectId | string;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}

const SocialCommentSchema = new Schema<ISocialComment>(
    {
        postId: { type: Schema.Types.ObjectId, ref: "SocialPost", required: true, index: true },
        authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        text: { type: String, required: true, trim: true, maxlength: 1000 },
    },
    { timestamps: true }
);

SocialCommentSchema.index({ createdAt: -1 });

export default mongoose.models.SocialComment || mongoose.model<ISocialComment>("SocialComment", SocialCommentSchema);
