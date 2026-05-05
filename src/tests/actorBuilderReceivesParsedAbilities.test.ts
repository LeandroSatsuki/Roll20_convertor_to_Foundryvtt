import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('actor builder receives parsed abilities', () => {
  it('passes parsed ability scores into actor flags and actor.system.abilities', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const result = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(result.character)
    const flags = actor.flags['roll20-to-foundry'] as Record<string, any>
    const abilities = actor.system.abilities as Record<string, { value: number }>

    expect(flags.abilitiesBeforeActorBuild.str).toBe(8)
    expect(flags.abilitiesBeforeActorBuild.dex).toBe(14)
    expect(flags.abilitiesBeforeActorBuild.con).toBe(12)
    expect(flags.abilitiesBeforeActorBuild.int).toBe(10)
    expect(flags.abilitiesBeforeActorBuild.wis).toBe(18)
    expect(flags.abilitiesBeforeActorBuild.cha).toBe(14)
    expect(abilities.str.value).toBe(8)
    expect(abilities.dex.value).toBe(14)
    expect(abilities.con.value).toBe(12)
    expect(abilities.int.value).toBe(10)
    expect(abilities.wis.value).toBe(18)
    expect(abilities.cha.value).toBe(14)
  })
})
