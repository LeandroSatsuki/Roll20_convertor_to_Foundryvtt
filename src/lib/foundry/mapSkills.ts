import type { NormalizedCharacter, SkillKey } from '../normalize/normalizedCharacterTypes'
import { skillDefinitions } from '../parser/parseSkills'

export function mapSkills(character: NormalizedCharacter): Record<SkillKey, unknown> {
  const result = {} as Record<SkillKey, unknown>
  for (const key of Object.keys(skillDefinitions) as SkillKey[]) {
    const definition = skillDefinitions[key]
    const skill = character.skills[key]
    const residual = typeof skill?.bonus.value === 'number' && skill.bonus.value !== 0 ? String(skill.bonus.value) : ''
    result[key] = {
      value: skill?.proficiencyLevel.value ?? 0,
      ability: skill?.ability ?? definition.ability,
      bonuses: {
        check: residual,
        passive: residual,
      },
      roll: { min: null, max: null, mode: 0 },
    }
  }
  return result
}
