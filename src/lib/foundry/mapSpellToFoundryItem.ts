import type { NormalizedSpell } from '../character/normalizedCharacterTypes'
import type { FoundryItem } from './foundryTypes'
import { buildSpellItem } from './items'

export function mapSpellToFoundryItem(spell: NormalizedSpell): FoundryItem {
  return buildSpellItem(spell)
}
