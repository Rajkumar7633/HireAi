import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import Application from "@/models/Application"

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url)
        const companyParam = url.searchParams.get("companyId") || undefined
        const companyIds = (companyParam ? companyParam.split(',').map((s)=>s.trim()).filter(Boolean) : []) as string[]
        const range = (url.searchParams.get("range") || "").toLowerCase() as "24h"|"7d"|""
        const now = new Date()
        const startDate = range === "24h" ? new Date(now.getTime() - 24*60*60*1000) : range === "7d" ? new Date(now.getTime() - 7*24*60*60*1000) : null
        // Attempt admin jobs endpoint first with a generous page size; fallback to recruiter jobs
        const adminQs = new URLSearchParams({ page: "1", limit: "1000", ...(companyParam ? { companyId: companyParam } : {}) })
        const adminRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/jobs?${adminQs.toString()}`, { cache: "no-store" }).catch(() => null)
        let list: any[] | null = null
        if (adminRes && adminRes.ok) {
            const data = await adminRes.json().catch(() => ({}))
            list = Array.isArray(data) ? data : (data.items || data.jobs || [])
        }
        if (!list) {
            const recRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/recruiter/job-descriptions`, { cache: "no-store" }).catch(() => null)
            if (recRes && recRes.ok) {
                const d2 = await recRes.json().catch(() => ({}))
                list = Array.isArray(d2) ? d2 : (d2.items || d2.jobs || [])
            }
        }
        let items = Array.isArray(list) ? list : []
        const pickCompanyId = (j: any) => {
            if (!j) return ""
            const cid = (j as any).companyId
            if (typeof cid === 'object' && cid) {
                // populated Company doc
                if (cid._id) return String(cid._id)
                if (cid.id) return String(cid.id)
            }
            return String(cid || (j.company || j.org || ""))
        }

        // If still empty, fallback to DB directly (recruiter-side models)
        let totalJobs = 0
        let hired = 0
        if (!items || items.length === 0) {
            await connectDB()
            const baseQuery: any = {}
            if (companyIds.length > 0) baseQuery.companyId = { $in: companyIds }
            const jobs = await JobDescription.find(baseQuery).select("title companyId createdAt status")
            items = jobs.map((j: any) => ({
                title: j.title,
                company: undefined,
                companyId: j.companyId,
                createdAt: j.createdAt,
                status: (j.status || "active").toLowerCase() === "active" ? "open" : (j.status || "unknown").toLowerCase(),
            }))
        }
        // Apply company filter to items if data came from HTTP proxies
        if (companyIds.length > 0 && items && items.length > 0) {
            items = items.filter((j: any) => companyIds.includes(pickCompanyId(j)))
        }

        // If HTTP list existed but filtering zeroed it out, query DB for exact companies
        if (companyIds.length > 0 && (!items || items.length === 0)) {
            await connectDB()
            const jobs = await JobDescription.find({ companyId: { $in: companyIds } }).select("title companyId createdAt status postedDate")
            items = jobs.map((j: any) => ({
                title: j.title,
                companyId: j.companyId,
                createdAt: j.createdAt || j.postedDate,
                status: (j.status || "active").toLowerCase() === "active" ? "open" : (j.status || "unknown").toLowerCase(),
            }))
        }

        // Totals
        try {
            await connectDB()
            const jobFilter: any = companyIds.length > 0 ? { companyId: { $in: companyIds } } : {}
            totalJobs = await JobDescription.countDocuments(jobFilter)
            if (companyIds.length > 0) {
                // collect job ids for these companies
                const companyJobs = await JobDescription.find({ companyId: { $in: companyIds } }).select("_id")
                const ids = companyJobs.map((j: any) => j._id)
                hired = await Application.countDocuments({ jobDescriptionId: { $in: ids }, $or: [{ status: "Hired" }, { status: "hired" }] })
            } else {
                hired = await Application.countDocuments({ $or: [{ status: "Hired" }, { status: "hired" }] })
            }
        } catch {}

        // Aggregate
        const todayKey = now.toISOString().slice(0, 10)
        const counts = { open: 0, paused: 0, closed: 0, today: 0 }
        const byStatus: Record<string, number> = {}
        const byCompany: Record<string, number> = {}
        const tsMap: Record<string, number> = {}

        for (const j of items) {
            // range filter
            const createdRaw: any = (j as any).createdAt || (j as any).postedDate || null
            const createdAt = createdRaw ? new Date(createdRaw) : null
            if (startDate && createdAt && createdAt < startDate) continue
            let status = String((j.status || "").toLowerCase() || "unknown")
            if (status === "active") status = "open"
            byStatus[status] = (byStatus[status] || 0) + 1
            if (status === "open") counts.open++
            else if (status === "paused") counts.paused++
            else if (status === "closed") counts.closed++

            const comp = pickCompanyId(j) || "Unknown"
            byCompany[comp] = (byCompany[comp] || 0) + 1

            const created = createdAt
            const key = created ? created.toISOString().slice(0, 10) : null
            if (key) tsMap[key] = (tsMap[key] || 0) + 1
            if (key === todayKey) counts.today++
        }

        const timeseries = Object.keys(tsMap)
            .sort()
            .map((k) => ({ date: k, posted: tsMap[k] }))

        const byStatusArr = Object.keys(byStatus).map((k) => ({ status: k, count: byStatus[k] }))
        const byCompanyArr = Object.keys(byCompany)
            .sort((a, b) => byCompany[b] - byCompany[a])
            .slice(0, 10)
            .map((k) => ({ company: k, count: byCompany[k] }))

        return NextResponse.json({ counts, timeseries, byStatus: byStatusArr, byCompany: byCompanyArr, totalJobs, hired }, { status: 200 })
    } catch (e: any) {
        return NextResponse.json({ message: e?.message || "failed" }, { status: 500 })
    }
}
