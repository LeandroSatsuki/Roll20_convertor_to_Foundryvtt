import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('bonfireFeaturePriority', () => {
  it('keeps Vinculo Natural on the Bonfire rule instead of hydrating Wild Companion from the library', async () => {
    const { bundle } = await buildBonfireBundle(
      {
        overrides: [
          { sheetName: 'LOG', address: 'T5', value: 'Druida 5' },
          { sheetName: 'LOG', address: 'R39', value: 'Vínculo Natural' },
        ],
      },
      undefined,
      { referenceLibrary: loadMegaLibraryFixture() },
    )

    const item = bundle.actor.items.find((candidate) => candidate.name === 'Vínculo Natural')
    const flags = item?.flags['roll20-to-foundry'] as Record<string, any> | undefined

    expect(item).toBeTruthy()
    expect(item?.name).toBe('Vínculo Natural')
    expect(flags?.featureResolution?.sourcePriority).toBe('bonfire-first')
    expect(flags?.featureResolution?.bonfireMatched).toBe(true)
    expect(flags?.featureResolution?.bonfireRuleId).toBe('druida-vinculo-natural')
    expect(flags?.featureResolution?.libraryCandidateRejectedBecauseBonfireMatched).toBe(true)
    expect(flags?.featureResolution?.librarySuggestionName).toBe('Wild Companion')
    expect(flags?.hydration?.hydrated).toBe(false)
    expect(flags?.hydration?.fallbackCategory).toBe('bonfireFallback')
    expect(String((item?.system.description as Record<string, unknown> | undefined)?.value ?? '')).toContain('natureza')
  })
})
