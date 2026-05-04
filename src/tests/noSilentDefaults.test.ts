import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { createWorkbookData } from './sheetTestWorkbook'

describe('no silent defaults', () => {
  it('does not fill abilities and skills with defaults when the template is not detected', async () => {
    const workbook = await readWorkbook(createWorkbookData([{ name: 'Imagem', rows: [['https://i.imgur.com/3hiMIAQ.jpeg'], ['sem ficha']] }]), 'not-a-sheet.xlsx')
    const { character, debug } = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(character)
    const audit = buildExportAuditReport(actor, character)

    expect(debug.confidence).toBe('low')
    expect(Object.values(character.abilities).every((ability) => ability.score.value === 10)).toBe(false)
    expect(Object.values(character.skills).every((skill) => skill.total.value === 0)).toBe(false)
    expect(character.warnings.some((warning) => warning.code === 'SHEET_TEMPLATE_LOW_CONFIDENCE')).toBe(true)
    expect(audit.importReadiness.canExport).toBe(false)
  })
})
