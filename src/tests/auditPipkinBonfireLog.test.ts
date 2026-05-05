import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('audit Pipkin bonfire log template', () => {
  it('exports without auxiliary leakage or identifier errors', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(character) as any
    const audit = buildExportAuditReport(actor, character)
    const itemNames = actor.items.map((item: { name: string }) => item.name)

    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
    for (const noise of ['Artífice', 'Associated Skills', 'bludgeoning', 'piercing', 'ANTECEDENTE:']) {
      expect(itemNames).not.toContain(noise)
    }
  })
})
