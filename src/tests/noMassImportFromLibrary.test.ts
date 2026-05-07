import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildFoundryReferenceLibrary } from '../lib/foundry-library/buildFoundryReferenceLibrary'
import { buildConversionBundle } from '../lib/pipeline/buildConversionBundle'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import { readWorkbook } from '../lib/sheets/readWorkbook'

describe('noMassImportFromLibrary', () => {
  it('hydrates requested actor items without copying the whole reference library', async () => {
    const library = buildFoundryReferenceLibrary([
      {
        sourceFileName: 'huge-library.json',
        actorJson: {
          name: 'Huge Library Actor',
          items: Array.from({ length: 500 }, (_, index) => ({
            _id: `item${String(index).padStart(12, '0')}`,
            name: index === 0 ? 'Healing Word' : `Unused Library Item ${index}`,
            type: index === 0 ? 'spell' : 'feat',
            img: 'icons/svg/item-bag.svg',
            system: { identifier: index === 0 ? 'healing-word' : `unused-${index}`, level: index === 0 ? 1 : undefined, description: { value: '<p>Library item.</p>' }, activities: { use: { type: 'utility' } } },
            effects: [],
            flags: {},
            _stats: {},
          })),
        },
      },
    ])
    const workbook = await readWorkbook(new Uint8Array(readFileSync('samples/Pipkin.xlsx')), 'Pipkin.xlsx')
    const parsed = parseBonfireCharacterSheet(workbook, { selectedTemplateId: 'bonfire-v2.1' })
    parsed.character.spells.levels.spell1.spells.push({ name: { value: 'Healing Word', confidence: 'high' }, level: 1, raw: 'Healing Word', prepared: true })

    const bundle = buildConversionBundle(parsed.character, parsed.debug, { referenceLibrary: library })

    expect(library.entries.length).toBe(500)
    expect(bundle.actor.items.length).toBeLessThan(500)
    expect(bundle.actor.items.some((item) => item.name === 'Unused Library Item 42')).toBe(false)
    expect(bundle.audit.summary.hydratedItemsCount).toBeGreaterThan(0)
  })
})
