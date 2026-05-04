import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseRoll20Character } from '../lib/parser/parseRoll20Character'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'
import { resolveCharacterRules } from '../lib/rules/resolution/featureResolutionPipeline'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('featureResolutionPipeline', () => {
  it('resolves Pipkin sheet features with richer Bonfire seeds', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const result = resolveCharacterRules(character)
    const byName = new Map(result.resolutions.map((resolution) => [resolution.rawName, resolution]))

    expect(byName.get('Conjuração')?.confidence).toBe('high')
    expect(byName.get('Canalizar Divindade')?.confidence).toBe('high')
    expect(byName.get('Clérigo do Caos')?.confidence).toBe('high')
    expect(byName.get('Agilidade dos Pequeninos')?.kind).toBe('raceFeature')
    expect(byName.get('Marca Anômala')?.kind).toBe('feat')
    expect(result.unresolvedRules.length).toBeLessThan(character.features.length)
  })

  it('resolves Heyzel PDF features with fighter and Goruun seeds', () => {
    const character = parseRoll20Character(sampleHeyzelText, { fileName: 'sample.pdf' })
    const result = resolveCharacterRules(character)
    const byName = new Map(result.resolutions.map((resolution) => [resolution.rawName, resolution]))

    expect(byName.get('Retomar Fôlego')?.confidence).toBe('high')
    expect(byName.get('Surto de Ação')?.confidence).toBe('high')
    expect(byName.get('Superstição Tribal')?.confidence).toBe('high')
    expect(byName.get('Legado Implacável')?.confidence).toBe('high')
    expect(byName.get('Robusto')?.kind).toBe('feat')
    expect(byName.get('Mestre da Ambidestria')?.kind).toBe('feat')
    expect(byName.get('Resiliente (Sabedoria)')?.kind).toBe('feat')
  })
})

