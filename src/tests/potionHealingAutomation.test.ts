import { describe, expect, it } from 'vitest'
import { getItemAutomationMeta } from '../lib/foundry/items'
import { loadPipkinFoundry } from './pipkinFoundryFixture'

describe('Potion of Healing automation', () => {
  it('creates a healing consumable with 2d4+2 and one use', async () => {
    const { actor } = await loadPipkinFoundry()
    const item = actor.items.find((entry) => entry.name === 'Potion of Healing')
    const activity = Object.values((item?.system.activities as Record<string, any>) ?? {})[0]

    expect(item).toBeTruthy()
    expect(item?.type).toBe('consumable')
    expect(item?.system.uses).toMatchObject({ max: 1, spent: 0 })
    expect(activity?.type).toBe('heal')
    expect(activity?.healing?.formula).toBe('2d4+2')
    expect(getItemAutomationMeta(item!)?.level).toBe('full')
  })
})
