import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('audit Pipkin after field fix', () => {
  it('exports an actor with the corrected bonfire log fields', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(character) as any
    const audit = buildExportAuditReport(actor, character)

    expect(actor.name).toContain('Pipkin')
    expect(actor.system.abilities.str.value).toBe(8)
    expect(actor.system.abilities.dex.value).toBe(14)
    expect(actor.system.abilities.con.value).toBe(12)
    expect(actor.system.abilities.int.value).toBe(10)
    expect(actor.system.abilities.wis.value).toBe(18)
    expect(actor.system.abilities.cha.value).toBe(14)
    expect(actor.system.attributes.ac.flat).toBe(18)
    expect(actor.system.attributes.hp.max).toBe(33)
    expect(actor.system.attributes.movement.walk).toBe(25)
    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
  })
})
