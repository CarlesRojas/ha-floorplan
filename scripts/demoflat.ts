// Writes demoflat.yaml, the demo flat from scripts/demoflat.plan.ts as a
// complete card config. Run it with `pnpm demoflat` after changing the plan.
import { DEMO_FLAT } from './demoflat.plan.ts'
import { writeFileSync } from 'node:fs'

const bare = (s: string) => /^[A-Za-z][A-Za-z0-9_ .:&-]*$/.test(s)
const scalar = (v: unknown) => (typeof v === 'string' ? (bare(v) ? v : JSON.stringify(v)) : String(v))
const flat = (v: unknown) => Array.isArray(v) && v.every(x => typeof x === 'number')

function lines(value: unknown, indent: string): string[] {
  const out: string[] = []
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (flat(entry)) out.push(`${indent}- [${(entry as number[]).join(', ')}]`)
      else {
        const inner = lines(entry, indent + '  ')
        out.push(`${indent}- ${inner[0].trimStart()}`, ...inner.slice(1))
      }
    }
    return out
  }
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue
    if (flat(v)) out.push(`${indent}${key}: [${(v as number[]).join(', ')}]`)
    else if (typeof v === 'object' && v !== null) out.push(`${indent}${key}:`, ...lines(v, indent + '  '))
    else out.push(`${indent}${key}: ${scalar(v)}`)
  }
  return out
}

const { type, ...rest } = DEMO_FLAT
const yaml = [...lines({ type, grid_options: { columns: 'full' }, ...rest }, ''), '']
writeFileSync(new URL('../demoflat.yaml', import.meta.url), yaml.join('\n'))
