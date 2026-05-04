import { field } from '../normalize/confidence'
import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'

export function parseSpells(text: string): NormalizedCharacter['spells'] {
  const hasNoSpellcasting = /spellcasting class\s*:?\s*(nenhum|none)|classe de conjura/i.test(text) || /spell save dc\s*:?\s*0/i.test(text)
  const levels: NormalizedCharacter['spells']['levels'] = {}
  for (let level = 1; level <= 9; level += 1) {
    levels[`spell${level}`] = {
      slotsMax: field(0, hasNoSpellcasting ? 'high' : 'medium'),
      slotsUsed: field(0, hasNoSpellcasting ? 'high' : 'medium'),
      spells: [],
    }
  }

  return {
    spellcastingClass: field(null, hasNoSpellcasting ? 'high' : 'medium'),
    ability: field(null, hasNoSpellcasting ? 'high' : 'medium'),
    saveDc: field(0, hasNoSpellcasting ? 'high' : 'medium'),
    attackBonus: field(0, hasNoSpellcasting ? 'high' : 'medium'),
    cantrips: [],
    levels,
  }
}
