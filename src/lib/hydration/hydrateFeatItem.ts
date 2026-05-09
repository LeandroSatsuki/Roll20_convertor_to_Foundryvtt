import type { FoundryItem } from '../foundry/foundryTypes'
import { markFallbackHydration } from '../foundry-library/cloneFoundryLibraryItem'
import { matchFoundryLibraryItem } from '../foundry-library/foundryLibraryMatcher'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { classifyHydrationFallback, fallbackReason, shouldHydrateWithLibrary } from './hydrationPriority'

export function hydrateFeatItem(item: FoundryItem, library: FoundryReferenceLibrary, context: { characterClass?: string; characterLevel?: number }): FoundryItem {
  const existingFlags = item.flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  const bonfireResolution = existingFlags?.bonfireResolution && typeof existingFlags.bonfireResolution === 'object' && !Array.isArray(existingFlags.bonfireResolution)
    ? (existingFlags.bonfireResolution as Record<string, unknown>)
    : null
  if (bonfireResolution?.status === 'not-found') {
    return markFallbackHydration(item, item.name, item.type, 'not-found', {
      fallbackCategory: 'libraryMiss',
      warnings: ['BONFIRE_RULE_COVERAGE_MISSING', 'FEATURE_UNRESOLVED_REVIEW_REQUIRED'],
    })
  }
  const existingFeatureSource = existingFlags?.featureSource
  const existingFeatureResolution = existingFlags?.featureResolution && typeof existingFlags.featureResolution === 'object' && !Array.isArray(existingFlags.featureResolution)
    ? { ...(existingFlags.featureResolution as Record<string, unknown>) }
    : {}
  const suggestionAliases = Array.isArray(existingFeatureResolution.librarySuggestionAliases)
    ? existingFeatureResolution.librarySuggestionAliases.map(String)
    : []
  const match = matchFoundryLibraryItem(library, {
    requestedName: item.name,
    requestedType: item.type === 'background' || item.type === 'race' ? item.type : 'feat',
    characterClass: context.characterClass,
    characterLevel: context.characterLevel,
    aliases: suggestionAliases,
  })
  const fallback = markFallbackHydration(item, item.name, item.type, shouldHydrateWithLibrary(match) ? 'fallback' : match.warnings.includes('FOUNDRY_LIBRARY_TYPE_CONFLICT') ? 'type-conflict' : fallbackReason(match), {
    fallbackCategory: classifyHydrationFallback(item, item.type, match) === 'customFallback' ? 'bonfireFallback' : classifyHydrationFallback(item, item.type, match),
    matchScore: match.best?.score,
    matchConfidence: match.best?.confidence ?? match.confidence,
    warnings: Array.from(new Set([...(match.warnings ?? []), 'FOUNDRY_FEATURE_HYDRATION_BLOCKED_BY_POLICY'])),
    ambiguous: match.warnings.includes('FOUNDRY_LIBRARY_AMBIGUOUS_MATCH'),
  })
  const flags = fallback.flags?.['roll20-to-foundry'] as Record<string, unknown> | undefined
  if (flags) {
    const featureSource = existingFeatureSource && typeof existingFeatureSource === 'object' && !Array.isArray(existingFeatureSource) ? { ...(existingFeatureSource as Record<string, unknown>) } : {}
    featureSource.hydratedFromLibrary = false
    featureSource.fallbackBonfire = bonfireResolution?.status !== 'not-found'
    featureSource.unresolved = bonfireResolution?.status === 'not-found'
    flags.featureSource = featureSource
    flags.featureResolution = {
      ...existingFeatureResolution,
      sourcePriority: 'bonfire-first',
      bonfireMatched: bonfireResolution?.status !== 'not-found',
      libraryCandidateRejectedBecauseBonfireMatched: Boolean(match.best),
      librarySuggestionName: match.best?.entry.name ?? null,
    }
    flags.foundryLibrarySuggestionOnly = true
    const hydrationMeta: Record<string, unknown> = {
      ...(flags.hydration && typeof flags.hydration === 'object' && !Array.isArray(flags.hydration) ? (flags.hydration as Record<string, unknown>) : {}),
      hydrated: false,
      requestedName: item.name,
      requestedType: item.type,
      fallbackCategory: bonfireResolution?.status === 'not-found' ? 'libraryMiss' : 'bonfireFallback',
      warnings: Array.from(new Set([...(Array.isArray((flags.hydration as Record<string, unknown> | undefined)?.warnings) ? ((flags.hydration as Record<string, unknown>).warnings as unknown[]).map(String) : []), 'FOUNDRY_FEATURE_HYDRATION_BLOCKED_BY_POLICY'])),
      foundryLibrarySuggestionOnly: true,
      preservedActivities: false,
      preservedEffects: false,
      preservedMidiProperties: false,
      preservedPlutoniumFlags: false,
      sanitizedActorReferences: 0,
    }
    if (match.best?.entry.name) hydrationMeta.sourceItemName = match.best.entry.name
    if (match.best?.entry.sourceActorName) hydrationMeta.sourceActorName = match.best.entry.sourceActorName
    if (match.best?.entry.sourceFileName) hydrationMeta.sourceFileName = match.best.entry.sourceFileName
    if (typeof match.best?.score === 'number') hydrationMeta.matchScore = match.best.score
    if (match.best?.confidence ?? match.confidence) hydrationMeta.matchConfidence = match.best?.confidence ?? match.confidence
    flags.hydration = hydrationMeta
  }
  return fallback
}
