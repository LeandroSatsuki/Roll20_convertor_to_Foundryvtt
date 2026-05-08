import { toFoundryIdentifier } from '../foundry/identifiers'
import { foundryLibraryAliasKeys, normalizeFoundryLibraryName } from './foundryLibraryAliases'
import { qualityScore } from './foundryLibraryDeduper'
import type { FoundryLibraryEntry, FoundryLibraryMatchCandidate, FoundryLibraryMatchConfidence, FoundryLibraryMatchRequest, FoundryLibraryMatchResult, FoundryReferenceLibrary } from './foundryReferenceLibraryTypes'
import { asRecord } from './foundryLibraryIndexer'

export function matchFoundryLibraryItem(library: FoundryReferenceLibrary | null | undefined, request: FoundryLibraryMatchRequest): FoundryLibraryMatchResult {
  if (!library || !request.requestedName.trim()) return { request, confidence: 'not-found', candidates: [], warnings: ['FOUNDRY_LIBRARY_ITEM_NOT_FOUND'] }

  const queryKeys = foundryLibraryAliasKeys(request.requestedName, request.aliases)
  const candidatePool = new Map<string, FoundryLibraryEntry>()
  for (const key of queryKeys) {
    for (const entry of library.byNormalizedName.get(key) ?? []) candidatePool.set(entry.libraryId, entry)
  }
  if (!candidatePool.size) {
    const fuzzyKey = normalizeFoundryLibraryName(request.requestedName)
    const requestedType = normalizeRequestedType(request.requestedType)
    for (const entry of library.entries) {
      const entryType = normalizeRequestedType(entry.type)
      if (requestedType && !isTypeCompatible(entryType, requestedType)) continue
      if (entry.normalizedName.includes(fuzzyKey) || entry.normalizedNameWithoutParentheses.includes(fuzzyKey) || fuzzyKey.includes(entry.normalizedNameWithoutParentheses)) {
        candidatePool.set(entry.libraryId, entry)
      }
    }
  }

  const candidates = Array.from(candidatePool.values())
    .map((entry) => scoreCandidate(entry, request, queryKeys))
    .filter((candidate) => candidate.score >= 50)
    .sort((left, right) => right.score - left.score || qualityScore(right.entry) - qualityScore(left.entry))

  const best = candidates[0]
  const confidence = best?.confidence ?? 'not-found'
  const warnings: string[] = []
  if (!best) warnings.push('FOUNDRY_LIBRARY_ITEM_NOT_FOUND')
  if (best && confidence === 'low') warnings.push('FOUNDRY_LIBRARY_LOW_CONFIDENCE')
  if (candidates.length > 1 && Math.abs(candidates[0].score - candidates[1].score) <= 10) warnings.push('FOUNDRY_LIBRARY_AMBIGUOUS_MATCH')
  if (best && best.reasons.includes('type incompatible')) warnings.push('FOUNDRY_LIBRARY_TYPE_CONFLICT')

  return { request, confidence, best, candidates, warnings }
}

function scoreCandidate(entry: FoundryLibraryEntry, request: FoundryLibraryMatchRequest, queryKeys: string[]): FoundryLibraryMatchCandidate {
  let score = 0
  const reasons: string[] = []
  const requestedType = normalizeRequestedType(request.requestedType)
  const entryType = normalizeRequestedType(entry.type)
  const typeCompatible = isTypeCompatible(entryType, requestedType)
  const identifierKey = entry.identifier ? normalizeFoundryLibraryName(entry.identifier) : ''
  const requestedIdentifier = toFoundryIdentifier(request.requestedName)

  if (queryKeys.includes(entry.normalizedName)) add(100, 'normalized name exact')
  if (queryKeys.includes(entry.normalizedNameWithoutParentheses)) add(70, 'name without parentheses exact')
  if (queryKeys.some((key) => key !== normalizeFoundryLibraryName(request.requestedName) && (key === entry.normalizedName || key === entry.normalizedNameWithoutParentheses))) add(90, 'alias exact')
  if (identifierKey && (queryKeys.includes(identifierKey) || requestedIdentifier === identifierKey)) add(80, 'identifier exact')
  if (entry.plutonium?.hash && queryKeys.some((key) => entry.plutonium?.hash?.toLowerCase().includes(key))) add(50, 'plutonium hash compatible')
  if (requestedType && typeCompatible) add(30, 'type compatible')
  if (requestedType && !typeCompatible) add(-100, 'type incompatible')
  if (request.spellLevel !== undefined && entry.spell?.level === request.spellLevel) add(20, 'spell level compatible')
  if (request.spellLevel !== undefined && entry.spell?.level !== undefined && entry.spell.level !== request.spellLevel) add(-40, 'spell level mismatch')
  if (request.sourceClass && classMatches(entry, request.sourceClass)) add(20, 'source class compatible')
  if (request.sourceClass && entry.spell?.sourceClass && !classMatches(entry, request.sourceClass)) add(-30, 'source class conflict')
  if (entry.quality.hasActivities) add(15, 'has activities')
  if (entry.quality.hasMidiProperties) add(15, 'has midi properties')
  if (entry.quality.hasEffects) add(10, 'has effects')
  if (entry.quality.hasDescription) add(10, 'has description')
  if (entry.source?.rules === '2024') add(8, 'rules 2024 preferred')
  if (!Object.keys(asRecord((entry.item as Record<string, unknown> | undefined)?.system)).length) add(-20, 'item without system')
  if (score > 0 && !queryKeys.includes(entry.normalizedName) && !queryKeys.includes(entry.normalizedNameWithoutParentheses) && !queryKeys.includes(identifierKey)) add(-25, 'name similar but not exact')

  return { entry, score, confidence: confidenceForScore(score), reasons }

  function add(value: number, reason: string) {
    score += value
    reasons.push(reason)
  }
}

function confidenceForScore(score: number): FoundryLibraryMatchConfidence {
  if (score >= 120) return 'high'
  if (score >= 80) return 'medium'
  if (score >= 50) return 'low'
  return 'not-found'
}

function normalizeRequestedType(type: string | undefined): string {
  if (!type) return ''
  if (type === 'classFeature' || type === 'class-feature') return 'feat'
  if (type === 'raceFeature' || type === 'backgroundFeature') return 'feat'
  if (type === 'armor') return 'equipment'
  return type
}

function isTypeCompatible(entryType: string, requestedType: string): boolean {
  if (!requestedType) return true
  if (entryType === requestedType) return true
  if (requestedType === 'equipment' && ['equipment', 'loot', 'tool', 'consumable', 'weapon'].includes(entryType)) return true
  if (requestedType === 'feat' && ['feat', 'race', 'background', 'subclass'].includes(entryType)) return true
  return false
}

function classMatches(entry: FoundryLibraryEntry, sourceClass: string): boolean {
  const requested = normalizeFoundryLibraryName(sourceClass)
  const classNames = entry.plutonium?.spellClassNames?.map(normalizeFoundryLibraryName) ?? []
  const sourceClassKey = entry.spell?.sourceClass ? normalizeFoundryLibraryName(entry.spell.sourceClass) : ''
  return classNames.includes(requested) || sourceClassKey === requested
}
