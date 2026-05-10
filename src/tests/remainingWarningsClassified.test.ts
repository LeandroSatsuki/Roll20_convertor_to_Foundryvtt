import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '..', '..')

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}

describe('remainingWarningsClassified', () => {
  it('generates a triage report with classification and nextAction for every remaining warning', () => {
    const report = readJson<{
      summary: Record<string, number>
      entries: Array<{ name: string; warningCode: string; classification: string; nextAction: string }>
    }>('data/bonfire/review/remaining-description-warnings.json')

    expect(Array.isArray(report.entries)).toBe(true)
    expect(report.entries.length).toBeGreaterThan(0)
    expect(report.summary.totalWarnings).toBe(report.entries.length)

    for (const entry of report.entries) {
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.warningCode.startsWith('BONFIRE_DESCRIPTION_')).toBe(true)
      expect(['structural-site-noise', 'missing-full-rule-source', 'ambiguous-section', 'exact-text-required', 'valid-placeholder']).toContain(entry.classification)
      expect(['ignore-noise', 'provide-html', 'review-manually', 'keep-placeholder']).toContain(entry.nextAction)
    }
  })
})
