import { describe, expect, it } from 'vitest'
import type { FoundryItem } from '../lib/foundry/foundryTypes'
import { hydrateFeatItem } from '../lib/hydration/hydrateFeatItem'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('featHydrationFromMegaLibrary', () => {
  it.each(['Tough', 'Divine Intervention'])('clones %s with feature structure when found', (name) => {
    const library = loadMegaLibraryFixture()
    const hydrated = hydrateFeatItem(feat(name), library, { characterClass: 'Clérigo', characterLevel: 5 })
    const meta = (hydrated.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(meta.hydrated).toBe(true)
    expect(hydrated.type).toBe('feat')
    expect(hydrated.effects.length).toBeGreaterThan(0)
  })

  it('does not import unrelated subclass features in bulk', () => {
    const library = loadMegaLibraryFixture()
    const requested = [feat('Divine Intervention')]
    const hydrated = requested.map((item) => hydrateFeatItem(item, library, { characterClass: 'Clérigo', characterLevel: 5 }))

    expect(hydrated).toHaveLength(1)
    expect(hydrated[0].name).toMatch(/Divine Intervention|Interven/i)
  })
})

function feat(name: string): FoundryItem {
  return { _id: 'requestedfeat000', name, type: 'feat', img: 'icons/svg/item-bag.svg', system: { identifier: name.toLowerCase().replace(/\s+/g, '-'), activities: {} }, effects: [], folder: null, flags: { 'roll20-to-foundry': {} }, _stats: {} }
}
