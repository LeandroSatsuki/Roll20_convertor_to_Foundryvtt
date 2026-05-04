import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { detectBestCharacterSheet } from '../lib/sheets/detectSheetTemplate'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('Pipkin auxiliary-sheet regression', () => {
  it('does not select auxiliary/list data and does not export auxiliary values as items', async () => {
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const detection = detectBestCharacterSheet(workbook)
    const selected = detection.candidates.find((candidate) => candidate.sheetName === detection.sheetName)
    expect(selected?.negativeAnchors.map((anchor) => anchor.label)).not.toEqual(expect.arrayContaining(['Associated Skills', 'bludgeoning', 'piercing']))

    const { character } = parseBonfireCharacterSheet(workbook)
    const actor = mapNormalizedToFoundryActor(character) as any
    const audit = buildExportAuditReport(actor, character)
    const itemNames = actor.items.map((item: { name: string }) => item.name)

    expect(actor.name).toMatch(/Pipkin/i)
    expect(audit.importReadiness.canExport).toBe(true)
    expect(audit.summary.errorCount).toBe(0)
    for (const noise of ['Artífice', '◅ Associated Skills', 'bludgeoning', 'piercing']) {
      expect(itemNames).not.toContain(noise)
    }
  })
})
