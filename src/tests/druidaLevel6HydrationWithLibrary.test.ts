import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

const nannaPath = 'C:/Users/rhdig/Downloads/Nanna Amastacia.xlsx'
const runIfNannaExists = existsSync(nannaPath) ? it : it.skip

describe('druidaLevel6HydrationWithLibrary', () => {
  runIfNannaExists('hydrates requested Nanna items from the Foundry reference library without breaking export', async () => {
    const library = loadMegaLibraryFixture()
    const workbook = await readWorkbook(new Uint8Array(readFileSync(nannaPath)), 'Nanna Amastacia.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    parsed.character.spells.levels.spell1.spells.push({ name: { value: 'Shield', confidence: 'high', raw: 'Shield' }, level: 1, raw: 'Shield', prepared: true })
    parsed.character.spells.levels.spell2.spells.push({ name: { value: 'Barksin', confidence: 'high', raw: 'Barksin' }, level: 2, raw: 'Barksin', prepared: true })
    parsed.character.equipment = [...(parsed.character.equipment ?? []), { name: { value: 'Potion of Healing', confidence: 'high', raw: 'Potion of Healing' }, quantity: { value: 1, confidence: 'high' }, category: 'consumable', raw: 'Potion of Healing' }]

    const bundle = buildConversionBundle(parsed.character, parsed.debug, { referenceLibrary: library })
    const shieldSpell = bundle.actor.items.find((item) => item.type === 'spell' && item.name === 'Shield')
    const potion = bundle.actor.items.find((item) => item.name === 'Potion of Healing')

    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.summary.errorCount).toBe(0)
    expect(bundle.audit.summary.invalidIdentifierCount).toBe(0)
    expect(bundle.audit.summary.duplicateIdentifierCount).toBe(0)
    expect(bundle.audit.summary.invalidActivitiesCount).toBe(0)
    expect(bundle.audit.summary.hydratedSpellsCount).toBeGreaterThan(0)
    expect((shieldSpell?.flags['roll20-to-foundry'] as Record<string, any> | undefined)?.hydration?.hydrated).toBe(true)
    expect((potion?.flags['roll20-to-foundry'] as Record<string, any> | undefined)?.hydration?.hydrated).toBe(true)
  })
})
