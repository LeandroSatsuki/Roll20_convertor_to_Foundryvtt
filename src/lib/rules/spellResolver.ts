import type { BonfireSpellOverrideRule } from './bonfireTypes'
import { defaultBonfireRuleStore } from './bonfireRuleStore'
import { normalizeRuleLookupKey } from './store/bonfireAliases'

export function resolveSpellOverride(name: string): BonfireSpellOverrideRule | undefined {
  const id = normalizeRuleLookupKey(name)
  return defaultBonfireRuleStore.spellOverrides.find((spell) =>
    [spell.id, spell.spellName, ...(spell.aliases ?? [])].map((value) => normalizeRuleLookupKey(value)).includes(id),
  )
}
