import { describe, expect, it } from 'vitest'
import { loadClerigoLevel5Foundry } from './clerigoLevel5FoundryFixture'

describe('pipeline automation clerigo-level5', () => {
  it('carries item automation through to the final audit and actor JSON', async () => {
    const { actor, audit } = await loadClerigoLevel5Foundry()
    const shortbow = actor.items.find((item) => item.name === 'Shortbow')
    const potion = actor.items.find((item) => item.name === 'Potion of Healing')
    const channelDivinity = actor.items.find((item) => item.name === 'Canalizar Divindade')

    expect(audit.summary.itemCount).toBeGreaterThan(3)
    expect(audit.summary.weaponCount).toBeGreaterThanOrEqual(1)
    expect(audit.summary.equipmentCount).toBeGreaterThanOrEqual(1)
    expect(audit.summary.automatedFullCount).toBeGreaterThan(0)
    expect(audit.summary.activitiesCount).toBeGreaterThan(0)

    expect((channelDivinity?.system.uses as any)?.max).toBe(2)
    expect(Object.values((shortbow?.system.activities as Record<string, any>) ?? {})[0]?.type).toBe('attack')
    if (potion) expect(Object.values((potion.system.activities as Record<string, any>) ?? {})[0]?.healing?.formula).toBe('2d4+2')
  })
})
