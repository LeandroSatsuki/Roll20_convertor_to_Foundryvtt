import type { FoundryItem } from '../foundry/foundryTypes'
import { foundryId } from '../foundry/ids'
import { toFoundryIdentifier } from '../foundry/identifiers'
import { asRecord } from './foundryLibraryIndexer'
import { sanitizeFoundryLibraryItem } from './foundryLibrarySanitizer'
import type { FoundryLibraryHydrationMeta, FoundryLibraryMatchResult, HydratedFoundryItem } from './foundryReferenceLibraryTypes'

export function cloneFoundryLibraryItem(match: FoundryLibraryMatchResult, requestedName: string, requestedType: string): HydratedFoundryItem {
  if (!match.best) throw new Error(`Cannot clone Foundry library item without a match for ${requestedName}.`)
  const entry = match.best.entry
  const cloned = structuredCloneSafe(entry.item) as FoundryItem
  const oldItemId = entry.itemId
  cloned._id = foundryId()
  cloned.name = typeof cloned.name === 'string' && cloned.name ? cloned.name : entry.name
  cloned.type = typeof cloned.type === 'string' && cloned.type ? cloned.type : entry.type
  cloned.img = typeof cloned.img === 'string' && cloned.img ? cloned.img : 'icons/svg/item-bag.svg'
  cloned.system = asRecord(cloned.system)
  cloned.system.identifier = typeof cloned.system.identifier === 'string' && cloned.system.identifier.trim() ? cloned.system.identifier : toFoundryIdentifier(cloned.name, requestedType || 'item')
  cloned.effects = Array.isArray(cloned.effects) ? cloned.effects : []
  cloned.flags = asRecord(cloned.flags)
  cloned._stats = asRecord(cloned._stats)
  cloned.folder = null

  const sanitized = sanitizeFoundryLibraryItem(cloned, oldItemId)
  const system = asRecord(cloned.system)
  const flags = asRecord(cloned.flags)
  const converterFlags = asRecord(flags['roll20-to-foundry'])
  const hydration: FoundryLibraryHydrationMeta = {
    hydrated: true,
    source: 'foundry-reference-library',
    requestedName,
    requestedType,
    sourceActorName: entry.sourceActorName,
    sourceFileName: entry.sourceFileName,
    sourceItemName: entry.name,
    sourceItemId: entry.itemId,
    matchScore: match.best.score,
    matchConfidence: match.best.confidence,
    fallbackCategory: null,
    preservedActivities: entry.quality.hasActivities,
    preservedEffects: entry.quality.hasEffects,
    preservedMidiProperties: entry.quality.hasMidiProperties,
    preservedPlutoniumFlags: entry.quality.hasPlutoniumFlags,
    sanitizedActorReferences: sanitized.sanitizedActorReferences,
    warnings: [...new Set([...match.warnings, ...sanitized.warnings])],
  }
  ;(hydration as Record<string, unknown>).ambiguous = match.warnings.includes('FOUNDRY_LIBRARY_AMBIGUOUS_MATCH')
  converterFlags.hydration = hydration
  flags['roll20-to-foundry'] = converterFlags
  cloned.flags = flags
  cloned.system = system
  return cloned as HydratedFoundryItem
}

export function markFallbackHydration(
  item: FoundryItem,
  requestedName: string,
  requestedType: string,
  reason: 'not-found' | 'low-confidence' | 'medium-confidence-review' | 'fallback' | 'type-conflict' = 'not-found',
  options?: {
    fallbackCategory?: FoundryLibraryHydrationMeta['fallbackCategory']
    matchScore?: number
    matchConfidence?: FoundryLibraryHydrationMeta['matchConfidence']
    warnings?: string[]
    ambiguous?: boolean
  },
): FoundryItem {
  const flags = asRecord(item.flags)
  const converterFlags = asRecord(flags['roll20-to-foundry'])
  const hydration = {
    hydrated: false,
    reason,
    requestedName,
    requestedType,
    fallbackCategory: options?.fallbackCategory ?? null,
    warnings: options?.warnings?.length
      ? options.warnings
      : reason === 'not-found'
        ? ['FOUNDRY_LIBRARY_ITEM_NOT_FOUND']
        : reason === 'type-conflict'
          ? ['FOUNDRY_LIBRARY_TYPE_CONFLICT']
          : ['FOUNDRY_LIBRARY_LOW_CONFIDENCE'],
    ...(typeof options?.matchScore === 'number' ? { matchScore: options.matchScore } : {}),
    ...(options?.matchConfidence ? { matchConfidence: options.matchConfidence } : {}),
    ...(options?.ambiguous ? { ambiguous: true } : {}),
  } satisfies FoundryLibraryHydrationMeta & Record<string, unknown>
  converterFlags.hydration = hydration
  flags['roll20-to-foundry'] = converterFlags
  item.flags = flags
  return item
}

function structuredCloneSafe(value: unknown): unknown {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
