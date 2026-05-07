import type { AbilityKey } from '../normalize/normalizedCharacterTypes'
import { normalizeFoundryLibraryName } from '../foundry-library/foundryLibraryAliases'

export type SpellcastingType = 'full' | 'half' | 'third' | 'pact' | 'none'

export type ClassSpellcastingRule = {
  classKey: string
  displayName: string
  type: SpellcastingType
  ability: AbilityKey | null
  hitDie: 'd6' | 'd8' | 'd10' | 'd12'
}

const rules: ClassSpellcastingRule[] = [
  { classKey: 'clerigo', displayName: 'Clerigo', type: 'full', ability: 'wis', hitDie: 'd8' },
  { classKey: 'cleric', displayName: 'Cleric', type: 'full', ability: 'wis', hitDie: 'd8' },
  { classKey: 'druida', displayName: 'Druida', type: 'full', ability: 'wis', hitDie: 'd8' },
  { classKey: 'druid', displayName: 'Druid', type: 'full', ability: 'wis', hitDie: 'd8' },
  { classKey: 'mago', displayName: 'Mago', type: 'full', ability: 'int', hitDie: 'd6' },
  { classKey: 'wizard', displayName: 'Wizard', type: 'full', ability: 'int', hitDie: 'd6' },
  { classKey: 'bardo', displayName: 'Bardo', type: 'full', ability: 'cha', hitDie: 'd8' },
  { classKey: 'bard', displayName: 'Bard', type: 'full', ability: 'cha', hitDie: 'd8' },
  { classKey: 'feiticeiro', displayName: 'Feiticeiro', type: 'full', ability: 'cha', hitDie: 'd6' },
  { classKey: 'sorcerer', displayName: 'Sorcerer', type: 'full', ability: 'cha', hitDie: 'd6' },
  { classKey: 'bruxo', displayName: 'Bruxo', type: 'pact', ability: 'cha', hitDie: 'd8' },
  { classKey: 'warlock', displayName: 'Warlock', type: 'pact', ability: 'cha', hitDie: 'd8' },
  { classKey: 'paladino', displayName: 'Paladino', type: 'half', ability: 'cha', hitDie: 'd10' },
  { classKey: 'paladin', displayName: 'Paladin', type: 'half', ability: 'cha', hitDie: 'd10' },
  { classKey: 'patrulheiro', displayName: 'Patrulheiro', type: 'half', ability: 'wis', hitDie: 'd10' },
  { classKey: 'ranger', displayName: 'Ranger', type: 'half', ability: 'wis', hitDie: 'd10' },
  { classKey: 'artifice', displayName: 'Artifice', type: 'half', ability: 'int', hitDie: 'd8' },
  { classKey: 'artificer', displayName: 'Artificer', type: 'half', ability: 'int', hitDie: 'd8' },
  { classKey: 'guerreiro', displayName: 'Guerreiro', type: 'none', ability: null, hitDie: 'd10' },
  { classKey: 'fighter', displayName: 'Fighter', type: 'none', ability: null, hitDie: 'd10' },
  { classKey: 'ladino', displayName: 'Ladino', type: 'none', ability: null, hitDie: 'd8' },
  { classKey: 'rogue', displayName: 'Rogue', type: 'none', ability: null, hitDie: 'd8' },
]

export function getClassSpellcastingRule(className: string | null | undefined): ClassSpellcastingRule {
  const key = normalizeFoundryLibraryName(className ?? '')
  return rules.find((rule) => rule.classKey === key) ?? { classKey: 'unknown', displayName: className || 'Unknown', type: 'none', ability: null, hitDie: 'd8' }
}

export function toDnd5eClassKey(className: string | null | undefined): string {
  const rule = getClassSpellcastingRule(className)
  switch (rule.classKey) {
    case 'clerigo':
      return 'cleric'
    case 'druida':
      return 'druid'
    case 'mago':
      return 'wizard'
    case 'bardo':
      return 'bard'
    case 'feiticeiro':
      return 'sorcerer'
    case 'bruxo':
      return 'warlock'
    case 'paladino':
      return 'paladin'
    case 'patrulheiro':
      return 'ranger'
    case 'artifice':
      return 'artificer'
    case 'guerreiro':
      return 'fighter'
    case 'ladino':
      return 'rogue'
    default:
      return rule.classKey
  }
}
