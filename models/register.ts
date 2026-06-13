// Centralized Mongoose model registration to avoid MissingSchemaError on cold start
// Import every model file here so that any route using populate has its schemas registered.

import "./Application"
import "./Assessment"
import "./AssessmentResult"
import "./CandidateFeedback"
import "./EmailTemplate"
import "./Job"
import "./JobDescription"
import "./JobSeekerProfile"
import "./Message"
import "./Notification"
import "./Resume"
import "./StructuredResume"
import "./Test"
import "./User"
import "./VideoInterview"
import "./VideoRoom"
import "./CampusDrive"
import "./CampusDriveApplication"
import "./SupportRequest"
import "./CollegePlacement"
import "./CollegePartnership"
import "./CollegeInterview"
import "./CampusDriveInvite"

// No exports; presence of this module ensures side-effect imports register models with mongoose.
