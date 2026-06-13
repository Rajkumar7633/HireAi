/**
 * Browser object detection for proctoring — COCO-SSD (TensorFlow.js) via CDN.
 * Detects phones, books, remotes, and multiple persons without bundling heavy ML deps.
 */

export type SuspiciousObjectKind = "phone" | "book" | "device" | "extra_person"

export type SuspiciousObjectHit = {
  kind: SuspiciousObjectKind
  label: string
  score: number
  bbox: { x: number; y: number; width: number; height: number }
}

type CocoPrediction = {
  class: string
  score: number
  bbox: [number, number, number, number] // x, y, width, height
}

const TFJS_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"
const COCO_SSD_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js"

const PHONE_LABELS = new Set(["cell phone"])
const BOOK_LABELS = new Set(["book"])
const DEVICE_LABELS = new Set(["remote", "keyboard", "mouse"])

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
    if (existing) {
      if (existing.dataset.loaded === "true") resolve()
      else existing.addEventListener("load", () => resolve(), { once: true })
      return
    }
    const s = document.createElement("script")
    s.src = src
    s.async = true
    s.onload = () => {
      s.dataset.loaded = "true"
      resolve()
    }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(s)
  })
}

function toHit(kind: SuspiciousObjectKind, label: string, score: number, bbox: [number, number, number, number]): SuspiciousObjectHit {
  return {
    kind,
    label,
    score,
    bbox: { x: bbox[0], y: bbox[1], width: bbox[2], height: bbox[3] },
  }
}

export class ProctorObjectDetector {
  private model: { detect: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<CocoPrediction[]> } | null = null
  private loading: Promise<void> | null = null
  private lastWarnAt: Record<string, number> = {}
  private cooldownMs = 9000
  public ready = false
  public error: string | null = null

  async init(): Promise<boolean> {
    if (this.model) {
      this.ready = true
      return true
    }
    if (this.loading) {
      await this.loading
      return this.ready
    }

    this.loading = (async () => {
      try {
        await loadScript(TFJS_URL)
        await loadScript(COCO_SSD_URL)
        const cocoSsd = (window as unknown as {
          cocoSsd?: { load: (config?: { base?: string }) => Promise<ProctorObjectDetector["model"]> }
        }).cocoSsd
        if (!cocoSsd?.load) {
          throw new Error("coco-ssd not available on window")
        }
        this.model = await cocoSsd.load({ base: "lite_mobilenet_v2" })
        this.ready = true
        this.error = null
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Object model failed to load"
        this.ready = false
      }
    })()

    await this.loading
    this.loading = null
    return this.ready
  }

  shouldWarn(kind: string): boolean {
    const now = Date.now()
    if (now - (this.lastWarnAt[kind] || 0) < this.cooldownMs) return false
    this.lastWarnAt[kind] = now
    return true
  }

  async detect(video: HTMLVideoElement): Promise<SuspiciousObjectHit[]> {
    if (!this.model || video.readyState < 2) return []

    try {
      const preds = await this.model.detect(video)
      const hits: SuspiciousObjectHit[] = []

      for (const p of preds) {
        if (PHONE_LABELS.has(p.class) && p.score >= 0.52) {
          hits.push(toHit("phone", p.class, p.score, p.bbox))
        } else if (BOOK_LABELS.has(p.class) && p.score >= 0.55) {
          hits.push(toHit("book", p.class, p.score, p.bbox))
        } else if (DEVICE_LABELS.has(p.class) && p.score >= 0.6) {
          hits.push(toHit("device", p.class, p.score, p.bbox))
        }
      }

      const persons = preds.filter(p => p.class === "person" && p.score >= 0.45)
      if (persons.length >= 2) {
        const best = persons.sort((a, b) => b.score - a.score)[1]
        hits.push(toHit("extra_person", "person", best.score, best.bbox))
      }

      return hits
    } catch {
      return []
    }
  }

  violationMessage(hit: SuspiciousObjectHit): { type: string; message: string } {
    switch (hit.kind) {
      case "phone":
        return {
          type: "phone_detected",
          message: "Phone or mobile device detected in camera view. Remove it from the frame.",
        }
      case "book":
        return {
          type: "book_detected",
          message: "Book or notes detected in camera view. Remove unauthorized materials.",
        }
      case "device":
        return {
          type: "suspicious_device",
          message: `Unauthorized device detected (${hit.label}). Remove it from view.`,
        }
      case "extra_person":
        return {
          type: "extra_person",
          message: "Another person detected in the camera frame. Only you should be visible.",
        }
      default:
        return {
          type: "suspicious_object",
          message: "Suspicious object detected in camera view.",
        }
    }
  }
}

export function drawObjectOverlay(
  ctx: CanvasRenderingContext2D,
  hits: SuspiciousObjectHit[],
) {
  for (const hit of hits) {
    const color =
      hit.kind === "phone" ? "rgba(239,68,68,0.85)" :
      hit.kind === "extra_person" ? "rgba(249,115,22,0.85)" :
      "rgba(234,179,8,0.85)"
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(hit.bbox.x, hit.bbox.y, hit.bbox.width, hit.bbox.height)
    ctx.fillStyle = color
    ctx.font = "11px sans-serif"
    ctx.fillText(`${hit.label} ${Math.round(hit.score * 100)}%`, hit.bbox.x + 2, hit.bbox.y - 4)
  }
}
