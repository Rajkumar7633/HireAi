import { NextResponse, type NextRequest } from "next/server";
// @ts-ignore – pdfkit standalone bundle, avoids runtime font file lookups
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Application from "@/models/Application";
import Assessment from "@/models/Assessment";

export const dynamic = "force-dynamic";

async function buildResults(assessmentId: string, userId: string) {
    await connectDB();

    const applicationDoc: any = await Application.findOne({
        jobSeekerId: userId,
        assessmentId,
        status: { $in: ["Assessment Completed", "completed", "test_completed"] },
    })
        .populate("assessmentId", "title totalPoints questions durationMinutes")
        .lean();

    if (!applicationDoc) return null;

    const application: any = applicationDoc;
    const assessment: any = application.assessmentId;
    const totalQuestions = assessment?.questions?.length || 0;
    const correctAnswers = (application.answers || []).filter((a: any) => a.isCorrect)
        .length;

    // Build difficulty-wise stats (Easy / Medium / Hard)
    const questionMeta: Record<string, { difficulty: string }> = {};
    (assessment?.questions || []).forEach((q: any) => {
        const id = q._id?.toString?.() || String(q._id);
        questionMeta[id] = { difficulty: q.difficulty || "Medium" };
    });

    const difficultyStats: Record<string, { total: number; correct: number }> = {
        Easy: { total: 0, correct: 0 },
        Medium: { total: 0, correct: 0 },
        Hard: { total: 0, correct: 0 },
    };

    (application.answers || []).forEach((a: any) => {
        const meta = questionMeta[a.questionId] || { difficulty: "Medium" };
        const key = (meta.difficulty || "Medium") as keyof typeof difficultyStats;
        if (!difficultyStats[key]) {
            difficultyStats[key] = { total: 0, correct: 0 };
        }
        difficultyStats[key].total += 1;
        if (a.isCorrect) difficultyStats[key].correct += 1;
    });

    const results = {
        assessmentId,
        title: assessment?.title || "Assessment",
        score: application.score || 0,
        maxScore: assessment?.totalPoints || 100,
        percentage: application.score || 0,
        passingScore: 70,
        passed: (application.score || 0) >= 70,
        completedAt: application.completedAt,
        duration: application.timeSpent || 0,
        totalQuestions,
        correctAnswers,
        proctoringScore: application.proctoringData?.score ?? 100,
        difficultyStats,
        benchmarkData: {
            averageScore: 70,
            percentile: Math.min(
                99,
                Math.max(1, Math.round((application.score || 0) / 1.2))
            ),
            topPercentile: 95,
            industryAverage: 68,
        },
    };

    return results;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const assessmentId = params.id;
        const session = await getSession(request);

        if (!session || session.role !== "job_seeker") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const results = await buildResults(assessmentId, session.userId);

        if (!results) {
            return NextResponse.json(
                { message: "No completed results found" },
                { status: 404 }
            );
        }

        // Build PDF into a buffer
        const doc = new PDFDocument({ margin: 40 });
        const chunks: Buffer[] = [];

        return await new Promise<NextResponse>((resolve, reject) => {
            doc.on("data", (chunk: Buffer) => chunks.push(chunk));
            doc.on("end", () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(
                    new NextResponse(pdfBuffer, {
                        status: 200,
                        headers: {
                            "Content-Type": "application/pdf",
                            "Content-Disposition": `attachment; filename=assessment-${assessmentId}-report.pdf`,
                        },
                    })
                );
            });
            doc.on("error", reject);

            // === PDF content with improved layout ===

            // Header bar with app name + report title
            const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            doc
                .rect(doc.page.margins.left, 40, pageWidth, 40)
                .fill('#0f766e'); // teal header

            doc.fill('#ffffff');
            doc.fontSize(16).text('HireAI', doc.page.margins.left + 16, 48, {
                align: 'left',
            });
            doc.fontSize(11).text('Candidate Assessment Report', doc.page.margins.left + 16, 66, {
                align: 'left',
            });

            // Reset for body
            doc.moveDown(2);
            doc.fill('#000000');

            // Assessment meta section
            doc.fontSize(13).text('Assessment Details', { underline: true });
            doc.moveDown(0.6);

            doc.fontSize(11);
            doc.text(`Assessment: ${results.title}`);
            doc.text(`Assessment ID: ${results.assessmentId}`);
            doc.text(
                `Completed At: ${results.completedAt ? new Date(results.completedAt).toLocaleString() : '-'}`
            );
            doc.moveDown(1);

            // Two-column summary block
            const startY = doc.y;
            const colWidth = pageWidth / 2 - 8;

            // Left column: score summary card
            doc
                .roundedRect(doc.page.margins.left, startY, colWidth, 90, 6)
                .fill('#ecfdf3');
            doc.fill('#14532d').fontSize(11);
            doc.text('Score Summary', doc.page.margins.left + 10, startY + 10);
            doc.fill('#000000').fontSize(10);
            doc.text(
                `Score: ${results.score} / ${results.maxScore}`,
                doc.page.margins.left + 10,
                startY + 28
            );
            doc.text(
                `Percentage: ${results.percentage}%`,
                doc.page.margins.left + 10,
                startY + 42
            );
            doc.text(
                `Passing Threshold: ${results.passingScore}%`,
                doc.page.margins.left + 10,
                startY + 56
            );
            doc.text(
                `Result: ${results.passed ? 'PASSED' : 'NOT PASSED'}`,
                doc.page.margins.left + 10,
                startY + 70
            );

            // Right column: question summary card
            const rightX = doc.page.margins.left + colWidth + 16;
            doc
                .roundedRect(rightX, startY, colWidth, 90, 6)
                .fill('#eff6ff');
            doc.fill('#1d4ed8').fontSize(11);
            doc.text('Question Summary', rightX + 10, startY + 10);
            doc.fill('#000000').fontSize(10);
            doc.text(
                `Total Questions: ${results.totalQuestions}`,
                rightX + 10,
                startY + 28
            );
            doc.text(
                `Correct Answers: ${results.correctAnswers}`,
                rightX + 10,
                startY + 42
            );
            doc.text(
                `Proctoring Score: ${results.proctoringScore}%`,
                rightX + 10,
                startY + 56
            );

            doc.y = startY + 112;
            doc.moveDown(0.5);

            // Lower block: Benchmark + Difficulty side by side
            const lowerStartY = doc.y;
            const lowerColWidth = pageWidth / 2 - 8;

            // Left: Benchmark
            doc.fontSize(13).text('Benchmark Data', doc.page.margins.left, lowerStartY);
            doc.moveDown(0.4);
            doc.fontSize(11);
            doc.text(
                `Average Score: ${results.benchmarkData.averageScore}%`,
                doc.page.margins.left,
                doc.y
            );
            doc.text(
                `Percentile: ${results.benchmarkData.percentile}th`,
                doc.page.margins.left,
                doc.y
            );
            doc.text(
                `Top Performers: ${results.benchmarkData.topPercentile}%`,
                doc.page.margins.left,
                doc.y
            );
            doc.text(
                `Industry Average: ${results.benchmarkData.industryAverage}%`,
                doc.page.margins.left,
                doc.y
            );

            // Right: Difficulty table
            const diffStartX = doc.page.margins.left + lowerColWidth + 16;
            let diffY = lowerStartY;
            doc.fontSize(13).text('Difficulty Breakdown', diffStartX, diffY);
            diffY = doc.y + 4;
            doc.fontSize(10);

            const col1 = diffStartX;
            const col2 = diffStartX + 100;
            const col3 = diffStartX + 180;

            doc.text('Difficulty', col1, diffY, { continued: true });
            doc.text('Correct / Total', col2, diffY, { continued: true });
            doc.text('Accuracy', col3, diffY);

            diffY += 14;

            ['Easy', 'Medium', 'Hard'].forEach((diff) => {
                const stats = (results as any).difficultyStats?.[diff] || { total: 0, correct: 0 };
                const acc = stats.total
                    ? Math.round((stats.correct / stats.total) * 100)
                    : 0;
                doc.text(diff, col1, diffY, { continued: true });
                doc.text(`${stats.correct} / ${stats.total}`, col2, diffY, { continued: true });
                doc.text(`${acc}%`, col3, diffY);
                diffY += 12;
            });

            // Footer with date, page number, and generator text
            const footerY = doc.page.height - doc.page.margins.bottom + 5;
            const today = new Date().toLocaleDateString();
            doc.fontSize(8).fill('#6b7280');
            doc.text(
                `Generated by HireAI • ${today}`,
                doc.page.margins.left,
                footerY,
                { width: pageWidth / 2 }
            );
            doc.text(
                `Page ${doc.page.pageNumber}`,
                doc.page.margins.left + pageWidth / 2,
                footerY,
                { width: pageWidth / 2, align: 'right' }
            );

            doc.end();
        });
    } catch (error) {
        console.error("[report-pdf] Failed to generate report PDF", error);
        return NextResponse.json(
            { message: "Failed to generate PDF" },
            { status: 500 }
        );
    }
}
