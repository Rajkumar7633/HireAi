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
  let inMultilineImport = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!inMultilineImport && trimmed.startsWith("import ")) {
      if (trimmed.includes("{") && !trimmed.includes("}")) {
        inMultilineImport = true
        insertAt = i + 1
        continue
      }
      insertAt = i + 1
      continue
    }
    if (inMultilineImport) {
      if (trimmed.includes("} from ")) inMultilineImport = false
      insertAt = i + 1
      continue
    }
    if (trimmed === "" && insertAt > 0) continue
    break
  }

  lines.splice(insertAt, 0, MARKER, "")
  writeFileSync(file, lines.join("\n"))
  updated++
}

console.log(`Updated ${updated} route files`)
