import { describe, expect, it } from 'vitest'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('buildFoundryReferenceLibrary', () => {
  it('loads Foundry Actor JSON files as item reference libraries', () => {
    const library = loadMegaLibraryFixture()

    expect(library.report.filesLoadedCount).toBeGreaterThan(0)
    expect(library.report.itemsLoadedCount).toBeGreaterThan(0)
    expect(library.report.spellsLoadedCount).toBeGreaterThan(0)
    expect(library.entries.every((entry) => ['spell', 'class', 'subclass', 'feat', 'weapon', 'equipment', 'consumable', 'loot', 'tool', 'background', 'race'].includes(entry.type))).toBe(true)
    expect(library.report.itemsWithActivitiesCount).toBeGreaterThan(0)
    expect(library.report.itemsWithEffectsCount).toBeGreaterThan(0)
    expect(library.report.itemsWithPlutoniumCount).toBeGreaterThan(0)
    expect(library.indexes.byNormalizedName.get('healing-word')?.length).toBeGreaterThan(0)
    expect(library.indexes.byIdentifier.get('healing-word')?.length).toBeGreaterThan(0)
    expect(library.indexes.byType.get('spell')?.length).toBeGreaterThan(0)
    expect(library.entries.some((entry) => entry.quality.hasUses || entry.quality.hasDamageOrHealing)).toBe(true)
  })
})
