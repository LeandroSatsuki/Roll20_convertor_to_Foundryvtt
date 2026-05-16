import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '..', '..')

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}

describe('missingSourceAcquisitionPlan', () => {
  it('generates a grouped acquisition plan ordered by priority and impact', () => {
    const report = readJson<{
      summary: {
        missingFullRuleSourceCount: number
        ambiguousSectionCount: number
        exactTextRequiredCount: number
        uniqueMissingUrlsCount: number
        uniqueParentPagesCount: number
      }
      byPriority: Array<{
        priority: 'high' | 'medium' | 'low'
        sourceUrl: string | null
        suggestedLocalPath: string
        affectedRulesCount: number
        affectedRules: Array<{ name: string; reason: string }>
      }>
    }>('data/bonfire/review/missing-source-acquisition-plan.json')

    expect(report.summary.missingFullRuleSourceCount).toBeGreaterThan(0)
    expect(report.summary.ambiguousSectionCount).toBeGreaterThanOrEqual(0)
    expect(report.summary.exactTextRequiredCount).toBeGreaterThanOrEqual(0)
    expect(report.summary.uniqueParentPagesCount).toBeGreaterThan(0)
    expect(Array.isArray(report.byPriority)).toBe(true)
    expect(report.byPriority.length).toBeGreaterThan(0)

    const rank = { high: 0, medium: 1, low: 2 }
    let previousRank = -1
    let previousCount = Number.POSITIVE_INFINITY

    for (const entry of report.byPriority) {
      expect(['high', 'medium', 'low']).toContain(entry.priority)
      expect(entry.sourceUrl || entry.suggestedLocalPath).toBeTruthy()
      expect(entry.affectedRulesCount).toBe(entry.affectedRules.length)
      expect(entry.affectedRulesCount).toBeGreaterThan(0)

      const currentRank = rank[entry.priority]
      expect(currentRank).toBeGreaterThanOrEqual(previousRank)
      if (currentRank === previousRank) expect(entry.affectedRulesCount).toBeLessThanOrEqual(previousCount)

      previousRank = currentRank
      previousCount = entry.affectedRulesCount
    }
  })
})
