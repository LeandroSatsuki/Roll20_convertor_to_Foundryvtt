import { describe, expect, it } from 'vitest'
import { getItemAutomationMeta } from '../lib/foundry/items'
import { loadClerigoLevel5Foundry } from './clerigoLevel5FoundryFixture'

describe('Shortbow automation', () => {
  it('maps Shortbow as a weapon with safe attack automation', async () => {
    const { actor } = await loadClerigoLevel5Foundry()
    const item = actor.items.find((entry) => entry.name === 'Shortbow')
    const activity = Object.values((item?.system.activities as Record<string, any>) ?? {})[0]

    expect(item).toBeTruthy()
    expect(item?.type).toBe('weapon')
    expect((item?.system.damage as any)?.base?.custom?.formula).toBe('1d6')
    expect((item?.system.damage as any)?.base?.types).toEqual(['piercing'])
    expect(activity?.type).toBe('attack')
    expect(activity?.damage?.parts?.[0]).toEqual({ formula: '1d6', type: 'piercing' })
    expect(getItemAutomationMeta(item!)?.level).toBe('full')
  })
})
