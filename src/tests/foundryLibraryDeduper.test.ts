import { describe, expect, it } from 'vitest'
import { buildFoundryReferenceLibrary } from '../lib/foundry-library/buildFoundryReferenceLibrary'
import { preferredEntry } from '../lib/foundry-library/foundryLibraryDeduper'

describe('foundryLibraryDeduper', () => {
  it('keeps duplicate candidates and marks the higher quality item as preferred', () => {
    const library = buildFoundryReferenceLibrary([
      {
        sourceFileName: 'dupes.json',
        actorJson: {
          name: 'Dupes',
          items: [
            { _id: 'aaaaaaaaaaaaaaaa', name: 'Healing Word', type: 'spell', system: { identifier: 'healing-word', description: { value: '' }, activities: {} }, effects: [], flags: {} },
            {
              _id: 'bbbbbbbbbbbbbbbb',
              name: 'Healing Word',
              type: 'spell',
              system: { identifier: 'healing-word', description: { value: '<p>Full</p>' }, activities: { cast: { _id: 'cccccccccccccccc', type: 'cast', name: 'Cast' } } },
              effects: [{ _id: 'dddddddddddddddd' }],
              flags: { plutonium: { source: 'PHB' } },
            },
          ],
        },
      },
    ])
    const candidates = library.byNormalizedName.get('healing-word') ?? []

    expect(candidates).toHaveLength(2)
    expect(preferredEntry(candidates)?.itemId).toBe('bbbbbbbbbbbbbbbb')
    expect(library.preferredByKey.get('healing-word')?.itemId).toBe('bbbbbbbbbbbbbbbb')
  })
})
