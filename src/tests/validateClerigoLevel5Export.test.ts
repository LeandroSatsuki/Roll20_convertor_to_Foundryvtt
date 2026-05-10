import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('validateclerigo-level5Export', () => {
  it('generates an import-ready Foundry actor from samples/clerigo-level5.xlsx', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const { character } = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(character)
    const report = buildExportAuditReport(actor, character)

    expect(report.importReadiness.canExport).toBe(true)
    expect(report.summary.invalidIdentifierCount).toBe(0)
    expect(report.summary.errorCount).toBe(0)
    expect(actor.name).toContain('Pipkin')
    expect((actor.system.attributes as any).spellcasting).toBe('wis')
    expect((actor.system.spells as any).spell1.value).toBe(4)
    expect((actor.system.spells as any).spell2.value).toBe(3)
    expect((actor.system.spells as any).spell3.value).toBe(2)
    expect(actor.items.some((item) => item.name === 'Canalizar Divindade')).toBe(true)
    expect(actor.items.some((item) => item.name === 'Conjuração')).toBe(true)
    expect(actor.items.some((item) => item.name === 'Shortbow')).toBe(true)
    expect(actor.items.some((item) => item.name === 'Shield')).toBe(true)
  })
})
