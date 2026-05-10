import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('parse samples/clerigo-level5.xlsx', () => {
  it('extracts clerigo-level5 identity, combat, and abilities from the sample workbook', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)

    expect(character.identity.name.value).toMatch(/Pipkin/i)
    expect(character.identity.name.value).not.toMatch(/^https?:\/\//i)
    if (character.media?.avatarUrl?.value) expect(character.media.avatarUrl.value).toMatch(/^https?:\/\//i)
    expect(character.identity.classText.value).toMatch(/Cl.rigo 5|Clerigo 5/i)
    expect(character.identity.race.value).toMatch(/Folken/i)
    expect(character.identity.background.value).toMatch(/Espi/i)
    expect(character.attributes.ac.value).toBeGreaterThan(0)
    expect(character.attributes.hp.max.value).toBeGreaterThan(0)
    expect(character.abilities.wis.score.value).toBeGreaterThan(0)
    expect(character.abilities.str.score.value).not.toBeNull()
  })
})
