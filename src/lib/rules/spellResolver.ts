import { toFoundryIdentifier } from '../foundry/identifiers'
import type { BonfireSpellOverrideRule } from './bonfireTypes'
import { defaultBonfireRuleStore } from './bonfireRuleStore'

export function resolveSpellOverride(name: string): BonfireSpellOverrideRule | undefined {
  const id = toFoundryIdentifier(name)
  return defaultBonfireRuleStore.spellOverrides.find((spell) => toFoundryIdentifier(spell.spellName) === id || spell.id === id)
}
