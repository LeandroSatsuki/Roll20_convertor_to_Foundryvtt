import { describe, expect, it } from 'vitest'
import { loadPipkinFoundry } from './pipkinFoundryFixture'

describe('noArtificialSkillResiduals', () => {
  it('does not invent negative residuals or expertise for Pipkin skills', async () => {
    const { actor } = await loadPipkinFoundry()
    const skills = (actor.system as any).skills

    expect(skills.ath.bonuses.check).not.toBe('-3')
    expect(skills.his.bonuses.check).not.toBe('-2')
    expect(skills.inv.bonuses.check).not.toBe('-2')
    expect(skills.nat.bonuses.check).not.toBe('-2')
    expect(skills.rel.bonuses.check).not.toBe('-2')
    expect(skills.ins.value).not.toBe(2)
    expect(skills.sur.value).not.toBe(2)
  })
})
