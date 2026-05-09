import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('genericFixtureNaming', () => {
  it('keeps generic fixture directories for class-based coverage', () => {
    const fixtureRoot = path.join(repoRoot, 'tests', 'fixtures')
    const actors = readdirSync(path.join(fixtureRoot, 'actors'))
    const reports = readdirSync(path.join(fixtureRoot, 'reports'))
    const classesDir = path.join(fixtureRoot, 'characters', 'classes')

    expect(actors).toContain('foundry-empty-character.dnd5e-5-2-4.json')
    expect(actors).toContain('foundry-library-spells.json')
    expect(actors).toContain('foundry-library-features.json')
    expect(reports).toContain('expected-audit-shape.json')
    expect(existsSync(classesDir)).toBe(true)
  })
})
