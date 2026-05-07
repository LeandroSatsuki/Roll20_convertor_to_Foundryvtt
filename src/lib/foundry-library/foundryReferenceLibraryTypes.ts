import type { FoundryItem } from '../foundry/foundryTypes'

export type FoundryLibraryQuality = {
  hasActivities: boolean
  hasEffects: boolean
  hasMidiProperties: boolean
  hasPlutoniumFlags: boolean
  hasCompendiumSource: boolean
  hasDescription: boolean
  hasUses: boolean
  hasDamageOrHealing: boolean
}

export type FoundryLibraryEntry = {
  libraryId: string
  sourceActorName: string
  sourceFileName: string
  sourceActorId?: string
  item: unknown
  itemId: string
  name: string
  normalizedName: string
  normalizedNameWithoutParentheses: string
  type: string
  identifier?: string
  aliases: string[]
  plutonium?: {
    page?: string
    source?: string
    hash?: string
    propDroppable?: string
    spellClassNames?: string[]
  }
  dnd5e?: {
    sourceId?: string
  }
  source?: {
    book?: string
    custom?: string
    rules?: string
    page?: string
  }
  spell?: {
    level?: number
    school?: string
    sourceClass?: string
    prepared?: number
  }
  quality: FoundryLibraryQuality
}

export type FoundryReferenceLibrary = {
  libraryId: string
  files: Array<{ fileName: string; actorName: string; itemCount: number; acceptedItemCount: number; rejectedItemCount: number }>
  entries: FoundryLibraryEntry[]
  indexes: {
    byNormalizedName: Map<string, FoundryLibraryEntry[]>
    byIdentifier: Map<string, FoundryLibraryEntry[]>
    byType: Map<string, FoundryLibraryEntry[]>
    byPlutoniumHash: Map<string, FoundryLibraryEntry[]>
  }
  byNormalizedName: Map<string, FoundryLibraryEntry[]>
  preferredByKey: Map<string, FoundryLibraryEntry>
  report: FoundryLibraryReport
}

export type FoundryLibraryReport = {
  libraryId: string
  filesLoadedCount: number
  itemsLoadedCount: number
  spellsLoadedCount: number
  featsLoadedCount: number
  equipmentLoadedCount: number
  weaponsLoadedCount: number
  consumablesLoadedCount: number
  itemsWithActivitiesCount: number
  itemsWithEffectsCount: number
  itemsWithMidiCount: number
  itemsWithPlutoniumCount: number
  rejectedItemsCount: number
}

export type FoundryReferenceLibraryInput = {
  sourceFileName: string
  actorJson: unknown
}

export type FoundryLibraryMatchConfidence = 'high' | 'medium' | 'low' | 'not-found'

export type FoundryLibraryMatchRequest = {
  requestedName: string
  requestedType?: string
  characterClass?: string
  characterLevel?: number
  spellLevel?: number
  sourceClass?: string
  aliases?: string[]
}

export type FoundryLibraryMatchCandidate = {
  entry: FoundryLibraryEntry
  score: number
  confidence: FoundryLibraryMatchConfidence
  reasons: string[]
}

export type FoundryLibraryMatchResult = {
  request: FoundryLibraryMatchRequest
  confidence: FoundryLibraryMatchConfidence
  best?: FoundryLibraryMatchCandidate
  candidates: FoundryLibraryMatchCandidate[]
  warnings: string[]
}

export type FoundryLibraryHydrationMeta = {
  hydrated: boolean
  source?: 'foundry-reference-library'
  reason?: 'not-found' | 'low-confidence' | 'medium-confidence-review' | 'fallback' | 'type-conflict'
  requestedName?: string
  requestedType?: string
  requestedDisplayName?: string
  libraryLookupName?: string
  canonicalName?: string
  displayLanguage?: 'pt-BR' | 'en' | 'mixed'
  fallbackCategory?: 'customFallback' | 'bonfireFallback' | 'libraryMiss' | 'unsafeMatchRejected' | 'noCandidate' | null
  sourceActorName?: string
  sourceFileName?: string
  sourceItemName?: string
  sourceItemId?: string
  matchScore?: number
  matchConfidence?: FoundryLibraryMatchConfidence
  preservedActivities?: boolean
  preservedEffects?: boolean
  preservedMidiProperties?: boolean
  preservedPlutoniumFlags?: boolean
  sanitizedActorReferences?: number
  warnings: string[]
}

export type FoundryHydrationDetail = {
  requestedName: string
  requestedType: string
  finalItemName: string
  finalItemType: string
  hydrated: boolean
  fallbackUsed: boolean
  fallbackCategory: 'customFallback' | 'bonfireFallback' | 'libraryMiss' | 'unsafeMatchRejected' | 'noCandidate' | null
  matchedName?: string
  sourceActorName?: string
  sourceFileName?: string
  matchScore?: number
  matchConfidence?: FoundryLibraryMatchConfidence
  preservedActivities: boolean
  preservedEffects: boolean
  preservedMidiProperties: boolean
  preservedPlutoniumFlags: boolean
  sanitizedActorReferences: number
  warnings: string[]
}

export type HydratedFoundryItem = FoundryItem & {
  flags: FoundryItem['flags'] & {
    'roll20-to-foundry'?: Record<string, unknown> & {
      hydration?: FoundryLibraryHydrationMeta
    }
  }
}

export type FoundryHydrationReport = {
  requestedItemsCount: number
  entries: FoundryHydrationDetail[]
  hydrationDetails: FoundryHydrationDetail[]
  hydratedItemsCount: number
  hydrationFallbackCount: number
  hydratedSpellsCount: number
  hydratedClassFeaturesCount: number
  hydratedEquipmentCount: number
  hydratedItemsWithActivitiesCount: number
  hydratedItemsWithEffectsCount: number
  hydratedItemsWithMidiCount: number
  hydratedItemsWithPlutoniumCount: number
  hydrationHighCount: number
  hydrationMediumCount: number
  hydrationLowCount: number
  hydrationCustomFallbackCount: number
  bonfireFallbackFeatureCount: number
  hydrationLibraryMissCount: number
  hydrationUnsafeMatchRejectedCount: number
  hydrationNoCandidateCount: number
  sanitizedActorReferenceCount: number
  warnings: Array<{ code: string; message: string; itemName?: string }>
}
