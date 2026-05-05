import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createBonfireV21Workbook } from './bonfireV21TestWorkbook'

describe('modifierOnlyBlocked', () => {
  it('blocks export when only the modifier exists and no score source is available', async () => {
    const workbook = await readWorkbook(
      createBonfireV21Workbook({
        overrides: [
          { sheetName: 'LOG', address: 'C15', value: '' },
          { sheetName: 'LOG', address: 'C20', value: '' },
          { sheetName: 'LOG', address: 'C25', value: '' },
          { sheetName: 'LOG', address: 'C30', value: '' },
          { sheetName: 'LOG', address: 'C35', value: '' },
          { sheetName: 'LOG', address: 'C40', value: '' },
          { sheetName: 'LOG', address: 'K17', value: '' },
          { sheetName: 'LOG', address: 'K18', value: '' },
          { sheetName: 'LOG', address: 'K19', value: '' },
          { sheetName: 'LOG', address: 'K20', value: '' },
          { sheetName: 'LOG', address: 'K21', value: '' },
          { sheetName: 'LOG', address: 'K22', value: '' },
        ],
      }),
      'modifier-only.xlsx',
    )

    const { character } = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const actor = mapNormalizedToFoundryActor(character)
    const audit = buildExportAuditReport(actor, character)

    expect(character.warnings.some((warning) => warning.code === 'ABILITY_SCORE_MISSING_MODIFIER_ONLY' && warning.fieldPath === 'abilities.str.score')).toBe(true)
    expect(audit.importReadiness.canExport).toBe(false)
  })
})
