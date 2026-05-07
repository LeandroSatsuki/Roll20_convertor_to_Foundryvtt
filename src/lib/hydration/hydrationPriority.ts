import type { FoundryItem } from '../foundry/foundryTypes'
import type { FoundryLibraryHydrationMeta, FoundryLibraryMatchResult } from '../foundry-library/foundryReferenceLibraryTypes'

export type HydrationFallbackReason = 'not-found' | 'low-confidence' | 'medium-confidence-review' | 'fallback'
export type HydrationFallbackCategory = NonNullable<FoundryLibraryHydrationMeta['fallbackCategory']>

export function shouldHydrateWithLibrary(match: FoundryLibraryMatchResult): boolean {
  return match.confidence === 'high' && Boolean(match.best) && !match.warnings.includes('FOUNDRY_LIBRARY_TYPE_CONFLICT') && !match.best?.reasons.includes('type incompatible')
}

export function fallbackReason(match: FoundryLibraryMatchResult): HydrationFallbackReason {
  if (match.confidence === 'not-found') return 'not-found'
  if (match.confidence === 'low') return 'low-confidence'
  if (match.confidence === 'medium') return 'medium-confidence-review'
  return 'not-found'
}

export function classifyHydrationFallback(item: FoundryItem, requestedType: string, match: FoundryLibraryMatchResult): HydrationFallbackCategory {
  if (isExpectedCustomFallback(item, requestedType)) return 'customFallback'
  if (hasBonfireRuleFallback(item)) return 'bonfireFallback'
  if (match.candidates.length > 0 || match.confidence === 'medium' || match.confidence === 'low' || match.warnings.includes('FOUNDRY_LIBRARY_TYPE_CONFLICT')) {
    return 'unsafeMatchRejected'
  }
  if (isExpectedLibraryBackedType(item, requestedType)) return 'libraryMiss'
  return 'noCandidate'
}

function isExpectedCustomFallback(item: FoundryItem, requestedType: string): boolean {
  if (requestedType === 'race' || requestedType === 'background' || item.type === 'background') return true
  const resolution = getRuleResolution(item)
  const kind = typeof resolution?.kind === 'string' ? resolution.kind : ''
  return ['race', 'background', 'racefeature', 'backgroundfeature', 'subclassfeature', 'originfeat', 'racialfeat', 'resource', 'spellcasting'].includes(kind.toLowerCase())
}

function isExpectedLibraryBackedType(item: FoundryItem, requestedType: string): boolean {
  const normalizedType = (requestedType || item.type || '').toLowerCase()
  if (['spell', 'weapon', 'equipment', 'consumable', 'loot', 'tool', 'class'].includes(normalizedType)) return true
  const resolution = getRuleResolution(item)
  const kind = typeof resolution?.kind === 'string' ? resolution.kind.toLowerCase() : ''
  return ['spell', 'weapon', 'armor', 'consumable', 'tool', 'equipment', 'class'].includes(kind)
}

function getRuleResolution(item: FoundryItem): Record<string, unknown> | null {
  const converterFlags = item.flags?.['roll20-to-foundry']
  if (!converterFlags || typeof converterFlags !== 'object' || Array.isArray(converterFlags)) return null
  const resolution = (converterFlags as Record<string, unknown>).ruleResolution
  return resolution && typeof resolution === 'object' && !Array.isArray(resolution) ? (resolution as Record<string, unknown>) : null
}

function hasBonfireRuleFallback(item: FoundryItem): boolean {
  const converterFlags = item.flags?.['roll20-to-foundry']
  if (!converterFlags || typeof converterFlags !== 'object' || Array.isArray(converterFlags)) return false
  const descriptionMeta = (converterFlags as Record<string, unknown>).descriptionMeta
  const status = descriptionMeta && typeof descriptionMeta === 'object' && !Array.isArray(descriptionMeta) ? String((descriptionMeta as Record<string, unknown>).status ?? '') : ''
  const resolution = getRuleResolution(item)
  const ruleId = resolution ? String(resolution.ruleId ?? '') : ''
  return Boolean(ruleId) && (status === 'complete' || status === 'fallback')
}
