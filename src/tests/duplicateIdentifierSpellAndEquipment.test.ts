import { describe, expect, it } from 'vitest'
import { buildExportAuditReport } from '../lib/export/buildExportAuditReport'
import { ensureUniqueActorItemIdentifiers, isValidFoundryIdentifier } from '../lib/foundry/identifiers'
import { actorWithItems, item } from './foundryIdentifierFixture'

describe('duplicateIdentifierSpellAndEquipment', () => {
  it('dedupes Shield equipment and Shield spell identifiers without invalid identifiers', () => {
    const actor = actorWithItems([item('Shield', 'equipment', 'shield'), item('Shield', 'spell', 'shield')])

    ensureUniqueActorItemIdentifiers(actor)

    const identifiers = actor.items.map((entry) => String(entry.system.identifier))
    expect(new Set(identifiers).size).toBe(2)
    expect(identifiers).toEqual(expect.arrayContaining(['equipment-shield', 'spell-shield']))
    expect(identifiers.every(isValidFoundryIdentifier)).toBe(true)
    expect(buildExportAuditReport(actor).summary.duplicateIdentifierCount).toBe(0)
  })
})
