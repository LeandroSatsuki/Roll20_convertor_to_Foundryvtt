import { describe, expect, it } from 'vitest'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'

describe('debugTemplateSources', () => {
  it('records fixed-template source cells for abilities, speed and passive perception', async () => {
    const workbook = await readWorkbook(createBonfireV21Workbook(), 'debug-template-sources.xlsx')
    const result = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const finalFields = result.debug.finalExtractedFields

    expect(finalFields.some((field) => field.fieldPath === 'abilities.dex.score' && field.resolvedAddress === 'C20' && field.accepted)).toBe(true)
    expect(finalFields.some((field) => field.fieldPath === 'abilities.con.score' && field.resolvedAddress === 'C25' && field.accepted)).toBe(true)
    expect(finalFields.some((field) => field.fieldPath === 'abilities.int.score' && field.resolvedAddress === 'C30' && field.accepted)).toBe(true)
    expect(finalFields.some((field) => field.fieldPath === 'abilities.wis.score' && field.resolvedAddress === 'C35' && field.accepted)).toBe(true)
    expect(finalFields.some((field) => field.fieldPath === 'abilities.cha.score' && field.resolvedAddress === 'C40' && field.accepted)).toBe(true)
    expect(finalFields.some((field) => field.fieldPath === 'attributes.speed' && field.resolvedAddress === 'Z12' && field.accepted)).toBe(true)
    expect(finalFields.some((field) => field.fieldPath === 'attributes.passivePerception' && field.resolvedAddress === 'C45' && field.accepted)).toBe(true)
  })
})
