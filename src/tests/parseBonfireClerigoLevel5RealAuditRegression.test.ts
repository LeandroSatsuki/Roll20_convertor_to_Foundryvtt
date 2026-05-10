import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('clerigo-level5 real audit regression', () => {
  it('exports the real sample without parser-driven Foundry errors or table noise items', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(character) as any
    const audit = buildExportAuditReport(actor, character)
    const itemNames = actor.items.map((item: { name: string }) => item.name)

    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    expect(actor.name).toMatch(/Pipkin/i)
    expect(actor.name).not.toBe('Unnamed Roll20 Character')
    expect(actor.name).not.toMatch(/^https?:\/\//i)
    expect(actor.system.abilities.str.value).toBe(8)
    expect(actor.system.abilities.int.value).toBe(10)
    expect(actor.system.abilities.wis.value).toBe(18)
    expect(actor.system.attributes.ac.flat).toBe(18)
    expect(actor.system.attributes.hp.max).toBe(33)
    for (const noise of ['Nível 1', 'Nível 4', 'CUSTO', 'PESO', '50. gp', 'ITEM', '#']) {
      expect(itemNames).not.toContain(noise)
    }
    expect(audit.summary.genericItemCount).toBeLessThan(14)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
  })
})
