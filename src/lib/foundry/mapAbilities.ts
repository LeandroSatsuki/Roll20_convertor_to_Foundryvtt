import type { AbilityKey, NormalizedCharacter } from '../normalize/normalizedCharacterTypes'

export function mapAbilities(character: NormalizedCharacter): Record<AbilityKey, unknown> {
  const result = {} as Record<AbilityKey, unknown>
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]) {
    result[key] = {
      value: typeof character.abilities[key].score.value === 'number' ? character.abilities[key].score.value : 10,
      proficient: character.saves[key].proficient.value ? 1 : 0,
      max: null,
      bonuses: {
        check: '',
        save: character.saves[key].bonus.value ? String(character.saves[key].bonus.value) : '',
      },
      check: { roll: { min: null, max: null, mode: 0 } },
      save: { roll: { min: null, max: null, mode: 0 } },
    }
  }
  return result
}
