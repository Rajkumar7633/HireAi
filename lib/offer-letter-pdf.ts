// @ts-ignore – pdfkit standalone bundle
import PDFDocument from "pdfkit/js/pdfkit.standalone.js"
import {
  type OfferCompanyBranding,
  type OfferLetterPdfInput,
  formatOfferDate,
  formatOfferMoney,
} from "@/lib/offer-letter-company"

const COLORS = {
  primary: "#4c1d95",
  primaryLight: "#7c3aed",
  text: "#1e293b",
  muted: "#64748b",
  border: "#e2e8f0",
  sectionBg: "#f8fafc",
  white: "#ffffff",
  accent: "#059669",
}

function getPopulatedName(
  field: { name?: string; email?: string } | string | undefined,
  fallback = "",
): string {
  if (!field) return fallback
  if (typeof field === "string") return fallback
  return field.name || field.email || fallback
}

function shortRef(id: string): string {
  return String(id).slice(-8).toUpperCase()
}

function drawRoundedRect(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  doc.save()
  doc.roundedRect(x, y, w, h, r).fill(fill)
  doc.restore()
}

function drawLetterhead(
  doc: InstanceType<typeof PDFDocument>,
  branding: OfferCompanyBranding,
  logoBuffer: Buffer | null,
) {
  const pageWidth = doc.page.width
  const headerHeight = 96

  doc.save()
  doc.rect(0, 0, pageWidth, headerHeight).fill(COLORS.primary)

  const margin = 50
  let textX = margin

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, margin, 22, { width: 52, height: 52, fit: [52, 52] })
      textX = margin + 64
    } catch {
      // skip broken logo
    }
  }

  doc.fillColor(COLORS.white)
  doc.font("Helvetica-Bold").fontSize(18).text(branding.companyName, textX, 26, {
    width: pageWidth - textX - margin,
    lineBreak: false,
  })

  doc.font("Helvetica").fontSize(9)
  const metaY = 50
  if (branding.address) {
    doc.text(branding.address, textX, metaY, { width: pageWidth - textX - margin })
  }
  if (branding.website) {
    doc.text(branding.website, textX, branding.address ? metaY + 12 : metaY, {
      width: pageWidth - textX - margin,
    })
  }

  doc.restore()
  doc.y = headerHeight + 28
}

function drawSectionTitle(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.moveDown(0.4)
  doc.fillColor(COLORS.primary).font("Helvetica-Bold").fontSize(11).text(title)
  doc.moveDown(0.25)
}

function drawDetailRows(
  doc: InstanceType<typeof PDFDocument>,
  rows: Array<{ label: string; value: string }>,
  startY?: number,
): number {
  const margin = 50
  const pageWidth = doc.page.width
  const boxWidth = pageWidth - margin * 2
  const rowHeight = 22
  const boxHeight = rows.length * rowHeight + 16
  const y = startY ?? doc.y

  drawRoundedRect(doc, margin, y, boxWidth, boxHeight, 6, COLORS.sectionBg)
  doc.strokeColor(COLORS.border).lineWidth(0.75)
  doc.roundedRect(margin, y, boxWidth, boxHeight, 6).stroke()

  let rowY = y + 10
  for (const row of rows) {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(row.label, margin + 14, rowY, {
      width: 140,
    })
    doc.fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .text(row.value, margin + 160, rowY, { width: boxWidth - 180 })
    rowY += rowHeight
  }

  return y + boxHeight + 10
}

function drawFooter(doc: InstanceType<typeof PDFDocument>, branding: OfferCompanyBranding) {
  const margin = 50
  const pageWidth = doc.page.width
  const footerY = doc.page.height - 42

  doc.save()
  doc.strokeColor(COLORS.border).moveTo(margin, footerY - 8).lineTo(pageWidth - margin, footerY - 8).stroke()
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8)
  doc.text(
    `${branding.companyName} · Confidential employment offer`,
    margin,
    footerY,
    { width: pageWidth - margin * 2, align: "center" },
  )
  if (branding.website || branding.recruiterEmail) {
    doc.text(
      [branding.website, branding.recruiterEmail].filter(Boolean).join(" · "),
      margin,
      footerY + 10,
      { width: pageWidth - margin * 2, align: "center" },
    )
  }
  doc.restore()
}

export async function buildOfferLetterPdfBuffer(
  letter: OfferLetterPdfInput,
  branding: OfferCompanyBranding,
  logoBuffer: Buffer | null,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 })
  const chunks: Buffer[] = []

  const candidateName = getPopulatedName(
    letter.candidateId as { name?: string },
    "Candidate",
  )
  const jobTitle =
    typeof letter.jobId === "object" && letter.jobId?.title
      ? letter.jobId.title
      : undefined
  const position = letter.offerDetails?.position || jobTitle || "Position"
  const currency = letter.compensation?.currency || "USD"
  const salaryPeriod = letter.compensation?.salaryPeriod || "Annual"

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    drawLetterhead(doc, branding, logoBuffer)

    // Title block
    doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(20).text("Offer of Employment", {
      align: "center",
    })
    doc.moveDown(0.35)
    doc.fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(9)
      .text(
        `Reference: OL-${shortRef(String(letter._id))}  ·  Issued: ${formatOfferDate(letter.sentAt || letter.createdAt)}`,
        { align: "center" },
      )
    doc.moveDown(1)

    // Greeting
    const greeting = letter.customContent?.greeting || `Dear ${candidateName},`
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(11).text(greeting)
    doc.moveDown(0.6)

    const intro =
      letter.customContent?.introduction ||
      `We are delighted to extend this formal offer of employment for the position of ${position} at ${branding.companyName}. We believe your skills and experience will be a valuable addition to our team.`
    doc.font("Helvetica").fontSize(11).text(intro, { lineGap: 3 })
    doc.moveDown(0.8)

    // Position details
    drawSectionTitle(doc, "Position Details")
    const positionEndY = drawDetailRows(doc, [
      { label: "Position", value: position },
      { label: "Department", value: letter.offerDetails?.department || "—" },
      { label: "Company", value: branding.companyName },
      { label: "Start Date", value: formatOfferDate(letter.offerDetails?.startDate) },
      { label: "Employment Type", value: letter.offerDetails?.employmentType || "—" },
      { label: "Work Location", value: letter.offerDetails?.workLocation || "—" },
      { label: "Work Arrangement", value: letter.offerDetails?.workArrangement || "—" },
      ...(letter.offerDetails?.reportingTo
        ? [{ label: "Reporting To", value: letter.offerDetails.reportingTo }]
        : []),
    ])
    doc.y = positionEndY

    // Compensation
    drawSectionTitle(doc, "Compensation & Benefits")
    const compRows: Array<{ label: string; value: string }> = [
      {
        label: "Base Salary",
        value: formatOfferMoney(letter.compensation?.baseSalary, currency, salaryPeriod),
      },
    ]
    if (letter.compensation?.bonus) {
      compRows.push({
        label: "Bonus",
        value: formatOfferMoney(
          letter.compensation.bonus,
          currency,
          letter.compensation.bonusType || "Performance",
        ),
      })
    }
    if (letter.compensation?.signingBonus) {
      compRows.push({
        label: "Signing Bonus",
        value: formatOfferMoney(letter.compensation.signingBonus, currency),
      })
    }
    if (letter.compensation?.equity?.granted) {
      const eq = letter.compensation.equity
      compRows.push({
        label: "Equity",
        value: [
          eq.type,
          eq.quantity ? `${eq.quantity} units` : null,
          eq.vestingSchedule,
        ]
          .filter(Boolean)
          .join(" · "),
      })
    }
    if (letter.compensation?.relocation?.included) {
      compRows.push({
        label: "Relocation",
        value: letter.compensation.relocation.amount
          ? formatOfferMoney(letter.compensation.relocation.amount, currency)
          : letter.compensation.relocation.details || "Included",
      })
    }

    const compEndY = drawDetailRows(doc, compRows)
    doc.y = compEndY

    if (letter.compensation?.benefits?.length) {
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text("Benefits include:", 50)
      doc.moveDown(0.2)
      for (const benefit of letter.compensation.benefits) {
        doc.fillColor(COLORS.text).font("Helvetica").fontSize(10).text(`•  ${benefit}`, {
          indent: 8,
          lineGap: 2,
        })
      }
      doc.moveDown(0.5)
    }

    // Terms
    drawSectionTitle(doc, "Terms & Conditions")
    const termsRows: Array<{ label: string; value: string }> = [
      {
        label: "Probation Period",
        value: `${letter.terms?.probationPeriod ?? 0} months`,
      },
      {
        label: "Notice Period",
        value: `${letter.terms?.noticePeriod ?? 0} days`,
      },
      {
        label: "Working Hours",
        value: letter.terms?.workingHours || "—",
      },
      {
        label: "Vacation Days",
        value: `${letter.terms?.vacationDays ?? 0} days per year`,
      },
    ]
    if (letter.terms?.sickDays) {
      termsRows.push({ label: "Sick Days", value: `${letter.terms.sickDays} days` })
    }
    if (letter.terms?.backgroundCheckRequired) {
      termsRows.push({ label: "Background Check", value: "Required before start" })
    }
    if (letter.terms?.ndaRequired) {
      termsRows.push({ label: "NDA", value: "Required" })
    }

    const termsEndY = drawDetailRows(doc, termsRows)
    doc.y = termsEndY

    if (letter.customContent?.additionalTerms || letter.terms?.otherTerms) {
      drawSectionTitle(doc, "Additional Terms")
      doc.fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(10)
        .text(letter.customContent?.additionalTerms || letter.terms?.otherTerms || "", {
          lineGap: 3,
        })
      doc.moveDown(0.6)
    }

    // Response deadline highlight
    const deadlineY = doc.y
    const deadlineText = formatOfferDate(letter.expiresAt)
    drawRoundedRect(doc, 50, deadlineY, doc.page.width - 100, 34, 6, "#ecfdf5")
    doc.strokeColor("#a7f3d0").roundedRect(50, deadlineY, doc.page.width - 100, 34, 6).stroke()
    doc.fillColor(COLORS.accent)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`Please accept or decline this offer by ${deadlineText}.`, 62, deadlineY + 11, {
        width: doc.page.width - 124,
      })
    doc.y = deadlineY + 44

    // Closing
    const closing =
      letter.customContent?.closing ||
      "We are excited about the possibility of you joining our team. Please sign below to indicate your acceptance of this offer."
    doc.moveDown(0.4)
    doc.fillColor(COLORS.text).font("Helvetica").fontSize(11).text(closing, { lineGap: 3 })
    doc.moveDown(1.2)

    doc.font("Helvetica").fontSize(11).text("Sincerely,")
    doc.moveDown(0.3)
    doc.font("Helvetica-Bold").fontSize(11).text(branding.recruiterName || "Hiring Team")
    if (branding.recruiterEmail) {
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted).text(branding.recruiterEmail)
    }
    doc.fillColor(COLORS.text)
    doc.font("Helvetica").fontSize(10).text(branding.companyName)

    // Signature blocks
    doc.moveDown(1.5)
    const sigY = doc.y
    const colWidth = (doc.page.width - 100) / 2

    doc.font("Helvetica-Bold").fontSize(9).text("Authorized Signatory", 50, sigY)
    doc.moveTo(50, sigY + 36).lineTo(50 + colWidth - 20, sigY + 36).stroke(COLORS.border)
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("Signature & Date", 50, sigY + 40)

    doc.fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Candidate Acceptance", 50 + colWidth, sigY)
    doc.moveTo(50 + colWidth, sigY + 36)
      .lineTo(doc.page.width - 50, sigY + 36)
      .stroke(COLORS.border)

    if (letter.signature?.candidateSigned) {
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.text)
        .text(
          `${letter.signature.candidateSignature || "Signed"} · ${formatOfferDate(
            letter.signature.candidateSignedAt,
          )}`,
          50 + colWidth,
          sigY + 18,
          { width: colWidth - 10 },
        )
    } else {
      doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text("Signature & Date", 50 + colWidth, sigY + 40)
    }

    drawFooter(doc, branding)
    doc.end()
  })
}
