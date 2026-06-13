import mongoose, { Schema, type Document } from "mongoose"

export type MeetingAudienceMode = "all" | "department" | "batch" | "year" | "custom"
export type MeetingStatus = "scheduled" | "live" | "completed" | "cancelled"
export type AttendeeStatus = "invited" | "joined" | "left" | "absent"

export interface IAttendanceSession {
  joinedAt: Date
  leftAt?: Date
  durationSeconds?: number
}

export interface IMeetingAttendee {
  studentId: string
  studentName: string
  email: string
  department?: string
  batch?: string
  status: AttendeeStatus
  invitedAt: Date
  joinTime?: Date
  leaveTime?: Date
  totalDurationSeconds: number
  sessions: IAttendanceSession[]
  lastHeartbeatAt?: Date
}

export interface ICollegeMeeting extends Document {
  collegeId: string
  title: string
  description?: string
  meetingType: string
  startTime: Date
  endTime: Date
  roomId?: string
  meetingLink?: string
  venue?: string
  audienceMode: MeetingAudienceMode
  targetDepartment?: string
  targetYear?: number
  targetBatch?: string
  invitedStudentIds: string[]
  attendees: IMeetingAttendee[]
  status: MeetingStatus
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const AttendanceSessionSchema = new Schema(
  {
    joinedAt: { type: Date, required: true },
    leftAt: Date,
    durationSeconds: Number,
  },
  { _id: false },
)

const AttendeeSchema = new Schema(
  {
    studentId: { type: String, required: true },
    studentName: String,
    email: String,
    department: String,
    batch: String,
    status: {
      type: String,
      enum: ["invited", "joined", "left", "absent"],
      default: "invited",
    },
    invitedAt: { type: Date, default: Date.now },
    joinTime: Date,
    leaveTime: Date,
    totalDurationSeconds: { type: Number, default: 0 },
    sessions: [AttendanceSessionSchema],
    lastHeartbeatAt: Date,
  },
  { _id: false },
)

const CollegeMeetingSchema = new Schema<ICollegeMeeting>(
  {
    collegeId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    meetingType: {
      type: String,
      enum: ["general", "placement", "training", "orientation", "interview_prep", "webinar"],
      default: "general",
    },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    roomId: { type: String, index: true, sparse: true },
    meetingLink: { type: String, default: "" },
    venue: { type: String, default: "" },
    audienceMode: {
      type: String,
      enum: ["all", "department", "batch", "year", "custom"],
      default: "all",
    },
    targetDepartment: String,
    targetYear: Number,
    targetBatch: String,
    invitedStudentIds: [{ type: String }],
    attendees: [AttendeeSchema],
    status: {
      type: String,
      enum: ["scheduled", "live", "completed", "cancelled"],
      default: "scheduled",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
)

CollegeMeetingSchema.index({ collegeId: 1, startTime: -1 })

export const CollegeMeeting =
  mongoose.models.CollegeMeeting ||
  mongoose.model<ICollegeMeeting>("CollegeMeeting", CollegeMeetingSchema)
