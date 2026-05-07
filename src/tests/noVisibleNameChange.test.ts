import { describe, expect, it } from 'vitest'
import { ensureUniqueActorItemIdentifiers } from '../lib/foundry/identifiers'
import { actorWithItems, item } from './foundryIdentifierFixture'

describe('noVisibleNameChange', () => {
  it('keeps visible item names while changing only colliding identifiers', () => {
    const actor = actorWithItems([item('Shield', 'equipment', 'shield'), item('Shield', 'spell', 'shield')])

    ensureUniqueActorItemIdentifiers(actor)

    expect(actor.items.map((entry) => entry.name)).toEqual(['Shield', 'Shield'])
    expect(actor.items.map((entry) => entry.system.identifier)).toEqual(['equipment-shield', 'spell-shield'])
  })
})
