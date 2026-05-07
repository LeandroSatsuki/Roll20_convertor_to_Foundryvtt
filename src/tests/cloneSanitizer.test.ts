import { describe, expect, it } from 'vitest'
import { buildFoundryReferenceLibrary } from '../lib/foundry-library/buildFoundryReferenceLibrary'
import { cloneFoundryLibraryItem } from '../lib/foundry-library/cloneFoundryLibraryItem'
import { matchFoundryLibraryItem } from '../lib/foundry-library/foundryLibraryMatcher'

describe('cloneSanitizer', () => {
  it('creates a new clean item without old ownership, folder, undefined, or actor origins', () => {
    const library = buildFoundryReferenceLibrary([
      {
        sourceFileName: 'old.json',
        actorJson: {
          name: 'Old Actor',
          items: [
            {
              _id: 'olditem000000001',
              name: 'Healing Word',
              type: 'spell',
              img: 'icons/svg/book.svg',
              system: {
                identifier: 'healing-word',
                description: { value: '<p>@UUID[Actor.oldActor.Item.olditem000000001]</p>', chat: undefined },
                activities: { cast: { _id: 'act000000000001', name: 'Cast', type: 'cast', spellcasting: { ability: 'wis' } } },
                advancementOrigin: 'Actor.oldActor.Item.olditem000000001',
              },
              effects: [{ _id: 'effect000000001', origin: 'Actor.oldActor.Item.olditem000000001' }],
              flags: { dnd5e: { sourceId: 'Actor.oldActor.Item.olditem000000001' }, plutonium: { source: 'PHB' } },
              folder: 'oldFolder',
              ownership: { default: 3 },
              sort: 1000,
            },
          ],
        },
      },
    ])
    const match = matchFoundryLibraryItem(library, { requestedName: 'Healing Word', requestedType: 'spell', spellLevel: undefined })
    const cloned = cloneFoundryLibraryItem(match, 'Healing Word', 'spell')
    const json = JSON.stringify(cloned)
    const meta = (cloned.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(cloned._id).not.toBe('olditem000000001')
    expect('folder' in cloned).toBe(false)
    expect('ownership' in cloned).toBe(false)
    expect('sort' in cloned).toBe(false)
    expect(json).not.toContain('undefined')
    expect(json).not.toContain('Actor.oldActor')
    expect(meta.sanitizedActorReferences).toBeGreaterThan(0)
  })
})
