import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '..', '..')

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}

describe('remainingWarningsReportShape', () => {
  it('includes candidate sections, scores, reasons, and resolution status', () => {
    const report = readJson<{
      entries: Array<{
        candidateSections: Array<{ heading: string; score: number; reasons: string[] }>
        selectedCandidate: null | { heading: string; score: number; reasons: string[] }
        resolutionStatus: string
      }>
    }>('data/bonfire/review/remaining-description-warnings.json')

    const entry = report.entries[0]
    expect(entry).toBeTruthy()
    expect(Array.isArray(entry.candidateSections)).toBe(true)
    expect(entry.candidateSections.length).toBeGreaterThan(0)
    expect(typeof entry.candidateSections[0].heading).toBe('string')
    expect(typeof entry.candidateSections[0].score).toBe('number')
    expect(Array.isArray(entry.candidateSections[0].reasons)).toBe(true)
    expect(['resolved', 'still-ambiguous', 'missing-source']).toContain(entry.resolutionStatus)
  })
})
