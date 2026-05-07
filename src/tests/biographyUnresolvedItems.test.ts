import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('biographyUnresolvedItems', () => {
  it('surfaces unresolved player-visible items in the biography without blocking export', async () => {
    const { bundle } = await buildBonfireBundle({}, (character) => {
      character.equipment = [
        ...(character.equipment ?? []),
        {
          name: { value: 'Espada +1', confidence: 'high', raw: 'Espada +1' },
          quantity: { value: 1, confidence: 'high' },
          category: 'equipment',
          raw: 'Espada +1',
        },
      ]
    })

    const biography = String(((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value ?? '')
    const unresolvedItem = bundle.actor.items.find((item) => item.name === 'Espada +1')

    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(biography).toContain('Itens para revisar/adicionar manualmente')
    expect(biography).toContain('Espada +1')
    expect(unresolvedItem?.type).not.toBe('weapon')
  })
})
