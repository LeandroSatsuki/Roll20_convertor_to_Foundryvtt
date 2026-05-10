import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('noFoundryLibraryForFeatures', () => {
  it('keeps class, race, background and feature descriptions on the Bonfire side', async () => {
    const library = loadMegaLibraryFixture()
    const { bundle } = await buildBonfireBundle(
      {
        overrides: [
          { sheetName: 'LOG', address: 'R31', value: 'Mente Genial' },
          { sheetName: 'LOG', address: 'T5', value: 'Druida 5' },
        ],
      },
      undefined,
      { referenceLibrary: library },
    )

    const protectedItems = bundle.actor.items.filter((item) => ['feat', 'background', 'class', 'subclass'].includes(item.type))
    expect(protectedItems.length).toBeGreaterThan(0)

    for (const item of protectedItems) {
      const flags = item.flags['roll20-to-foundry'] as Record<string, any> | undefined
      expect(flags?.hydration?.source, item.name).not.toBe('foundry-reference-library')
      if (item.type !== 'class') expect(flags?.foundryLibrarySuggestionOnly).toBeTruthy()
    }
  })
})
