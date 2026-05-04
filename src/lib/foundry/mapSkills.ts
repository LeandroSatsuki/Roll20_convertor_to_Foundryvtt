import type { NormalizedCharacter, SkillKey } from '../normalize/normalizedCharacterTypes'

export function mapSkills(character: NormalizedCharacter): Record<SkillKey, unknown> {
  const result = {} as Record<SkillKey, unknown>
  for (const key of Object.keys(character.skills) as SkillKey[]) {
    const skill = character.skills[key]
    result[key] = {
      value: skill.proficiencyLevel.value,
      ability: skill.ability,
      bonuses: {
        check: skill.bonus.value ? String(skill.bonus.value) : '',
        passive: '',
      },
      roll: { min: null, max: null, mode: 0 },
    }
  }
  return result
}
