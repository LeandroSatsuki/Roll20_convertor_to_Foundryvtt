import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'

export function mapSpells(character: NormalizedCharacter): Record<string, unknown> {
  const spells: Record<string, unknown> = {}
  for (let level = 1; level <= 9; level += 1) {
    const normalized = character.spells.levels[`spell${level}`]
    spells[`spell${level}`] = {
      value: normalized?.slotsMax.value ?? 0,
      override: null,
      bonuses: { save: '', attack: '' },
    }
  }
  return spells
}
