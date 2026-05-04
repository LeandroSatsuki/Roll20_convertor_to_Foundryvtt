import type { FeatureResolutionContext } from '../bonfireTypes'
import type { BonfireRuleEntity } from '../schema/bonfireEntityTypes'
import { normalizeRuleLookupKey } from '../store/bonfireAliases'
import { defaultBonfireRuleIndex, searchBonfireRuleIndex, type BonfireRuleIndex } from '../store/bonfireRuleIndex'
import { fuzzyIncludesMatch } from './fuzzyMatch'

export function findRuleCandidates(rawName: string, context: FeatureResolutionContext = {}, index: BonfireRuleIndex = defaultBonfireRuleIndex): BonfireRuleEntity[] {
  const direct = searchBonfireRuleIndex(rawName, { ...context, limit: 30 }, index)
  if (direct.length) return direct

  const query = normalizeRuleLookupKey(rawName)
  return index.entities
    .filter((entity) => {
      const values = [entity.identifier, entity.name, ...entity.aliases]
      return values.some((value) => fuzzyIncludesMatch(query, value))
    })
    .slice(0, 30)
}

