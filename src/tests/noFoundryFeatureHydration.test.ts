import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('noFoundryFeatureHydration', () => {
  it('keeps Bonfire features on the Bonfire side even when the Foundry library has similar mechanics', async () => {
    const library = loadMegaLibraryFixture()
    const { bundle } = await buildBonfireBundle(
      {
        overrides: [
          { sheetName: 'LOG', address: 'T5', value: 'Druida 5' },
          { sheetName: 'LOG', address: 'R31', value: 'Vínculo Natural' },
          { sheetName: 'LOG', address: 'R45', value: 'Ancestralidade Feérica' },
          { sheetName: 'LOG', address: 'Z31', value: 'Líder Inspirador' },
        ],
      },
      undefined,
      { referenceLibrary: library },
    )

    for (const name of ['Vínculo Natural', 'Ancestralidade Feérica', 'Líder Inspirador']) {
      const item = bundle.actor.items.find((entry) => entry.name === name)
      const flags = item?.flags['roll20-to-foundry'] as Record<string, any> | undefined

      expect(item, name).toBeTruthy()
      expect(flags?.hydration?.hydrated).toBe(false)
      expect(flags?.foundryLibrarySuggestionOnly).toBe(true)
      expect(flags?.hydration?.source).not.toBe('foundry-reference-library')
      expect(String((item?.system.description as Record<string, unknown> | undefined)?.value ?? '')).not.toContain('Wild Companion')
      expect(String((item?.system.description as Record<string, unknown> | undefined)?.value ?? '')).not.toContain('Fey Ancestry')
      expect(String((item?.system.description as Record<string, unknown> | undefined)?.value ?? '')).not.toContain('Inspiring Leader')
    }
  })
})
