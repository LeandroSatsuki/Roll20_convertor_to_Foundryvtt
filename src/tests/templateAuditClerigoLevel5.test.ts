import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('templateAuditclerigo-level5', () => {
  it('exports clerigo-level5 successfully with the fixed Bonfire template', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    const actor = mapNormalizedToFoundryActor(character)
    const audit = buildExportAuditReport(actor, character)

    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.actorName).toMatch(/Pipkin/i)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
    expect(character.identity.name.value).not.toBe('')
    expect(character.abilities.str.score.value).toBe(8)
    expect(character.attributes.ac.value).toBe(18)
  })
})
