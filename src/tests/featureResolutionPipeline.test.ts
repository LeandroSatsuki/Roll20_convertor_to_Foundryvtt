import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseRoll20Character } from '../lib/parser/parseRoll20Character'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'
import { resolveCharacterRules } from '../lib/rules/resolution/featureResolutionPipeline'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('featureResolutionPipeline', () => {
  it('resolves clerigo-level5 template-derived features with Bonfire seeds', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const result = resolveCharacterRules(character)
    const byName = new Map(result.resolutions.map((resolution) => [normalizeKey(resolution.rawName), resolution]))

    expect(byName.get(normalizeKey('Conjuracao'))?.confidence).toBe('high')
    expect(byName.get(normalizeKey('Canalizar Divindade'))?.confidence).toBe('high')
    expect(byName.get(normalizeKey('Agilidade dos Pequeninos'))?.kind).toBe('raceFeature')
    expect(byName.get(normalizeKey('Dedos Leves'))?.kind).toBe('raceFeature')
    expect(result.unresolvedRules.length).toBe(0)
  })

  it('resolves Heyzel PDF features with fighter and Goruun seeds', () => {
    const character = parseRoll20Character(sampleHeyzelText, { fileName: 'sample.pdf' })
    const result = resolveCharacterRules(character)
    const byName = new Map(result.resolutions.map((resolution) => [normalizeKey(resolution.rawName), resolution]))

    expect(byName.get(normalizeKey('Retomar Folego'))?.confidence).toBe('high')
    expect(byName.get(normalizeKey('Surto de Acao'))?.confidence).toBe('high')
    expect(byName.get(normalizeKey('Supersticao Tribal'))?.confidence).toBe('high')
    expect(['high', 'medium']).toContain(byName.get(normalizeKey('Legado Implacavel'))?.confidence)
    expect(byName.get(normalizeKey('Robusto'))?.kind).toBe('feat')
    expect(byName.get(normalizeKey('Mestre da Ambidestria'))?.kind).toBe('feat')
    expect(byName.get(normalizeKey('Resiliente (Sabedoria)'))?.kind).toBe('feat')
  })
})

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
