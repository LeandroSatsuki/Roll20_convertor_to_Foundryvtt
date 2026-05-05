import { makeUniqueFoundryIdentifier } from '../foundry/identifiers'
import type { BonfireBackgroundRule, BonfireClassRule, BonfireFeatRule, BonfireRaceRule, BonfireSpellOverrideRule, BonfireSubclassRule, BonfireWeaponRule } from './bonfireTypes'
import { bonfireBackgroundSeeds, bonfireClassSeeds, bonfireFeatSeeds, bonfireRaceSeeds, bonfireSpellOverrideSeeds, bonfireSubclassSeeds, bonfireWeaponSeeds } from './bonfireSeedRules'
import { normalizeRuleLookupKey } from './store/bonfireAliases'

export type BonfireRuleStore = {
  classes: BonfireClassRule[]
  subclasses: BonfireSubclassRule[]
  races: BonfireRaceRule[]
  backgrounds: BonfireBackgroundRule[]
  feats: BonfireFeatRule[]
  weapons: BonfireWeaponRule[]
  spellOverrides: BonfireSpellOverrideRule[]
}

export const defaultBonfireRuleStore: BonfireRuleStore = {
  classes: bonfireClassSeeds,
  subclasses: bonfireSubclassSeeds,
  races: bonfireRaceSeeds,
  backgrounds: bonfireBackgroundSeeds,
  feats: bonfireFeatSeeds,
  weapons: bonfireWeaponSeeds,
  spellOverrides: bonfireSpellOverrideSeeds,
}

export function ruleAliases(rule: { id: string; name: string; aliases?: string[] }): string[] {
  return [rule.id, rule.name, ...(rule.aliases ?? [])].map((alias) => normalizeRuleLookupKey(alias))
}

export function uniqueRuleIdentifier(input: unknown, used: Set<string>, fallback = 'item'): string {
  return makeUniqueFoundryIdentifier(input, used, fallback)
}
