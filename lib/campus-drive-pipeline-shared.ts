export const PIPELINE_STEPS = [
  {
    step: 1,
    title: "Discover",
    description: "Browse colleges or companies on the platform",
  },
  {
    step: 2,
    title: "Propose",
    description: "Send a campus drive invitation with date, roles & package",
  },
  {
    step: 3,
    title: "Confirm",
    description: "The other party accepts or declines your proposal",
  },
  {
    step: 4,
    title: "Publish",
    description: "An active campus drive is created for students to apply",
  },
] as const

export function buildActivityFeed(invites: any[]) {
  return invites
    .map((invite) => ({
      id: invite._id,
      title: invite.driveTitle,
      status: invite.status,
      initiatedBy: invite.initiatedBy,
      companyName: invite.companyName,
      collegeName: invite.collegeName,
      driveDate: invite.driveDate,
      linkedDriveId: invite.linkedDriveId,
      updatedAt: invite.updatedAt || invite.createdAt,
      createdAt: invite.createdAt,
    }))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 12)
}

export function invitePipelineStage(invite: {
  status: string
  linkedDriveId?: string
}): { label: string; progress: number } {
  if (invite.status === "declined") return { label: "Declined", progress: 100 }
  if (invite.status === "cancelled") return { label: "Cancelled", progress: 100 }
  if (invite.linkedDriveId) return { label: "Drive live", progress: 100 }
  if (invite.status === "accepted") return { label: "Creating drive", progress: 75 }
  if (invite.status === "pending") return { label: "Awaiting response", progress: 50 }
  return { label: "Draft", progress: 25 }
}
