import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

export type CollabResources = {
    doc: Y.Doc;
    provider: WebrtcProvider;
    yText: Y.Text;
    yPrompt: Y.Text;
    yMeta: Y.Map<any>;
    refs: number;
};

const rooms = new Map<string, CollabResources>();

export function acquireCollab(roomKey: string): CollabResources {
    const existing = rooms.get(roomKey);
    if (existing) {
        existing.refs++;
        return existing;
    }
    const doc = new Y.Doc();
    const provider = new WebrtcProvider(roomKey, doc);
    const yText = doc.getText("code");
    const yPrompt = doc.getText("prompt");
    const yMeta = doc.getMap<any>("meta");
    const created: CollabResources = { doc, provider, yText, yPrompt, yMeta, refs: 1 };
    rooms.set(roomKey, created);
    return created;
}

export function releaseCollab(roomKey: string) {
    const res = rooms.get(roomKey);
    if (!res) return;
    res.refs--;
    if (res.refs <= 0) {
        try { res.provider.destroy?.(); } catch { }
        try { res.provider.disconnect?.(); } catch { }
        try { res.doc.destroy(); } catch { }
        rooms.delete(roomKey);
    }
}
