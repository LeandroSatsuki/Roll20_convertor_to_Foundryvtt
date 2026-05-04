import type { FeatureResolutionContext } from '../bonfireTypes'
import type { BonfireRuleEntity } from '../schema/bonfireEntityTypes'
import { searchBonfireRuleIndex } from './bonfireRuleIndex'

export function searchBonfireRules(query: string, context: FeatureResolutionContext = {}): BonfireRuleEntity[] {
  return searchBonfireRuleIndex(query, context)
}
