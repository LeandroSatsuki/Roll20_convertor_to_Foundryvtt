import type { FeatureResolutionContext } from '../bonfireTypes'
import type { BonfireRuleEntity, BonfireRuleKind } from '../schema/bonfireEntityTypes'
import { defaultBonfireEntityRuleStore, type BonfireEntityRuleStore } from './bonfireRuleStore'
import { normalizeRuleLookupKey, ruleLookupKeys } from './bonfireAliases'

export type BonfireRuleIndex = {
  entities: BonfireRuleEntity[]
  byIdentifier: Map<string, BonfireRuleEntity[]>
  byName: Map<string, BonfireRuleEntity[]>
  byAlias: Map<string, BonfireRuleEntity[]>
  byKind: Map<BonfireRuleKind, BonfireRuleEntity[]>
}

export type RuleSearchOptions = FeatureResolutionContext & {
  kinds?: BonfireRuleKind[]
  limit?: number
}

export function buildBonfireRuleIndex(store: BonfireEntityRuleStore = defaultBonfireEntityRuleStore): BonfireRuleIndex {
  const byIdentifier = new Map<string, BonfireRuleEntity[]>()
  const byName = new Map<string, BonfireRuleEntity[]>()
  const byAlias = new Map<string, BonfireRuleEntity[]>()
  const byKind = new Map<BonfireRuleKind, BonfireRuleEntity[]>()

  for (const entity of store.entities) {
    push(byIdentifier, normalizeRuleLookupKey(entity.identifier || entity.id), entity)
    push(byName, normalizeRuleLookupKey(entity.name), entity)
    for (const alias of ruleLookupKeys(entity)) push(byAlias, alias, entity)
    push(byKind, entity.kind, entity)
  }

  return { entities: store.entities, byIdentifier, byName, byAlias, byKind }
}

export const defaultBonfireRuleIndex = buildBonfireRuleIndex()

export function searchBonfireRuleIndex(query: string, options: RuleSearchOptions = {}, index: BonfireRuleIndex = defaultBonfireRuleIndex): BonfireRuleEntity[] {
  const key = normalizeRuleLookupKey(query)
  const pool = new Map<string, BonfireRuleEntity>()
  const add = (entity: BonfireRuleEntity) => {
    if (options.kinds?.length && !options.kinds.includes(entity.kind)) return
    pool.set(entity.id, entity)
  }

  for (const entity of index.byIdentifier.get(key) ?? []) add(entity)
  for (const entity of index.byName.get(key) ?? []) add(entity)
  for (const entity of index.byAlias.get(key) ?? []) add(entity)

  if (!pool.size) {
    for (const entity of index.entities) {
      if (options.kinds?.length && !options.kinds.includes(entity.kind)) continue
      const keys = [entity.identifier, entity.name, ...entity.aliases].map(normalizeRuleLookupKey)
      if (keys.some((candidate) => candidate.includes(key) || key.includes(candidate))) add(entity)
    }
  }

  return Array.from(pool.values()).slice(0, options.limit ?? 20)
}

function push<K>(map: Map<K, BonfireRuleEntity[]>, key: K, entity: BonfireRuleEntity): void {
  const list = map.get(key) ?? []
  list.push(entity)
  map.set(key, list)
}

