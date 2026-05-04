import type { NormalizedCharacter } from '../../normalize/normalizedCharacterTypes'
import type { RuleResolutionCandidate } from '../schema/bonfireEntityTypes'

export type UnresolvedRuleQueueEntry = {
  rawName: string
  section?: string
  characterName: string
  className?: string
  raceName?: string
  candidates: RuleResolutionCandidate[]
  reason: string
  suggestedKind?: string
}

export function createUnresolvedRuleEntry(rawName: string, section: string | undefined, character: NormalizedCharacter, candidates: RuleResolutionCandidate[], reason: string): UnresolvedRuleQueueEntry {
  return {
    rawName,
    section,
    characterName: character.identity.name.value,
    className: character.identity.classes[0]?.name,
    raceName: character.identity.race.value,
    candidates,
    reason,
    suggestedKind: candidates[0]?.entity.kind,
  }
}

export function buildUserOverrideDownload(entries: UnresolvedRuleQueueEntry[]): string {
  const overrides = entries.map((entry) => ({
    rawName: entry.rawName,
    section: entry.section,
    suggestedKind: entry.suggestedKind ?? 'unknown',
    candidates: entry.candidates.slice(0, 5).map((candidate) => ({
      id: candidate.entity.id,
      name: candidate.entity.name,
      kind: candidate.entity.kind,
      score: candidate.score,
    })),
  }))
  return JSON.stringify({ generatedAt: new Date().toISOString(), overrides }, null, 2)
}

