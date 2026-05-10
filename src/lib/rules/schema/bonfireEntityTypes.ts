import type { ConversionWarning } from '../../normalize/normalizedCharacterTypes'

export type BonfireRuleKind =
  | 'class'
  | 'subclass'
  | 'race'
  | 'essence'
  | 'background'
  | 'feat'
  | 'originFeat'
  | 'racialFeat'
  | 'classFeature'
  | 'subclassFeature'
  | 'raceFeature'
  | 'backgroundFeature'
  | 'weapon'
  | 'armor'
  | 'equipment'
  | 'consumable'
  | 'spell'
  | 'spellOverride'
  | 'weaponMastery'
  | 'spellcasting'
  | 'resource'
  | 'unknown'

export type RuleConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type BonfireRuleEntity = {
  id: string
  identifier: string
  name: string
  aliases: string[]
  kind: BonfireRuleKind
  sourceUrl?: string
  sourceName?: string
  description?: string
  descriptionHtml?: string
  descriptionText?: string
  shortDescription?: string
  descriptionStatus?: 'complete' | 'summary-only' | 'needs-review' | 'missing'
  descriptionSource?: 'article-body' | 'section-body' | 'table-rule-body' | 'table-row' | 'inline-bold-subrule' | 'card-summary' | 'category-preview' | 'manual-review' | 'unknown' | 'fallback' | 'generated' | 'local-preview'
  needsReviewReasons?: string[]
  className?: string
  subclassName?: string
  raceName?: string
  backgroundName?: string
  parentRuleId?: string
  parentName?: string
  parentDisplayName?: string
  level?: number
  seedLocal?: boolean
  sourceFileName?: string
  foundry?: {
    itemType?: string
    activityType?: string
    activationType?: string
    damageFormula?: string
    damageType?: string
    healingFormula?: string
    saveAbility?: string
    target?: string
    range?: string
    duration?: string
    uses?: {
      max?: number | string
      spent?: number
      recovery?: 'sr' | 'lr' | 'day' | 'charges' | 'none' | 'unknown' | 'sr-lr'
    }
  }
  tags?: string[]
}

export type RuleResolutionCandidate = {
  entity: BonfireRuleEntity
  score: number
  confidence: RuleConfidence
  reasons: string[]
  conflicts: string[]
}

export type RuleResolutionResult = {
  rawName: string
  resolvedName: string
  identifier: string
  kind: BonfireRuleKind
  confidence: RuleConfidence
  score: number
  ruleId?: string
  sourceUrl?: string
  description?: string
  candidates: RuleResolutionCandidate[]
  manuallyResolved?: boolean
  warnings: ConversionWarning[]
}

