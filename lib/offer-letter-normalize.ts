/** Normalize compensation payload before Mongoose save (handles equity/relocation shapes). */
export function normalizeOfferCompensation(compensation: Record<string, unknown> | undefined) {
  if (!compensation) {
    return {
      baseSalary: 0,
      currency: "USD",
      salaryPeriod: "Annual" as const,
      benefits: [] as string[],
    }
  }

  const out: Record<string, unknown> = { ...compensation }

  const equity = out.equity
  if (equity != null) {
    if (typeof equity === "object" && equity !== null) {
      const eq = equity as { granted?: boolean; type?: string; quantity?: number; vestingSchedule?: string; strikePrice?: number }
      if (eq.granted) {
        out.equity = {
          granted: true,
          type: eq.type || undefined,
          quantity: Number(eq.quantity) || 0,
          vestingSchedule: eq.vestingSchedule || undefined,
          strikePrice: Number(eq.strikePrice) || undefined,
        }
      } else {
        delete out.equity
      }
    } else {
      delete out.equity
    }
  }

  const relocation = out.relocation
  if (relocation != null && typeof relocation === "object") {
    const rel = relocation as { included?: boolean; amount?: number; details?: string }
    out.relocation = rel.included
      ? {
          included: true,
          amount: Number(rel.amount) || 0,
          details: rel.details || undefined,
        }
      : { included: false }
  }

  if (!Array.isArray(out.benefits)) out.benefits = []

  return out
}
