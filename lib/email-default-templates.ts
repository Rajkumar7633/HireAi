export const DEFAULT_EMAIL_TEMPLATES = [
  {
    name: "Application Received",
    subject: "Application Received - {{jobTitle}}",
    category: "application_update",
    linkedStatus: null,
    content:
      "Dear {{candidateName}},\n\nThank you for applying to the {{jobTitle}} position at {{companyName}}. We have received your application and will review it carefully. We will contact you if your profile matches our requirements.\n\nBest regards,\n{{recruiterName}}\n{{companyName}} Recruiting Team",
    variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    isDefault: true,
  },
  {
    name: "Application Under Review",
    subject: "Your application is under review - {{jobTitle}}",
    category: "application_update",
    linkedStatus: "Under Review",
    content:
      "Dear {{candidateName}},\n\nYour application for the {{jobTitle}} position at {{companyName}} is now under review by our hiring team. We appreciate your patience and will update you as soon as we have news.\n\nBest regards,\n{{recruiterName}}\n{{companyName}} Recruiting Team",
    variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    isDefault: true,
  },
  {
    name: "Shortlisted for Next Round",
    subject: "Shortlisted - {{jobTitle}}",
    category: "application_update",
    linkedStatus: "Shortlisted",
    content:
      "Hi {{candidateName}},\n\nGood news! You have been shortlisted for the next round for the {{jobTitle}} role at {{companyName}}. Our team will reach out with next steps shortly.\n\nBest,\n{{recruiterName}}\n{{companyName}} Recruiting Team",
    variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    isDefault: true,
  },
  {
    name: "Interview Invitation",
    subject: "Interview Invitation - {{jobTitle}}",
    category: "interview",
    linkedStatus: "Interview Scheduled",
    content:
      "Dear {{candidateName}},\n\nWe are pleased to invite you for an interview for the {{jobTitle}} position at {{companyName}}.\n\nPlease check your dashboard for interview details and confirm your availability.\n\nRegards,\n{{recruiterName}}\n{{companyName}} Recruiting Team",
    variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    isDefault: true,
  },
  {
    name: "Assessment Invitation",
    subject: "Assessment Assigned - {{jobTitle}}",
    category: "application_update",
    linkedStatus: "Test Assigned",
    content:
      "Dear {{candidateName}},\n\nYou have been assigned an assessment for the {{jobTitle}} position at {{companyName}}. Please log in to your dashboard to complete the test before the deadline.\n\nGood luck!\n\n{{recruiterName}}\n{{companyName}} Recruiting Team",
    variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    isDefault: true,
  },
  {
    name: "Job Offer",
    subject: "Job Offer - {{jobTitle}} at {{companyName}}",
    category: "offer",
    linkedStatus: "Offer",
    content:
      "Dear {{candidateName}},\n\nCongratulations! We are pleased to extend an offer for the {{jobTitle}} position at {{companyName}}. Please review the offer letter in your dashboard and let us know your decision.\n\nWe are excited about the possibility of you joining our team!\n\n{{recruiterName}}\n{{companyName}} Recruiting Team",
    variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    isDefault: true,
  },
  {
    name: "Congratulations - Hired",
    subject: "Welcome to {{companyName}}!",
    category: "offer",
    linkedStatus: "Hired",
    content:
      "Dear {{candidateName}},\n\nCongratulations! We are thrilled to confirm that you have been hired for the {{jobTitle}} position at {{companyName}}. Welcome to the team!\n\nOur HR team will reach out with onboarding details shortly.\n\n{{recruiterName}}\n{{companyName}} Recruiting Team",
    variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    isDefault: true,
  },
  {
    name: "Application Rejection",
    subject: "Update on your application - {{jobTitle}}",
    category: "rejection",
    linkedStatus: "Rejected",
    content:
      "Dear {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} position at {{companyName}} and for taking the time to apply. After careful consideration, we have decided not to move forward with your application at this time.\n\nWe will keep your profile on file for future opportunities.\n\nWe wish you the best in your job search.\n\nSincerely,\n{{recruiterName}}\n{{companyName}} Recruiting Team",
    variables: ["candidateName", "jobTitle", "companyName", "recruiterName"],
    isDefault: true,
  },
] as const

/** Fallback name lookup when no linkedStatus template exists */
export const STATUS_TEMPLATE_NAME_FALLBACK: Record<string, string> = {
  Rejected: "Application Rejection",
  "Interview Scheduled": "Interview Invitation",
  Shortlisted: "Shortlisted for Next Round",
  Hired: "Congratulations - Hired",
  Offer: "Job Offer",
  "Test Assigned": "Assessment Invitation",
  "Test Passed": "Shortlisted for Next Round",
  "Test Failed": "Application Rejection",
  "Under Review": "Application Under Review",
}

export const HIRING_STATUSES = [
  "Pending",
  "Under Review",
  "Shortlisted",
  "Rejected",
  "Interview Scheduled",
  "Hired",
  "Test Assigned",
  "Test Passed",
  "Test Failed",
  "Offer",
] as const
