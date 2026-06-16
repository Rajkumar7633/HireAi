/**
 * Browser face detection for proctoring — BlazeFace (TensorFlow.js) via CDN.
 * Works across Chrome, Firefox, and Edge without the experimental FaceDetector API.
 */

import { loadProctorScript } from "@/lib/proctor-script-loader"

const TFJS_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"
const BLAZEFACE_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.js"

export type FaceBox = {
  x: number
  y: number
  width: number
  height: number
  score: number
}

type BlazePrediction = {
  topLeft: [number, number]
  bottomRight: [number, number]
  probability: number | number[]
}

export class ProctorFaceDetector {
  private model: {
    estimateFaces: (
      input: HTMLVideoElement | HTMLCanvasElement,
      returnTensors?: boolean,
    ) => Promise<BlazePrediction[]>
  } | null = null
  private loading: Promise<boolean> | null = null
  public ready = false
  public error: string | null = null

  async init(): Promise<boolean> {
    if (this.model) {
      this.ready = true
      return true
    }
    if (this.loading) return this.loading

    this.loading = (async () => {
      try {
        await loadProctorScript(TFJS_URL)
        await loadProctorScript(BLAZEFACE_URL)
        const blazeface = (window as unknown as {
          blazeface?: { load: () => Promise<ProctorFaceDetector["model"]> }
        }).blazeface
        if (!blazeface?.load) throw new Error("blazeface not available")
        this.model = await blazeface.load()
        this.ready = true
        this.error = null
      } catch (e) {
        this.error = e instanceof Error ? e.message : "Face model failed to load"
        this.ready = false
      }
      return this.ready
    })()

    const ok = await this.loading
    this.loading = null
    return ok
  }

  async detect(video: HTMLVideoElement, minScore = 0.75): Promise<FaceBox[]> {
    if (!this.model || video.readyState < 2) return []
    try {
      const preds = await this.model.estimateFaces(video, false)
      return preds
        .map((p) => {
          const prob = Array.isArray(p.probability) ? p.probability[0] : p.probability
          const score = typeof prob === "number" ? prob : 0
          const x = p.topLeft[0]
          const y = p.topLeft[1]
          const w = p.bottomRight[0] - x
          const h = p.bottomRight[1] - y
          return { x, y, width: w, height: h, score }
        })
        .filter((f) => f.score >= minScore && f.width > 20 && f.height > 20)
    } catch {
      return []
    }
  }
}

export function drawFaceBoxes(ctx: CanvasRenderingContext2D, faces: FaceBox[], color = "rgba(16,185,129,0.85)") {
  for (const f of faces) {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(f.x, f.y, f.width, f.height)
    ctx.fillStyle = color
    ctx.font = "11px sans-serif"
    ctx.fillText(`face ${Math.round(f.score * 100)}%`, f.x + 2, f.y - 4)
  }
}
