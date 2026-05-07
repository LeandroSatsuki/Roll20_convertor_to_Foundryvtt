import { describe, expect, it } from 'vitest'
import type { FoundryItem } from '../lib/foundry/foundryTypes'
import { buildFoundryReferenceLibrary } from '../lib/foundry-library/buildFoundryReferenceLibrary'
import { hydrateEquipmentItem } from '../lib/hydration/hydrateEquipmentItem'

describe('fallbackWhenNoLibraryMatch', () => {
  it('keeps the local builder item and records fallback metadata when no library item matches', () => {
    const library = buildFoundryReferenceLibrary([{ sourceFileName: 'empty.json', actorJson: { name: 'Empty Reference', items: [] } }])
    const fallback = item('Moon-Touched Teacup')
    const hydrated = hydrateEquipmentItem(fallback, library)
    const meta = (hydrated.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(hydrated.name).toBe('Moon-Touched Teacup')
    expect(meta.hydrated).toBe(false)
    expect(meta.reason).toBe('not-found')
    expect(meta.warnings).toContain('FOUNDRY_LIBRARY_ITEM_NOT_FOUND')
  })
})

function item(name: string): FoundryItem {
  return {
    _id: 'fallbackitem0001',
    name,
    type: 'equipment',
    img: 'icons/svg/item-bag.svg',
    system: { identifier: 'moon-touched-teacup', quantity: 1 },
    effects: [],
    folder: null,
    flags: { 'roll20-to-foundry': {} },
    _stats: {},
  }
}
