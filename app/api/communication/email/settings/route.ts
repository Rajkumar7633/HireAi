import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import EmailLog from "@/models/EmailLog"
import { isAutoEmailEnabled } from "@/lib/status-change-email"
export { dynamic } from "@/lib/api-dynamic"


function mask(value: string | undefined): string {
  if (!value) return ""
  if (value.length <= 4) return "****"
  return value.slice(0, 2) + "****" + value.slice(-2)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const host = process.env.SMTP_HOST || process.env.EMAIL_SERVICE_HOST || ""
    const user = process.env.SMTP_USER || process.env.EMAIL_SERVICE_USER || ""
    const from = process.env.SMTP_FROM || user || ""
    const port = Number(process.env.SMTP_PORT || process.env.EMAIL_SERVICE_PORT || 587)
    const configured = Boolean(host && user && (process.env.SMTP_PASS || process.env.EMAIL_SERVICE_PASS))

    const recruiterId = session.userId
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [totalSent, sentThisWeek, agg] = await Promise.all([
      EmailLog.countDocuments({ recruiterId }),
      EmailLog.countDocuments({ recruiterId, sentAt: { $gte: weekAgo } }),
      EmailLog.aggregate([
        { $match: { recruiterId: session.userId } },
        {
          $group: {
            _id: null,
            opens: { $sum: "$opens" },
            clicks: { $sum: "$clicks" },
          },
        },
      ]),
    ])

    const totals = agg[0] || { opens: 0, clicks: 0 }

    return NextResponse.json({
      smtp: {
        configured,
        host: mask(host),
        user: mask(user),
        from,
        port,
        secure: port === 465,
      },
      autoSendEnabled: isAutoEmailEnabled(),
      stats: {
        totalSent,
        sentThisWeek,
        totalOpens: totals.opens || 0,
        totalClicks: totals.clicks || 0,
        openRate: totalSent > 0 ? Math.round(((totals.opens || 0) / totalSent) * 100) : 0,
      },
    })
  } catch (error) {
    console.error("email settings GET error", error)
    return NextResponse.json({ message: "Failed to load settings" }, { status: 500 })
  }
}
