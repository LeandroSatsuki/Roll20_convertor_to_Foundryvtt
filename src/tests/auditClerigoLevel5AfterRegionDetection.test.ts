import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('clerigo-level5 audit after region detection', () => {
  it('exports an import-ready actor after region-scoped parsing', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(character) as any
    const audit = buildExportAuditReport(actor, character)

    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
    expect(actor.name).toMatch(/Pipkin/i)
  })
})
