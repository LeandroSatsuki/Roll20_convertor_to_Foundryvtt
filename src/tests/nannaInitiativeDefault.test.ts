import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

const nannaPath = 'C:/Users/rhdig/Downloads/Nanna Amastacia.xlsx'
const runIfNannaExists = existsSync(nannaPath) ? it : it.skip

describe('nannaInitiativeDefault', () => {
  runIfNannaExists('defaults initiative to dexterity without residual bonus', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync(nannaPath)), 'Nanna Amastacia.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const bundle = buildConversionBundle(parsed.character, parsed.debug)
    const attributes = bundle.actor.system.attributes as Record<string, Record<string, unknown>>
    const initiativeDebug = bundle.debug?.finalExtractedFields.find((field) => field.fieldPath === 'attributes.initiative')

    expect(attributes.init.ability).toBe('dex')
    expect(attributes.init.bonus).toBe('')
    expect(initiativeDebug?.source).toBe('default-dex')
    expect(initiativeDebug?.accepted).toBe(true)
    expect(bundle.audit.validations.some((validation) => validation.code === 'INITIATIVE_DEFAULTED_TO_DEX')).toBe(true)
    expect(bundle.audit.summary.errorCount).toBe(0)
  })
})
