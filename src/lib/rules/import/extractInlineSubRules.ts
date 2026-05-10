// @ts-ignore Shared builder script lives outside src; this wrapper keeps app/tests typed.
import { extractInlineSubRules as extractInlineSubRulesImpl, inferSubRuleKindFromParentKind as inferSubRuleKindFromParentKindImpl } from '../../../../scripts/bonfire/extractInlineSubRules.mjs'

export type InlineSubRuleKind =
  | 'raceFeature'
  | 'classFeature'
  | 'subclassFeature'
  | 'backgroundFeature'
  | 'feat'
  | 'customBonfireFeature'

export type InlineSubRuleSeed = {
  id: string
  name: string
  aliases: string[]
  kind: InlineSubRuleKind
  source: 'bonfire'
  sourceUrl: string | null
  parentRuleId?: string
  parentName?: string
  parentDisplayName?: string
  raceName?: string
  className?: string
  subclassName?: string
  backgroundName?: string
  descriptionText: string
  descriptionHtml: string
  descriptionStatus: 'complete'
  descriptionSource: 'inline-bold-subrule'
  tags: string[]
}

export type InlineSubRuleReviewEntry = {
  name: string
  parentName: string | null
  kind: InlineSubRuleKind
  sourceUrl: string | null
  descriptionStatus: 'complete' | 'needs-review'
  reason: string | null
}

export function extractInlineSubRules(args: {
  htmlNode: unknown
  parentRule?: Record<string, unknown>
  parentKind?: string
  sourceUrl?: string
}): {
  subRules: InlineSubRuleSeed[]
  review: InlineSubRuleReviewEntry[]
} {
  return extractInlineSubRulesImpl(args)
}

export function inferSubRuleKindFromParentKind(parentKind?: string): InlineSubRuleKind {
  return inferSubRuleKindFromParentKindImpl(parentKind)
}
