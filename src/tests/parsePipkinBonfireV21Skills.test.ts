import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { validateFoundryActorDeep } from '../lib/foundry/validateFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('parsePipkinBonfireV21Skills', () => {
  it('keeps all 18 skills in the normalized character and in the actor', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const actor = mapNormalizedToFoundryActor(character) as any
    const validations = validateFoundryActorDeep(actor)
    const skillKeys = ['acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'itm', 'inv', 'med', 'nat', 'prc', 'prf', 'per', 'rel', 'slt', 'ste', 'sur']

    expect(Object.keys(character.skills).sort()).toEqual(skillKeys.sort())
    expect(Object.keys(actor.system.skills).sort()).toEqual(skillKeys.sort())
    expect(validations.some((entry) => entry.code === 'FOUNDRY_SKILL_MISSING')).toBe(false)
    expect(character.skills.prc.total.value).toBe(4)
    expect(character.skills.sur.total.value).toBe(7)
    expect(character.skills.ins.total.value).toBe(7)
    expect(character.skills.per.total.value).toBe(5)
  })
})
