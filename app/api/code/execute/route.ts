import { NextRequest, NextResponse } from "next/server";

// Map monaco label -> Judge0 language IDs (fallback accepts languageId directly)
const DEFAULT_TIMEOUT_MS = 20000;

export async function POST(req: NextRequest) {
  try {
    const { languageId, language, code, stdin } = await req.json();
    if (!code || (!languageId && !language)) {
      return NextResponse.json({ message: "languageId or language and code are required" }, { status: 400 });
    }

    const JUDGE0_URL = process.env.JUDGE0_URL || "https://judge0-ce.p.rapidapi.com";
    const JUDGE0_KEY = process.env.JUDGE0_KEY; // optional

    const body = {
      language_id: languageId ?? language?.id,
      source_code: code,
      stdin: stdin || "",
      redirect_stderr_to_stdout: true,
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (JUDGE0_URL.includes("rapidapi")) {
      if (!JUDGE0_KEY) return NextResponse.json({ message: "JUDGE0_KEY missing for RapidAPI" }, { status: 500 });
      headers["X-RapidAPI-Key"] = JUDGE0_KEY;
      headers["X-RapidAPI-Host"] = new URL(JUDGE0_URL).host;
    }

    // Create submission
    const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      // Avoid Next.js caching
      cache: "no-store",
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      return new NextResponse(`Judge0 error: ${createRes.status} ${JSON.stringify(createData)}`, { status: 500 });
    }

    const token = createData?.token;
    if (!token) return new NextResponse("Judge0 did not return token", { status: 500 });

    // Poll result
    const started = Date.now();
    while (Date.now() - started < DEFAULT_TIMEOUT_MS) {
      const res = await fetch(`${JUDGE0_URL}/submissions/${token}?base64_encoded=false`, { headers, cache: "no-store" });
      const data = await res.json();
      const statusId = data?.status?.id;
      if (statusId === 1 || statusId === 2) {
        // In queue or processing, wait
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      // Completed or error
      const stdout = data.stdout || "";
      const stderr = data.stderr || data.compile_output || "";
      const time = data.time ? `\nTime: ${data.time}s` : "";
      const memory = data.memory ? `, Memory: ${data.memory} KB` : "";
      const out = [stdout, stderr && `\n${stderr}`, time || "", memory || ""].filter(Boolean).join("");
      return new NextResponse(out, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    return new NextResponse("Execution timeout", { status: 504 });
  } catch (e: any) {
    return new NextResponse(`Server error: ${e?.message || e}`, { status: 500 });
  }
}
