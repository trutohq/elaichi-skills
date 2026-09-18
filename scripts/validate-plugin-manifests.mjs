// Validates .cursor-plugin/plugin.json and .claude-plugin/plugin.json against
// their published manifest schemas.
//
// Nothing else in this repo's CI ever opens either file: validate-manifest.yml
// regenerates manifest/skills.json and rules/elaichi.mdc from the skills
// themselves and diffs them, but a manifest with invalid JSON, a malformed
// name, an undocumented author field, a version that is not semver, a
// logo/skills/rules path that does not exist on disk, or a missing/wrong/
// disagreeing MCP server declaration would still merge clean. This is the
// check that would have caught those.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

// The one MCP endpoint every organization and every person shares — see
// skills/elaichi-conventions/SKILL.md. Both plugin manifests must bundle a
// server pointed at exactly this URL, so installing the plugin is the act of
// connecting.
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
    requireMcp: true,
  },
  {
    path: '.claude-plugin/plugin.json',
    authorFields: ['name', 'email', 'url'],
    pathFields: ['skills', 'commands', 'agents', 'workflows', 'outputStyles', 'lspServers'],
    requireMcp: true,
  },
]

// Cursor: "Lowercase, kebab-case (alphanumerics, hyphens, and periods). Must
// start and end with an alphanumeric character."
const NAME_RE = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/

const errors = []
// { label, urls: Set<string> } per manifest that declares mcpServers, so we
// can check every manifest agrees on the same server set at the end.
const mcpDeclarations = []

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

for (const { path, authorFields, pathFields, requireMcp } of MANIFESTS) {
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

  if (requireMcp) {
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
      } else {
        mcpDeclarations.push({ label, urls: new Set(urls) })
      }
    }
  }
}

if (mcpDeclarations.length > 1) {
  const [first, ...rest] = mcpDeclarations
  const firstKey = [...first.urls].sort().join(',')
  for (const other of rest) {
    const otherKey = [...other.urls].sort().join(',')
    if (otherKey !== firstKey) {
      errors.push(
        `MCP server declarations disagree: ${first.label} declares {${firstKey}}, ${other.label} declares {${otherKey}}`
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
