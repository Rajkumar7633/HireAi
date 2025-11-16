import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

export async function GET(request: NextRequest) {
    try {
        const authToken = cookies().get("auth-token")?.value;

        const res = await fetch(`${BACKEND_URL}/api/skills/history`, {
            method: "GET",
            headers: {
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error("/api/skills/history error", err);
        return NextResponse.json({ msg: "Server error" }, { status: 500 });
    }
}
