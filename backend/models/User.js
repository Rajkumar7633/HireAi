const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  passwordHash: {
    type: String,
  },
  role: {
    type: String,
    enum: ["job_seeker", "recruiter", "admin"],
    default: "job_seeker",
  },
  name: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: false,
  },
  address: {
    type: String,
    required: false,
  },
  profileImage: {
    type: String,
    required: false,
  },
  companyName: {
    type: String,
    required: false,
  },
  companyLogo: {
    type: String,
    required: false,
  },
  companyDescription: {
    type: String,
    required: false,
  },
  website: {
    type: String,
    required: false,
  },
  linkedinUrl: {
    type: String,
    required: false,
  },
  twitterUrl: {
    type: String,
    required: false,
  },
  professionalSummary: {
    type: String,
    required: false,
  },
  businessLocation: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Email verification and OTP for secure login
  emailVerified: {
    type: Boolean,
    default: false,
  },
  loginOtp: {
    codeHash: { type: String },
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0 },
    devPlain: { type: String },
  },
  refreshTokens: {
    type: [String],
    default: [],
  },
  // Billing fields
  stripeCustomerId: {
    type: String,
    index: true,
    sparse: true,
  },
  subscription: {
    productId: { type: String },
    priceId: { type: String },
    status: { type: String },
    currentPeriodEnd: { type: Date },
  },
  // Entitlements and usage limits
  features: {
    type: Object,
    default: {},
  },
  limits: {
    type: Object,
    default: {},
  },
  // Skills with optional verification
  skills: [
    {
      name: { type: String },
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
        default: "intermediate",
      },
      verified: { type: Boolean, default: false },
      verifiedScore: { type: Number },
      verifiedAt: { type: Date },
    },
  ],
});

UserSchema.pre("save", function (next) {
  if (this.isModified("password") && !this.passwordHash) {
    this.passwordHash = this.password;
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);
