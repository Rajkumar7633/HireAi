import { readFileSync, writeFileSync, readdirSync, statSync } from "fs"
import { join } from "path"

const ROOT = join(process.cwd(), "app/api")
const MARKER = 'export { dynamic } from "@/lib/api-dynamic"'
const BROKEN = /import \{\s*\n\s*export \{ dynamic \} from "@\/lib\/api-dynamic"\s*\n/

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name === "route.ts") out.push(p)
  }
  return out
}

function lastImportLineIndex(lines) {
  let last = -1
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t.startsWith("import ") || t.startsWith("} from ")) last = i
  }
  return last
}

let fixed = 0
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8")
  if (!BROKEN.test(src)) continue

  const cleaned = src.replace(
    /import \{\s*\n\s*export \{ dynamic \} from "@\/lib\/api-dynamic"\s*\n/g,
    "import {\n"
  )

  const lines = cleaned.split("\n")
  const insertAt = lastImportLineIndex(lines) + 1
  if (!lines.some((l) => l.trim() === MARKER)) {
    lines.splice(insertAt, 0, MARKER, "")
  }

  writeFileSync(file, lines.join("\n"))
  fixed++
  console.log("fixed:", file)
}

console.log(`Repaired ${fixed} broken route files`)
