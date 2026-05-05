import type { NormalizedCharacter, SkillKey } from '../normalize/normalizedCharacterTypes'
import { skillDefinitions } from '../parser/parseSkills'

export function mapSkills(character: NormalizedCharacter): Record<SkillKey, unknown> {
  const result = {} as Record<SkillKey, unknown>
  for (const key of Object.keys(skillDefinitions) as SkillKey[]) {
    const definition = skillDefinitions[key]
    const skill = character.skills[key]
    result[key] = {
      value: skill?.proficiencyLevel.value ?? 0,
      ability: skill?.ability ?? definition.ability,
      bonuses: {
        check: skill?.bonus.value ? String(skill.bonus.value) : '',
        passive: '',
      },
      roll: { min: null, max: null, mode: 0 },
    }
  }
  return result
}
