export function loadProctorScript(src: string): Promise<void> {
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
