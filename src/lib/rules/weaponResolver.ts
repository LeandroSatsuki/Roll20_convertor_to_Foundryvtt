import { toFoundryIdentifier } from '../foundry/identifiers'
import type { BonfireWeaponRule } from './bonfireTypes'
import { defaultBonfireRuleStore, ruleAliases } from './bonfireRuleStore'

export function resolveWeaponOrEquipment(name: string): BonfireWeaponRule | undefined {
  const id = toFoundryIdentifier(name)
  return defaultBonfireRuleStore.weapons.find((weapon) => ruleAliases(weapon).includes(id))
}
