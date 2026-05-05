import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'

describe('parsePipkinBonfireV21Movement', () => {
  it('accepts movement and passive perception from fixed template cells', async () => {
    const workbook = await readWorkbook(createBonfireV21Workbook(), 'pipkin-movement.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })

    expect(character.attributes.speed.value).toBe(25)
    expect(character.attributes.speedUnits).toBe('ft')
    expect(character.attributes.passivePerception.value).toBe(14)
  })
})
