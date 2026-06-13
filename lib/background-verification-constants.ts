export const PROVIDER_INFO: Record<
  string,
  { description: string; avgDays: number; costUsd: number }
> = {
  Manual: { description: "Handled by your internal team", avgDays: 7, costUsd: 0 },
  Checkr: { description: "Automated US background checks", avgDays: 2, costUsd: 35 },
  Hireright: { description: "Global enterprise screening", avgDays: 3, costUsd: 55 },
  Sterling: { description: "Compliance-first screening", avgDays: 3, costUsd: 48 },
  GoodHire: { description: "Simple SMB background checks", avgDays: 2, costUsd: 30 },
}
