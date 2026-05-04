import { makeWarning } from '../../parser/parserUtils'
import type { NormalizedCharacter } from '../../normalize/normalizedCharacterTypes'
import type { ConversionWarning } from '../../normalize/normalizedCharacterTypes'
import type { FeatureResolutionContext } from '../bonfireTypes'
import type { RuleResolutionResult } from '../schema/bonfireEntityTypes'
import { defaultBonfireRuleIndex, type BonfireRuleIndex } from '../store/bonfireRuleIndex'
import { findRuleCandidates } from './entityMatcher'
import { scoreRuleCandidate } from './ruleCandidateScorer'
import { createUnresolvedRuleEntry, type UnresolvedRuleQueueEntry } from './unresolvedRuleQueue'

export type FeatureResolutionPipelineResult = {
  character: NormalizedCharacter
  resolutions: RuleResolutionResult[]
  unresolvedRules: UnresolvedRuleQueueEntry[]
  warnings: ConversionWarning[]
}

export function resolveCharacterRules(character: NormalizedCharacter, index: BonfireRuleIndex = defaultBonfireRuleIndex): FeatureResolutionPipelineResult {
  const context = characterContext(character)
  const resolutions = character.features.map((feature) => resolveRuleName(feature.raw || feature.name.value, { ...context, section: feature.sourceType }, index))
  const unresolvedRules = resolutions
    .filter((resolution) => resolution.confidence === 'unknown' || resolution.kind === 'unknown')
    .map((resolution) => createUnresolvedRuleEntry(resolution.rawName, undefined, character, resolution.candidates, 'Regra nao encontrada ou score insuficiente.'))
  const warnings = resolutions.flatMap((resolution) => resolution.warnings)
  return { character, resolutions, unresolvedRules, warnings }
}

export function resolveRuleName(rawName: string, context: FeatureResolutionContext = {}, index: BonfireRuleIndex = defaultBonfireRuleIndex): RuleResolutionResult {
  const candidates = findRuleCandidates(rawName, context, index)
    .map((entity) => scoreRuleCandidate(rawName, entity, context))
    .sort((a, b) => b.score - a.score)

  const best = candidates[0]
  if (!best || best.score < 40) {
    return {
      rawName,
      resolvedName: rawName,
      identifier: '',
      kind: context.section?.toLowerCase().includes('talento') ? 'feat' : 'unknown',
      confidence: 'unknown',
      score: best?.score ?? 0,
      candidates,
      warnings: [makeWarning('RULE_NOT_FOUND', `Regra Bonfire nao encontrada para ${rawName}.`, 'rules')],
    }
  }

  const closeCandidates = candidates.filter((candidate) => candidate !== best && best.score - candidate.score <= 10)
  const ambiguous = closeCandidates.length > 0
  const warnings: ConversionWarning[] = []
  if (ambiguous) warnings.push(makeWarning('RULE_RESOLUTION_AMBIGUOUS', `Mais de uma regra candidata encontrada para ${rawName}.`, 'rules'))
  for (const conflict of best.conflicts) warnings.push(makeWarning(conflict.includes('level') ? 'RULE_LEVEL_MISMATCH' : conflict.includes('race') ? 'RULE_RACE_MISMATCH' : conflict.includes('class') ? 'RULE_CLASS_MISMATCH' : 'RULE_KIND_CONFLICT', conflict, 'rules'))
  if (best.confidence === 'low') warnings.push(makeWarning('RULE_RESOLUTION_LOW_CONFIDENCE', `Resolucao de baixa confianca para ${rawName}.`, 'rules'))

  return {
    rawName,
    resolvedName: best.entity.name,
    identifier: best.entity.identifier,
    kind: best.entity.kind,
    confidence: ambiguous && best.confidence === 'high' ? 'medium' : best.confidence,
    score: best.score,
    ruleId: best.entity.id,
    sourceUrl: best.entity.sourceUrl,
    description: best.entity.description,
    candidates,
    warnings,
  }
}

function characterContext(character: NormalizedCharacter): FeatureResolutionContext {
  return {
    className: character.identity.classes[0]?.name,
    level: character.identity.classes[0]?.level,
    subclass: character.identity.classes[0]?.subclass,
    race: character.identity.race.value,
    background: character.identity.background.value,
  }
}

