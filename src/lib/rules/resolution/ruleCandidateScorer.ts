import type { FeatureResolutionContext } from '../bonfireTypes'
import { toFoundryIdentifier } from '../../foundry/identifiers'
import type { BonfireRuleEntity, BonfireRuleKind, RuleConfidence, RuleResolutionCandidate } from '../schema/bonfireEntityTypes'
import { normalizeRuleLookupKey } from '../store/bonfireAliases'
import { fuzzyIncludesMatch } from './fuzzyMatch'

const sectionKindHints: Record<string, BonfireRuleKind[]> = {
  race: ['raceFeature', 'race', 'racialFeat', 'resource'],
  class: ['classFeature', 'spellcasting', 'resource', 'class'],
  subclass: ['subclassFeature', 'subclass'],
  background: ['backgroundFeature', 'background'],
  feat: ['feat', 'originFeat', 'racialFeat'],
  maneuver: ['classFeature', 'feat', 'weaponMastery'],
  'weapon-mastery': ['weaponMastery', 'classFeature'],
  action: ['resource', 'classFeature', 'feat'],
  equipment: ['weapon', 'armor', 'equipment', 'consumable'],
}

export function scoreRuleCandidate(rawName: string, entity: BonfireRuleEntity, context: FeatureResolutionContext = {}): RuleResolutionCandidate {
  const query = normalizeRuleLookupKey(rawName)
  const name = normalizeRuleLookupKey(entity.name)
  const aliases = [entity.identifier, entity.id, ...entity.aliases].map(normalizeRuleLookupKey)
  const reasons: string[] = []
  const conflicts: string[] = []
  let score = 0

  if (query === normalizeRuleLookupKey(entity.identifier) || query === normalizeRuleLookupKey(entity.id)) {
    score += 100
    reasons.push('identifier exact match')
  } else if (query === name) {
    score += 90
    reasons.push('name exact match')
  } else if (aliases.includes(query)) {
    score += 80
    reasons.push('alias match')
  } else if (fuzzyIncludesMatch(query, name) || aliases.some((alias) => fuzzyIncludesMatch(query, alias))) {
    score += 35
    score -= 20
    reasons.push('fuzzy name match')
  }

  const hintedKinds = context.section ? sectionKindHints[context.section] ?? sectionKindHints[toFoundryIdentifier(context.section)] : undefined
  if (hintedKinds?.includes(entity.kind)) {
    score += 50
    reasons.push('section-kind match')
  } else if (hintedKinds && !hintedKinds.includes(entity.kind)) {
    score -= 30
    conflicts.push('section kind conflict')
  }

  if (context.className && entity.className) {
    if (sameRuleName(context.className, entity.className)) {
      score += 40
      reasons.push('class match')
    } else {
      score -= 50
      conflicts.push(`feature belongs to ${entity.className}`)
    }
  }

  if (context.subclass && entity.subclassName) {
    if (sameRuleName(context.subclass, entity.subclassName)) {
      score += 40
      reasons.push('subclass match')
    } else {
      score -= 30
      conflicts.push(`feature belongs to ${entity.subclassName}`)
    }
  }

  if (context.race && entity.raceName) {
    if (sameRuleName(context.race, entity.raceName)) {
      score += 40
      reasons.push('race match')
    } else {
      score -= 50
      conflicts.push(`feature belongs to ${entity.raceName}`)
    }
  }

  if (typeof context.level === 'number' && typeof entity.level === 'number') {
    if (entity.level <= context.level) {
      score += 30
      reasons.push('level available')
    } else {
      score -= 30
      conflicts.push(`requires level ${entity.level}`)
    }
  }

  if (entity.seedLocal) {
    score += 20
    reasons.push('local seed')
  }

  return {
    entity,
    score,
    confidence: confidenceFromScore(score, conflicts),
    reasons,
    conflicts,
  }
}

export function confidenceFromScore(score: number, conflicts: string[] = []): RuleConfidence {
  if (score >= 100 && conflicts.length === 0) return 'high'
  if (score >= 70) return 'medium'
  if (score >= 40) return 'low'
  return 'unknown'
}

function sameRuleName(left: string, right: string): boolean {
  const aliases: Record<string, string> = {
    cleric: 'clerigo',
    clerigo: 'clerigo',
    clérigo: 'clerigo',
    fighter: 'guerreiro',
    guerreiro: 'guerreiro',
  }
  const leftKey = normalizeRuleLookupKey(left)
  const rightKey = normalizeRuleLookupKey(right)
  const normalizedLeft = aliases[leftKey] ?? leftKey
  const normalizedRight = aliases[rightKey] ?? rightKey
  return normalizedLeft === normalizedRight || normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)
}
