import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '..', '..')

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}

describe('siteStructuralNoiseIgnored', () => {
  it('keeps structural site headings out of seeds and missing-rules reports', () => {
    const classFeatures = readJson<Array<{ name: string }>>('data/bonfire/generated/class-features.seed.json')
    const missingRules = readJson<{ missingRules: Array<{ className?: string; missing?: string[] }> }>('data/bonfire/review/missing-rules.json')
    const remainingWarnings = readJson<{ entries: Array<{ name: string; classification: string }> }>('data/bonfire/review/remaining-description-warnings.json')
    const forbidden = ['Find your way!', 'Get the news', 'LEGAL', 'Linha do Tempo de Cineria', 'Entry for WorldEmber 2025']

    for (const noise of forbidden) {
      expect(classFeatures.some((entry) => entry.name === noise)).toBe(false)
      expect(remainingWarnings.entries.some((entry) => entry.name === noise && entry.classification !== 'structural-site-noise')).toBe(false)
    }

    expect(JSON.stringify(missingRules)).not.toContain('Artigos relacionados')
    expect(JSON.stringify(missingRules)).not.toContain('Related Articles')
  })
})
