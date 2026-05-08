import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('noAggressiveAliasHydration', () => {
  it('does not auto-hydrate protected Bonfire subclass-like features to official library names', async () => {
    const { bundle } = await buildBonfireBundle(
      {
        overrides: [
          { sheetName: 'LOG', address: 'T5', value: 'Druida 5' },
          { sheetName: 'LOG', address: 'R31', value: 'Ordem Primal: Xamã' },
          { sheetName: 'LOG', address: 'R32', value: 'Surto Selvagem: Elo Primal' },
        ],
      },
      undefined,
      { referenceLibrary: loadMegaLibraryFixture() },
    )

    const primal = bundle.actor.items.find((item) => item.name === 'Ordem Primal: Xamã')
    const resurgence = bundle.actor.items.find((item) => item.name === 'Surto Selvagem: Elo Primal')
    const primalFlags = primal?.flags['roll20-to-foundry'] as Record<string, any> | undefined
    const resurgenceFlags = resurgence?.flags['roll20-to-foundry'] as Record<string, any> | undefined

    expect(bundle.actor.items.some((item) => item.name === 'Primal Order')).toBe(false)
    expect(bundle.actor.items.some((item) => item.name === 'Wild Resurgence')).toBe(false)
    expect(primalFlags?.featureResolution?.librarySuggestionName).toBe('Primal Order')
    expect(resurgenceFlags?.featureResolution?.librarySuggestionName).toBe('Wild Resurgence')
    expect(primalFlags?.hydration?.fallbackCategory).toBe('bonfireFallback')
    expect(resurgenceFlags?.hydration?.fallbackCategory).toBe('bonfireFallback')
  })
})
