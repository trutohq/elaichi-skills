// Generates rules/elaichi.mdc from skills/elaichi-conventions/SKILL.md.
//
// The same base facts have to reach a Cursor session (which has an
// always-applied rule primitive) and a Claude Code session (which does not,
// so the same content ships as a model-invoked skill). Maintaining two copies
// by hand drifted within a day of writing them — the rule had 8 error codes
// where the skill had 10, and 14 id prefixes where the skill had 28. So there
// is one source and this derives the other; CI fails when the two disagree.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const source = join(root, 'skills', 'elaichi-conventions', 'SKILL.md')
const out = join(root, 'rules', 'elaichi.mdc')

const text = readFileSync(source, 'utf-8')
const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
if (!match) throw new Error(`No frontmatter in ${source}`)

const description = (match[1].match(/^description:\s*(.+)$/m)?.[1] ?? '').trim()
if (!description) throw new Error(`No description in ${source}`)

const body = match[2].replace(/^\s+/, '')

writeFileSync(
  out,
  `---
description: ${description}
globs:
alwaysApply: true
---

<!-- Generated from skills/elaichi-conventions/SKILL.md by scripts/generate-rule.mjs. Edit that file, not this one. -->

${body}`
)
console.log(`Wrote ${out}`)
