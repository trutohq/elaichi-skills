// Fails when a relative Markdown link points at a file that does not exist,
// or at a `#heading` that file does not have.
//
// Cheap insurance: a skill's References table is the only way an agent finds
// the deeper pages, so a dead link there silently removes content rather than
// erroring, and a dead anchor lands the reader at the top of a long page
// instead of the paragraph the sentence promised.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'

const root = join(import.meta.dirname, '..')
const skip = new Set(['.git', 'node_modules'])
const files = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry)) continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path)
    else if (/\.mdc?$/.test(entry)) files.push(path)
  }
}
walk(root)

/** GitHub's heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

const anchorCache = new Map()
function anchorsOf(path) {
  if (!anchorCache.has(path)) {
    const found = new Set()
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const heading = line.match(/^#{1,6}\s+(.*)$/)
      if (heading) found.add(slug(heading[1].replace(/[`*_]/g, '')))
    }
    anchorCache.set(path, found)
  }
  return anchorCache.get(path)
}

const broken = []
for (const file of files) {
  const text = readFileSync(file, 'utf-8')
  for (const match of text.matchAll(/\]\((\.{1,2}\/[^)\s]+)\)/g)) {
    const [target, anchor] = match[1].split('#')
    const path = resolve(dirname(file), target)
    const where = file.slice(root.length + 1)
    try {
      statSync(path)
    } catch {
      broken.push(`${where} → ${match[1]} (no such file)`)
      continue
    }
    if (anchor && !anchorsOf(path).has(anchor)) {
      broken.push(`${where} → ${match[1]} (no such heading)`)
    }
  }
}

if (broken.length > 0) {
  console.error(`Broken relative links (${broken.length}):`)
  for (const line of broken) console.error(`  ${line}`)
  process.exit(1)
}
console.log(`Checked ${files.length} files. All relative links and anchors resolve.`)
