import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('bonfire local HTML seed builder', () => {
  it('records local HTML input, generated seed counts, and parser health', () => {
    const summary = readJson<{
      sourceRoots: string[]
      htmlFilesFound: number
      htmlFilesProcessed: number
      parseErrorCount: number
      seedCounts: Record<string, number>
      classCoverage: { total: number; covered: number }
    }>('data/bonfire/review/generation-summary.json')

    expect(summary.sourceRoots.some((root) => root.includes('HTML BONFIRE'))).toBe(true)
    expect(summary.htmlFilesFound).toBeGreaterThanOrEqual(13)
    expect(summary.htmlFilesProcessed).toBeGreaterThanOrEqual(13)
    expect(summary.parseErrorCount).toBe(0)
    expect(summary.seedCounts.classes).toBe(13)
    expect(summary.seedCounts.classFeatures).toBeGreaterThan(13)
    expect(summary.seedCounts.feats).toBeGreaterThan(0)
    expect(summary.seedCounts.races).toBeGreaterThan(0)
    expect(summary.classCoverage.total).toBe(13)
    expect(summary.classCoverage.covered).toBe(13)
  })

  it('keeps Bonfire features as Bonfire seeds, not Foundry library replacements', () => {
    const classFeatures = readJson<Array<Record<string, any>>>('data/bonfire/generated/class-features.seed.json')
    const raceFeatures = readJson<Array<Record<string, any>>>('data/bonfire/generated/race-features.seed.json')
    const feats = readJson<Array<Record<string, any>>>('data/bonfire/generated/feats.seed.json')
    const allRules = [...classFeatures, ...raceFeatures, ...feats]

    for (const name of ['Vínculo Natural', 'Ordem Primal', 'Surto Selvagem', 'Ancestralidade Feérica']) {
      const match = allRules.find((entry) => entry.name === name)
      expect(match, name).toBeTruthy()
      expect(match?.source).toBe('bonfire')
      expect(match?.descriptionStatus).toMatch(/complete|fallback|needs-review/)
    }

    expect(allRules.some((entry) => entry.name === 'Wild Companion' && entry.source === 'bonfire')).toBe(false)
    expect(allRules.some((entry) => entry.name === 'Primal Order' && entry.source === 'bonfire')).toBe(false)
    expect(allRules.some((entry) => entry.name === 'Wild Resurgence' && entry.source === 'bonfire')).toBe(false)
  })
})

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}
