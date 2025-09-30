import { NextRequest } from "next/server";

// In-memory subscribers map per conversation (dev/demo; not for multi-instance)
const subscribers: Map<string, Set<(data: string) => void>> = (global as any).__convSubs || new Map();
(global as any).__convSubs = subscribers;

export function addConversationEvent(convId: string, payload: any) {
  const set = subscribers.get(convId);
  if (!set || set.size === 0) return;
  const data = JSON.stringify(payload);
  for (const emit of set) {
    try {
      emit(data);
    } catch {}
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const convId = params.id;
  return new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const emit = (data: string) => {
          controller.enqueue(encoder.encode(`event: message\n`));
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };
        let set = subscribers.get(convId);
        if (!set) {
          set = new Set();
          subscribers.set(convId, set);
        }
        set.add(emit);

        // heartbeat to keep connection alive
        const hb = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`event: ping\n`));
            controller.enqueue(encoder.encode(`data: {}\n\n`));
          } catch {}
        }, 25000);

        const close = () => {
          clearInterval(hb);
          set?.delete(emit);
        };

        // @ts-ignore
        req.signal?.addEventListener?.("abort", close);
      },
      cancel() {},
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
