// Diffs skills/elaichi-api/references/endpoints.md against the live OpenAPI
// description at api.elaichi.ai.
//
// The endpoint list is the one page in this repo that goes stale on its own:
// it changes when Elaichi ships, not when anybody edits here. And the failure
// is quiet in both directions — documenting an internal route invites people
// to build on a URL that is not a contract, and omitting a published one
// hides a capability. So the published spec is the referee.
//
// Not in the pull-request job, because it depends on the network and on
// production being up; it runs on a schedule and on demand instead.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SPEC = 'https://api.elaichi.ai/schema/openapi.json'
const doc = join(import.meta.dirname, '..', 'skills', 'elaichi-api', 'references', 'endpoints.md')
const VERBS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']

/** Path params are spelled `{id}` in the spec and `:id` here; compare shapes. */
const shape = op => op.replace(/\{[^}]+\}/g, ':x').replace(/:[A-Za-z]+/g, ':x')

const response = await fetch(SPEC)
if (!response.ok) throw new Error(`${SPEC} answered ${response.status}`)
const spec = await response.json()

const published = new Set()
for (const [path, operations] of Object.entries(spec.paths ?? {})) {
  for (const method of Object.keys(operations)) {
    if (VERBS.includes(method.toUpperCase())) {
      published.add(shape(`${method.toUpperCase()} ${path}`))
    }
  }
}

const documented = new Set()
const text = readFileSync(doc, 'utf-8')
for (const line of text.split('\n')) {
  const match = line.match(/^(GET|POST|PATCH|PUT|DELETE)\s+(\/\S*)/)
  if (match) documented.add(shape(`${match[1]} ${match[2]}`))
}

const extra = [...documented].filter(op => !published.has(op)).sort()
const missing = [...published].filter(op => !documented.has(op)).sort()

console.log(`${published.size} published operations, ${documented.size} documented.`)
if (extra.length) {
  console.error('\nDocumented but NOT in the published spec (internal, or wrong):')
  for (const op of extra) console.error(`  ${op}`)
}
if (missing.length) {
  console.error('\nPublished but missing from endpoints.md:')
  for (const op of missing) console.error(`  ${op}`)
}
if (extra.length || missing.length) process.exit(1)
console.log('endpoints.md matches the published spec.')
