import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('bonfire class coverage', () => {
  it('tracks coverage by every canonical Bonfire class instead of by character', () => {
    const classIndex = readJson<Array<{ id: string; name: string; expectedCoverage: boolean }>>('data/bonfire/class-index.json')
    const classes = readJson<Array<Record<string, any>>>('data/bonfire/generated/classes.seed.json')
    const classFeatures = readJson<Array<Record<string, any>>>('data/bonfire/generated/class-features.seed.json')
    const coverage = readJson<{ policy: string; classes: Array<Record<string, any>>; summary: Record<string, number> }>('data/bonfire/review/coverage-report.json')

    expect(classIndex.map((entry) => entry.id)).toEqual([
      'artificer',
      'barbaro',
      'bardo',
      'cacador',
      'clerigo',
      'druida',
      'feiticeiro',
      'guerreiro',
      'ladino',
      'mago',
      'mistico',
      'monge',
      'paladino',
    ])
    expect(coverage.policy).toBe('coverage-by-class-not-character')
    expect(coverage.classes).toHaveLength(13)
    expect(coverage.summary.totalClasses).toBe(13)

    for (const canonical of classIndex) {
      const classSeed = classes.find((entry) => entry.id === canonical.id)
      const featureCount = classFeatures.filter((entry) => entry.className === canonical.name).length
      const coverageEntry = coverage.classes.find((entry) => entry.classId === canonical.id)

      expect(classSeed, canonical.name).toBeTruthy()
      expect(classSeed?.source).toBe('bonfire')
      expect(classSeed?.sourceUrl).toBeTruthy()
      expect(classSeed?.descriptionStatus).toMatch(/complete|needs-review|summary-only|missing/)
      expect(classSeed?.hitDie || classSeed?.hitDieStatus).toBeTruthy()
      expect(classSeed?.spellcasting?.type).toBeTruthy()
      expect(classSeed?.savingThrows?.length || classSeed?.savingThrowsStatus).toBeTruthy()
      expect(classSeed?.progression?.status).toBeTruthy()
      expect(featureCount, `${canonical.name} feature coverage`).toBeGreaterThan(0)
      expect(coverageEntry?.status).toMatch(/covered|needs-review/)
    }
  })

  it('keeps missing class fixtures as review coverage instead of blocking generation', () => {
    const missingFixtures = readJson<{ expectedDirectory: string; missingFixtures: Array<{ fileName: string }> }>('data/bonfire/review/missing-class-fixtures.json')

    expect(missingFixtures.expectedDirectory).toBe('tests/fixtures/characters/classes')
    expect(existsSync(path.join(repoRoot, missingFixtures.expectedDirectory))).toBe(true)
    expect(missingFixtures.missingFixtures.every((entry) => entry.fileName.endsWith('.bonfire.xlsx'))).toBe(true)
  })
})

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}
