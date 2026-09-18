// Validates .cursor-plugin/plugin.json and .claude-plugin/plugin.json against
// their published manifest schemas.
//
// Nothing else in this repo's CI ever opens either file: validate-manifest.yml
// regenerates manifest/skills.json and rules/elaichi.mdc from the skills
// themselves and diffs them, but a manifest with invalid JSON, a malformed
// name, an undocumented author field, a version that is not semver, a
// logo/skills/rules path that does not exist on disk, or a wrong MCP server
// declaration would still merge clean. This is the check that would have
// caught those.
//
// The two manifests are DELIBERATELY asymmetric on `name` and `mcpServers`,
// and that asymmetry is a rule here, not an oversight to "fix" back into
// matching:
//
//   - Elaichi ships a SEPARATE, dedicated Cursor plugin repo,
//     trutohq/elaichi-cursor-plugin, which is the one submitted to and listed
//     on the Cursor marketplace and which owns the MCP server declaration for
//     Cursor users. Cursor plugin names must be unique across the
//     marketplace, and that repo's manifest keeps the name "elaichi" because
//     it is the one being listed.
//   - THIS repo's `.cursor-plugin/plugin.json` exists only so `npx skills`
//     and a Cursor "remote rule" install can pull in the skills and the
//     always-applied rule — it is not submitted to Cursor and must not carry
//     the name "elaichi" (that would collide with the dedicated plugin the
//     moment both were ever visible to Cursor's namespace together) or an
//     `mcpServers` declaration (a user who installs both would otherwise get
//     the same MCP server registered twice, from two different plugins).
//   - `.claude-plugin/plugin.json` has no such sibling — there is no separate
//     Claude repo — so it legitimately keeps the name "elaichi" and the real
//     `mcpServers` pointer.
//
// If you are changing this file, you are probably looking at a merge
// conflict between "the two manifests should match" and "the two manifests
// should NOT match here" — the asymmetry below is the correct state. See
// also: trutohq/elaichi-cursor-plugin, which has its own validator and its
// own copy of the endpoint URL and brand copy, checked by nothing in this
// repo's CI — if you change the MCP URL, the author contact, or the pitch
// here, go check that repo too.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

// The one MCP endpoint every organization and every person shares — see
// skills/elaichi-conventions/SKILL.md. The Claude manifest must bundle a
// server pointed at exactly this URL, so installing the plugin is the act of
// connecting. The Cursor manifest must NOT — see the header comment above.
const EXPECTED_MCP_URL = 'https://api.elaichi.ai/mcp'

// Cursor: https://cursor.com/docs/reference/plugins — "Author info: name
// (required), email (optional)". `url` is not a documented author field
// there (it belongs at the top level, as `homepage`).
//
// Claude Code: https://code.claude.com/docs/en/plugins-reference — author
// accepts `name`, `email` (optional) and `url` (optional).
const MANIFESTS = [
  {
    path: '.cursor-plugin/plugin.json',
    authorFields: ['name', 'email'],
    pathFields: ['logo', 'skills', 'rules'],
    mcp: 'forbidden',
  },
  {
    path: '.claude-plugin/plugin.json',
    authorFields: ['name', 'email', 'url'],
    pathFields: ['skills', 'commands', 'agents', 'workflows', 'outputStyles', 'lspServers'],
    mcp: 'required',
  },
]

// Cursor: "Lowercase, kebab-case (alphanumerics, hyphens, and periods). Must
// start and end with an alphanumeric character."
const NAME_RE = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/

const errors = []
// { label, name } per manifest with a syntactically valid name, so we can
// check the two manifests don't collide at the end.
const names = []

/**
 * Resolves a manifest's "mcpServers" field to a { name: { url, ... } } map.
 * The field is either an inline map (per-plugin.json manifest field, used
 * as-is) or a path to a file whose own top-level shape is
 * `{ "mcpServers": { ... } }` (the convention both Cursor's and Claude
 * Code's auto-discovered files use).
 */
function resolveMcpServers(manifest, label) {
  const value = manifest.mcpServers
  if (value === undefined) return { error: `missing "mcpServers" (expected a server at ${EXPECTED_MCP_URL})` }

  if (typeof value === 'string') {
    const resolved = join(root, value)
    if (!existsSync(resolved)) {
      return { error: `"mcpServers" points at "${value}", which does not exist (resolved ${resolved})` }
    }
    let parsed
    try {
      parsed = JSON.parse(readFileSync(resolved, 'utf-8'))
    } catch (err) {
      return { error: `"mcpServers" file "${value}" is invalid JSON (${err.message})` }
    }
    if (typeof parsed.mcpServers !== 'object' || parsed.mcpServers === null) {
      return { error: `"mcpServers" file "${value}" has no top-level "mcpServers" object` }
    }
    return { servers: parsed.mcpServers, source: value }
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return { servers: value, source: '(inline)' }
  }

  return { error: `"mcpServers" has an unsupported shape (expected a file path string or an inline object)` }
}

for (const { path, authorFields, pathFields, mcp } of MANIFESTS) {
  const full = join(root, path)
  const label = path
  const raw = readFileSync(full, 'utf-8')

  let manifest
  try {
    manifest = JSON.parse(raw)
  } catch (err) {
    errors.push(`${label}: invalid JSON (${err.message})`)
    continue
  }

  if (typeof manifest.name !== 'string' || !NAME_RE.test(manifest.name)) {
    errors.push(
      `${label}: "name" must be lowercase kebab-case (alphanumerics, hyphens, periods), got ${JSON.stringify(manifest.name)}`
    )
  } else {
    names.push({ label, name: manifest.name })
  }

  if (manifest.version !== undefined && !SEMVER_RE.test(manifest.version)) {
    errors.push(`${label}: "version" is not valid semver, got ${JSON.stringify(manifest.version)}`)
  }

  if (manifest.author !== undefined) {
    if (typeof manifest.author !== 'object' || manifest.author === null || Array.isArray(manifest.author)) {
      errors.push(`${label}: "author" must be an object`)
    } else {
      if (typeof manifest.author.name !== 'string' || manifest.author.name.length === 0) {
        errors.push(`${label}: "author.name" is required`)
      }
      const undocumented = Object.keys(manifest.author).filter(k => !authorFields.includes(k))
      if (undocumented.length > 0) {
        errors.push(
          `${label}: "author" has undocumented field(s) ${undocumented.join(', ')} (documented: ${authorFields.join(', ')})`
        )
      }
    }
  }

  for (const field of pathFields) {
    const value = manifest[field]
    if (value === undefined) continue
    const candidates = Array.isArray(value) ? value : [value]
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue
      // Path fields are relative to the plugin root, which for both
      // manifests in this repo is the repo root (the marketplace entry's
      // `source` is "./").
      const resolved = join(root, candidate)
      if (!existsSync(resolved)) {
        errors.push(`${label}: "${field}" points at "${candidate}", which does not exist (resolved ${resolved})`)
      }
    }
  }

  if (mcp === 'required') {
    const resolved = resolveMcpServers(manifest, label)
    if (resolved.error) {
      errors.push(`${label}: ${resolved.error}`)
    } else {
      const urls = Object.values(resolved.servers)
        .map(server => server && server.url)
        .filter(Boolean)
      if (!urls.includes(EXPECTED_MCP_URL)) {
        errors.push(
          `${label}: "mcpServers" (via ${resolved.source}) does not declare a server at ${EXPECTED_MCP_URL}; found ${JSON.stringify(urls)}`
        )
      }
    }
  } else if (mcp === 'forbidden' && manifest.mcpServers !== undefined) {
    // See the header comment: this manifest is not the one submitted to
    // Cursor, and the dedicated elaichi-cursor-plugin repo already owns the
    // MCP server declaration for Cursor users. A second one here would
    // double-register the same server.
    errors.push(
      `${label}: must not declare "mcpServers" — the Cursor MCP server is owned by trutohq/elaichi-cursor-plugin, not this repo (see the header comment in this script)`
    )
  }
}

if (names.length > 1) {
  const [first, ...rest] = names
  for (const other of rest) {
    if (other.name === first.name) {
      errors.push(
        `"name" collides: ${first.label} and ${other.label} both declare ${JSON.stringify(first.name)} — see the header comment in this script for why they must differ`
      )
    }
  }
}

if (errors.length > 0) {
  console.error(`Plugin manifest validation failed (${errors.length}):`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log(`Validated ${MANIFESTS.length} plugin manifests. All clean.`)
