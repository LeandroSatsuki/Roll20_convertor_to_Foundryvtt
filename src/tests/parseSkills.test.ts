import { describe, expect, it } from 'vitest'
import { parseAbilities } from '../lib/parser/parseAbilities'
import { parseSkills } from '../lib/parser/parseSkills'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

describe('parseSkills', () => {
  it('infers expertise and proficiency levels', () => {
    const { abilities } = parseAbilities(sampleHeyzelText)
    const { skills } = parseSkills(sampleHeyzelText, abilities, 3)
    expect(skills.ath.proficiencyLevel.value).toBe(2)
    expect(skills.prc.proficiencyLevel.value).toBe(1)
    expect(skills.med.proficiencyLevel.value).toBe(0)
  })
})
