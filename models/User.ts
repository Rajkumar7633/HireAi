import mongoose, { Schema, type Document } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: "job_seeker" | "recruiter" | "admin" | "college" | "college_admin"
  phone?: string
  address?: string
  profileImage?: string
  companyName?: string
  companyLogo?: string
  companyDescription?: string
  website?: string
  linkedinUrl?: string
  twitterUrl?: string
  professionalSummary?: string
  businessLocation?: string
  isProfileComplete?: boolean
  lastManualUpdate?: string
  // Candidate profile fields
  skills?: string[]
  yearsOfExperience?: number
  projects?: Array<{
    title: string
    description?: string
    tags?: string[]
    link?: string
  }>
  achievements?: string[]
  // Scoring caches
  profileScore?: number
  scores?: {
    projects?: number
    experience?: number
    skills?: number
    coding?: number
    achievements?: number
    completeness?: number
    recency?: number
    total?: number
  }
  scoreVersion?: number
  lastScoreComputedAt?: Date
  createdAt: Date
  updatedAt: Date
  // Onboarding
  onboardingCompleted?: boolean
  onboardingSteps?: {
    profile?: boolean
    branding?: boolean
    firstJob?: boolean
    inviteTeam?: boolean
  }
  // Billing
  stripeCustomerId?: string
  subscription?: {
    productId?: string
    priceId?: string
    status?: string
    currentPeriodEnd?: Date
  }
  features?: Record<string, boolean>
  limits?: Record<string, number>
  // College-specific
  collegeName?: string
  collegeLocation?: string
  collegeWebsite?: string
  collegeCode?: string
  city?: string
  state?: string
  country?: string
  zipCode?: string
  description?: string
  establishedYear?: string
  accreditation?: string
  collegeType?: string
  studentCapacity?: string
  placementCellHead?: string
  placementCellEmail?: string
  placementCellPhone?: string
  departments?: Array<{ name: string; branches: string[] }>
  totalStudents?: number
  placementRate?: number
  // Student-specific (set when onboarded by a college)
  onboardedByCollege?: string
  department?: string
  batch?: string
  cgpa?: number
  placementStatus?: "unplaced" | "placed" | "offer_received"
  placedAt?: Date
  companyPlacedAt?: string
  packageLPA?: number
  marks10th?: number
  marks12th?: number
  backlogs?: number
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["job_seeker", "recruiter", "admin", "college", "college_admin"],
      required: true,
    },
    phone: String,
    address: String,
    profileImage: String,
    companyName: String,
    companyLogo: String,
    companyDescription: String,
    website: String,
    linkedinUrl: String,
    twitterUrl: String,
    professionalSummary: String,
    businessLocation: String,
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    lastManualUpdate: String,
    // Candidate profile fields
    skills: { type: [String], default: [] },
    yearsOfExperience: { type: Number, default: 0 },
    projects: {
      type: [
        new Schema(
          {
            title: { type: String, required: true },
            description: { type: String },
            tags: { type: [String], default: [] },
            link: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    achievements: { type: [String], default: [] },
    // Talent Pool scoring fields
    profileScore: {
      type: Number,
      default: 0,
      index: true,
      min: 0,
      max: 100,
    },
    scores: {
      projects: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      skills: { type: Number, default: 0 },
      coding: { type: Number, default: 0 },
      achievements: { type: Number, default: 0 },
      completeness: { type: Number, default: 0 },
      recency: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    scoreVersion: { type: Number, default: 1 },
    lastScoreComputedAt: { type: Date },
    // Onboarding flags
    onboardingCompleted: { type: Boolean, default: false },
    onboardingSteps: {
      profile: { type: Boolean, default: false },
      branding: { type: Boolean, default: false },
      firstJob: { type: Boolean, default: false },
      inviteTeam: { type: Boolean, default: false },
    },
    // Billing
    stripeCustomerId: { type: String, index: true, sparse: true },
    subscription: {
      productId: String,
      priceId: String,
      status: String,
      currentPeriodEnd: Date,
    },
    features: { type: Map, of: Boolean, default: {} },
    limits: { type: Map, of: Number, default: {} },
    // College-specific
    collegeName: String,
    collegeLocation: String,
    collegeWebsite: String,
    collegeCode: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    description: String,
    establishedYear: String,
    accreditation: String,
    collegeType: { type: String, default: "Engineering" },
    studentCapacity: String,
    placementCellHead: String,
    placementCellEmail: String,
    placementCellPhone: String,
    departments: {
      type: [
        new Schema(
          {
            name: { type: String, required: true },
            branches: { type: [String], default: [] },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    totalStudents: { type: Number, default: 0 },
    placementRate: { type: Number, default: 0 },
    // Student placement fields
    onboardedByCollege: { type: Schema.Types.ObjectId, ref: "User", index: true, sparse: true },
    department: String,
    batch: String,
    cgpa: Number,
    placementStatus: { type: String, enum: ["unplaced", "placed", "offer_received"], default: "unplaced" },
    placedAt: Date,
    companyPlacedAt: String,
    packageLPA: Number,
    marks10th: Number,
    marks12th: Number,
    backlogs: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
