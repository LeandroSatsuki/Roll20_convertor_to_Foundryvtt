import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('clerigo-level5WithMegaLibrary', () => {
  it('hydrates only requested clerigo-level5 items and keeps the actor exportable', async () => {
    const library = loadMegaLibraryFixture()
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    if (!parsed.character.spells.cantrips.length && !Object.values(parsed.character.spells.levels).some((level) => level.spells.length)) {
      parsed.character.spells.levels.spell1.spells.push({ name: { value: 'Healing Word', confidence: 'high' }, level: 1, raw: 'Healing Word', prepared: true })
      parsed.character.spells.levels.spell1.spells.push({ name: { value: 'Silvery Barbs', confidence: 'high' }, level: 1, raw: 'Silvery Barbs', prepared: true })
    }
    const bundle = buildConversionBundle(parsed.character, parsed.debug, { referenceLibrary: library })
    const hydrationReport = (bundle.actor.flags['roll20-to-foundry'] as Record<string, unknown>).hydrationReport as any
    const itemNames = bundle.actor.items.map((item) => item.name)

    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.summary.errorCount).toBe(0)
    expect(bundle.audit.summary.invalidIdentifierCount).toBe(0)
    expect(bundle.audit.summary.invalidActivitiesCount).toBe(0)
    expect(bundle.audit.summary.hydratedSpellsCount).toBeGreaterThan(0)
    expect(hydrationReport.requestedItemsCount).toBe(bundle.actor.items.length)
    expect(bundle.actor.items.length).toBeLessThan(library.entries.length)
    expect(itemNames.some((name) => /Silvery Barbs/i.test(name))).toBe(true)
    const silvery = bundle.actor.items.find((item) => /Silvery Barbs/i.test(item.name))
    expect(String((silvery?.system.description as Record<string, unknown> | undefined)?.value ?? '')).toMatch(/Ajuste Bonfire|Silvery Barbs/i)
  })
})
