import type { AbilityKey, NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import { defaultBonfireRuleStore } from '../rules/bonfireRuleStore'
import { normalizeRuleLookupKey } from '../rules/store/bonfireAliases'
import { getClassSpellcastingRule } from './classSpellcastingRules'

export function inferSpellcastingAbility(character: NormalizedCharacter): AbilityKey | null {
  const firstClass = character.identity.classes[0]
  const storeRule = defaultBonfireRuleStore.classes.find((rule) => [rule.id, rule.name, ...rule.aliases].map(normalizeRuleLookupKey).includes(normalizeRuleLookupKey(firstClass?.name ?? '')))
  if (storeRule?.spellcasting?.ability) return storeRule.spellcasting.ability
  const fallbackRule = getClassSpellcastingRule(firstClass?.name)
  if (fallbackRule.classKey !== 'unknown') return fallbackRule.ability
  return firstClass ? null : character.spells.ability.value
}

export function hasSpellcastingAbilityUnknown(character: NormalizedCharacter): boolean {
  return hasAnySheetSpell(character) && inferSpellcastingAbility(character) === null
}

function hasAnySheetSpell(character: NormalizedCharacter): boolean {
  return character.spells.cantrips.length > 0 || Object.values(character.spells.levels).some((level) => level.spells.length > 0)
}
