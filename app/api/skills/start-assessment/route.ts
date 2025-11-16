import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const authToken = cookies().get("auth-token")?.value;

        const res = await fetch(`${BACKEND_URL}/api/skills/start-assessment`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify(body),
            cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error("/api/skills/start-assessment error", err);
        return NextResponse.json({ msg: "Server error" }, { status: 500 });
    }
}
