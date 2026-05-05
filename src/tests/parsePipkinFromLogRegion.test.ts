import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'

describe('parsePipkinFromLogRegion', () => {
  it('parses Pipkin correctly from the selected LOG region and exports cleanly', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')

    const result = parseBonfireCharacterSheet(workbook, { selectedSheetName: 'LOG' })
    const actor = mapNormalizedToFoundryActor(result.character)
    const audit = buildExportAuditReport(actor, result.character)

    expect(result.debug.selectedSheetName).toBe('LOG')
    expect(result.debug.selectedRegion?.confidence).toMatch(/^(medium|high)$/)
    expect(result.debug.nameCandidates.length).toBeGreaterThan(0)
    expect(actor.name).toMatch(/Pipkin/i)
    expect(result.character.identity.classText.value).toContain('Cl')
    expect(result.character.identity.classText.value).toContain('5')
    expect(result.character.identity.race.value).toContain('Folken')
    expect(result.character.abilities.str.score.value).not.toBeNull()
    expect(result.character.abilities.wis.score.value).not.toBeNull()
    expect(result.character.attributes.ac.value).not.toBeNull()
    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
  })
})
