import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'

describe('parseBonfireV21SkillProficiencyMarkers', () => {
  it('uses H as proficiency marker and I as final total without inferring proficiency from totals', async () => {
    const workbook = await readWorkbook(
      createBonfireV21Workbook({
        overrides: [
          { sheetName: 'LOG', address: 'H14', value: '+2' },
          { sheetName: 'LOG', address: 'T11', value: '+2' },
          { sheetName: 'LOG', address: 'H25', value: '0.5' },
          { sheetName: 'LOG', address: 'I25', value: '+3' },
          { sheetName: 'LOG', address: 'H26', value: '1' },
          { sheetName: 'LOG', address: 'I26', value: '+6' },
          { sheetName: 'LOG', address: 'H27', value: '0' },
          { sheetName: 'LOG', address: 'I27', value: '+4' },
          { sheetName: 'LOG', address: 'H28', value: '0' },
          { sheetName: 'LOG', address: 'I28', value: '-1' },
        ],
      }),
      'bonfire-v21-skill-markers.xlsx',
    )

    const { character } = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })

    expect(character.proficiencyBonus.value).toBe(2)
    expect(character.skills.acr.proficiencyLevel.value).toBe(0.5)
    expect(character.skills.acr.total.value).toBe(3)
    expect(character.skills.acr.bonus.value).toBe(0)

    expect(character.skills.ani.proficiencyLevel.value).toBe(1)
    expect(character.skills.ani.total.value).toBe(6)
    expect(character.skills.ani.bonus.value).toBe(0)

    expect(character.skills.arc.proficiencyLevel.value).toBe(0)
    expect(character.skills.arc.total.value).toBe(4)
    expect(character.skills.arc.bonus.value).toBe(4)

    expect(character.skills.ath.proficiencyLevel.value).toBe(0)
    expect(character.skills.ath.total.value).toBe(-1)
    expect(character.skills.ath.bonus.value).toBe(0)
  })
})
