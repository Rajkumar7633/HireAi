import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import Application from "@/models/Application"
import Company from "@/models/Company"

export async function GET(_req: NextRequest) {
  try {
    await connectDB()

    // Group jobs by companyId
    const jobs = await JobDescription.find({}).select("companyId status createdAt")

    const companyMap: Record<string, { companyId: string; total: number; open: number; paused: number; closed: number }> = {}

    for (const j of jobs) {
      const key = j.companyId ? String(j.companyId) : "unknown"
      if (!companyMap[key]) companyMap[key] = { companyId: key, total: 0, open: 0, paused: 0, closed: 0 }
      companyMap[key].total += 1
      const status = (j.status || "active").toLowerCase()
      if (status === "active" || status === "open") companyMap[key].open += 1
      else if (status === "paused") companyMap[key].paused += 1
      else companyMap[key].closed += 1
    }

    // Compute hired per company
    const companyIds = Object.keys(companyMap).filter((id) => id !== "unknown")
    let hiredByCompany: Record<string, number> = {}
    if (companyIds.length > 0) {
      const appsAgg = await Application.aggregate([
        { $match: { $or: [{ status: "Hired" }, { status: "hired" }] } },
        {
          $lookup: {
            from: "jobdescriptions",
            localField: "jobDescriptionId",
            foreignField: "_id",
            as: "job",
          },
        },
        { $unwind: "$job" },
        { $group: { _id: "$job.companyId", count: { $sum: 1 } } },
      ])
      for (const r of appsAgg) {
        if (!r._id) continue
        hiredByCompany[String(r._id)] = r.count
      }
    }

    // Attach company profiles
    const companies = await Company.find({ _id: { $in: companyIds } }).select("name logoUrl")
    const profileById = Object.fromEntries(companies.map((c: any) => [String(c._id), { name: c.name, logoUrl: c.logoUrl || "" }]))

    const result = Object.values(companyMap)
      .map((row) => ({
        companyId: row.companyId,
        name: row.companyId !== "unknown" ? profileById[row.companyId]?.name || "Company" : "Unknown",
        logoUrl: row.companyId !== "unknown" ? profileById[row.companyId]?.logoUrl || "" : "",
        total: row.total,
        open: row.open,
        paused: row.paused,
        closed: row.closed,
        hired: hiredByCompany[row.companyId] || 0,
      }))
      // Put known companies first
      .sort((a, b) => (a.companyId === "unknown" ? 1 : b.companyId === "unknown" ? -1 : b.total - a.total))

    return NextResponse.json({ companies: result })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "failed" }, { status: 500 })
  }
}
