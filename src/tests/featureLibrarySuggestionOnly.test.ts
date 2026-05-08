import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('featureLibrarySuggestionOnly', () => {
  it('records the library candidate only as a suggestion when Bonfire wins', async () => {
    const { bundle } = await buildBonfireBundle(
      {
        overrides: [
          { sheetName: 'LOG', address: 'T5', value: 'Druida 5' },
          { sheetName: 'LOG', address: 'R31', value: 'Vínculo Natural' },
        ],
      },
      undefined,
      { referenceLibrary: loadMegaLibraryFixture() },
    )

    const item = bundle.actor.items.find((candidate) => candidate.name === 'Vínculo Natural')
    const flags = item?.flags['roll20-to-foundry'] as Record<string, any> | undefined

    expect(flags?.featureResolution?.bonfireMatched).toBe(true)
    expect(flags?.featureResolution?.librarySuggestionName).toBe('Wild Companion')
    expect(flags?.featureResolution?.libraryCandidateRejectedBecauseBonfireMatched).toBe(true)
    expect(item?.name).toBe('Vínculo Natural')
    expect(String((item?.system.description as Record<string, unknown> | undefined)?.value ?? '')).not.toContain('Wild Companion')
  })
})
