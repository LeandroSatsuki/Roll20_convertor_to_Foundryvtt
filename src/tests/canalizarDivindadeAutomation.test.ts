import { describe, expect, it } from 'vitest'
import { getItemAutomationMeta } from '../lib/foundry/items'
import { loadClerigoLevel5Foundry } from './clerigoLevel5FoundryFixture'

describe('Canalizar Divindade automation', () => {
  it('configures uses max 2 and utility activity', async () => {
    const { actor } = await loadClerigoLevel5Foundry()
    const item = actor.items.find((entry) => entry.name === 'Canalizar Divindade')

    expect(item).toBeTruthy()
    expect(item?.type).toBe('feat')
    expect(item?.system.uses).toMatchObject({ max: 2, spent: 0 })
    expect(Object.values((item?.system.activities as Record<string, unknown>) ?? {})).toHaveLength(1)
    expect(Object.values((item?.system.activities as Record<string, any>) ?? {})[0]?.type).toBe('utility')
    expect(getItemAutomationMeta(item!)?.level).toBe('full')
  })
})
