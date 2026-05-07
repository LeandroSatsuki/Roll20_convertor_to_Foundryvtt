import { describe, expect, it } from 'vitest'
import { loadPipkinFoundry } from './pipkinFoundryFixture'

const expectedTotals = {
  acr: 2,
  ani: 4,
  arc: 4,
  ath: -1,
  dec: 5,
  his: 0,
  ins: 7,
  itm: 2,
  inv: 0,
  med: 4,
  nat: 0,
  prc: 4,
  prf: 2,
  per: 5,
  rel: 0,
  slt: 5,
  ste: 2,
  sur: 7,
} as const

describe('pipkinFoundrySkillTotals', () => {
  it('matches the skill totals from the Pipkin sheet in the final actor', async () => {
    const { actor, audit } = await loadPipkinFoundry()
    const skills = (actor.system as any).skills
    const abilities = (actor.system as any).abilities
    const proficiencyBonus = 3

    const totalFor = (key: keyof typeof expectedTotals) => {
      const skill = skills[key]
      const abilityScore = abilities[skill.ability].value
      const abilityMod = Math.floor((abilityScore - 10) / 2)
      const residual = skill.bonuses.check ? Number(skill.bonuses.check) : 0
      return abilityMod + proficiencyBonus * Number(skill.value ?? 0) + residual
    }

    for (const [key, total] of Object.entries(expectedTotals)) {
      expect(totalFor(key as keyof typeof expectedTotals)).toBe(total)
    }

    expect(audit.validations.some((entry) => entry.code === 'SKILL_TOTAL_MISMATCH')).toBe(false)
    expect(audit.importReadiness.canExport).toBe(true)
  })
})
