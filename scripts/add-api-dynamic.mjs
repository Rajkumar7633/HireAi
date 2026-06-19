import { readFileSync, writeFileSync } from "fs"
import { readdirSync, statSync } from "fs"
import { join } from "path"

const ROOT = join(process.cwd(), "app/api")
const MARKER = 'export { dynamic } from "@/lib/api-dynamic"'

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name === "route.ts") out.push(p)
  }
  return out
}

let updated = 0
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8")
  if (src.includes("force-dynamic") || src.includes("api-dynamic")) continue

  const lines = src.split("\n")
  let insertAt = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith("import ") || line.startsWith('import"')) {
      insertAt = i + 1
      continue
    }
    if (line === "" && insertAt > 0) continue
    break
  }

  lines.splice(insertAt, 0, MARKER, "")
  writeFileSync(file, lines.join("\n"))
  updated++
}

console.log(`Updated ${updated} route files`)
