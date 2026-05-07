import { describe, expect, it } from 'vitest'
import type { FoundryItem } from '../lib/foundry/foundryTypes'
import { buildFoundryReferenceLibrary } from '../lib/foundry-library/buildFoundryReferenceLibrary'
import { hydrateEquipmentItem } from '../lib/hydration/hydrateEquipmentItem'
import { hydrateFeatItem } from '../lib/hydration/hydrateFeatItem'
import { hydrateSpellItem } from '../lib/hydration/hydrateSpellItem'

describe('hydrationFallbackCategory', () => {
  it('classifies custom fallback, library miss and unsafe rejected separately', () => {
    const emptyLibrary = buildFoundryReferenceLibrary([{ sourceFileName: 'empty.json', actorJson: { name: 'Empty', items: [] } }])
    const mediumLibrary = buildFoundryReferenceLibrary([
      {
        sourceFileName: 'medium.json',
        actorJson: {
          name: 'Medium Library',
          items: [
            {
              _id: 'shieldequip000001',
              name: 'Shield',
              type: 'equipment',
              img: 'icons/svg/item-bag.svg',
              system: { identifier: 'shield', description: { value: '<p>Shield equipment.</p>' }, activities: {} },
              effects: [{ _id: 'effect0000000001', name: 'Shield Effect' }],
              flags: {},
              _stats: {},
            },
          ],
        },
      },
    ])

    const moonElf = hydrateFeatItem(customItem('Elfo da Lua', 'feat', 'race'), emptyLibrary, {})
    const student = hydrateFeatItem(customItem('Estudante de Arqueomancia', 'background', 'background'), emptyLibrary, {})
    const scimiliar = hydrateEquipmentItem(baseItem('Scimiliar', 'weapon', 'scimiliar'), emptyLibrary)
    const unsafeSpell = hydrateSpellItem(
      {
        ...baseItem('Shield', 'spell', 'shield'),
        system: { identifier: 'shield', level: 2, description: { value: '<p>Shield fallback.</p>' } },
      },
      mediumLibrary,
      { characterClass: 'Clérigo', spellcastingAbility: 'wis' },
    )

    expect(hydrationMeta(moonElf)?.fallbackCategory).toBe('customFallback')
    expect(hydrationMeta(student)?.fallbackCategory).toBe('customFallback')
    expect(hydrationMeta(scimiliar)?.fallbackCategory).toBe('libraryMiss')
    expect(hydrationMeta(unsafeSpell)?.fallbackCategory).toBe('unsafeMatchRejected')
  })
})

function baseItem(name: string, type: string, identifier: string): FoundryItem {
  return {
    _id: `${identifier}-00000001`.slice(0, 16),
    name,
    type,
    img: 'icons/svg/item-bag.svg',
    system: { identifier, description: { value: `<p>${name}</p>` }, activities: {} },
    effects: [],
    folder: null,
    flags: { 'roll20-to-foundry': {} },
    _stats: {},
  }
}

function customItem(name: string, type: string, kind: string): FoundryItem {
  return {
    ...baseItem(name, type, name.toLowerCase().replace(/[^a-z]+/g, '-')),
    flags: {
      'roll20-to-foundry': {
        ruleResolution: {
          rawName: name,
          resolvedName: name,
          kind,
          confidence: 'high',
        },
      },
    },
  }
}

function hydrationMeta(item: FoundryItem): Record<string, unknown> | null {
  const flags = item.flags?.['roll20-to-foundry']
  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) return null
  const hydration = (flags as Record<string, unknown>).hydration
  return hydration && typeof hydration === 'object' && !Array.isArray(hydration) ? (hydration as Record<string, unknown>) : null
}
