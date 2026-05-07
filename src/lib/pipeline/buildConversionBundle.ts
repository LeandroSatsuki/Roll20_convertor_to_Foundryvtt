import { buildExportAuditReport } from '../export/buildExportAuditReport'
import { ensureUniqueActorItemIdentifiers } from '../foundry/identifiers'
import { foundryId } from '../foundry/ids'
import { mapNormalizedToFoundryActor } from '../foundry/mapNormalizedToFoundryActor'
import { prepareFinalBonfireActor } from '../foundry/prepareFinalBonfireActor'
import type { FoundryActor } from '../foundry/foundryTypes'
import type { FoundryExportAuditReport } from '../foundry/foundryValidationReport'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { hydrateActorItems } from '../hydration/hydrateActorItems'
import type { AbilityKey, NormalizedCharacter, PipelineTrace } from '../normalize/normalizedCharacterTypes'
import { makeWarning } from '../parser/parserUtils'
import { buildClassProgressionSuggestions } from '../progression/classProgressionSuggestions'
import type { SheetParseDebugInfo } from '../sheets/sheetTypes'

export type ConversionBundle = {
  normalized: NormalizedCharacter
  actor: FoundryActor
  audit: FoundryExportAuditReport
  debug: SheetParseDebugInfo | null
  pipelineIds: PipelineTrace
}

export type ConversionBundleOptions = {
  referenceLibrary?: FoundryReferenceLibrary | null
}

const abilityKeys: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function buildConversionBundle(character: NormalizedCharacter, debug?: SheetParseDebugInfo | null, options: ConversionBundleOptions = {}): ConversionBundle {
  const pipeline = ensurePipelineTrace(character, debug)
  applyBuildIds(character, debug, pipeline)
  ensureAbilitySnapshotWarnings(character, pipeline)

  const actor = hydrateActorItems(mapNormalizedToFoundryActor(character), character, options.referenceLibrary)
  const actorFlags = ensureConverterFlags(actor)
  actorFlags.parserBuildId = pipeline.parserBuildId
  actorFlags.parseRunId = pipeline.parseRunId
  actorFlags.normalizedCharacterId = pipeline.normalizedCharacterId
  actorFlags.actorBuildId = pipeline.actorBuildId ?? null
  actorFlags.auditBuildId = pipeline.auditBuildId ?? null
  actorFlags.abilitiesBeforeActorBuild = collectNormalizedAbilities(character)
  actorFlags.sourceNormalizedCharacter = {
    fileName: character.source.fileName,
    sourceType: character.source.type,
  }
  ensureUniqueActorItemIdentifiers(actor)
  prepareFinalBonfireActor(actor, character)
  attachClassProgressionSuggestions(actor, character)

  const audit = buildExportAuditReport(actor, character)
  return { normalized: character, actor, audit, debug: debug ?? null, pipelineIds: pipeline }
}

function ensurePipelineTrace(character: NormalizedCharacter, debug?: SheetParseDebugInfo | null): PipelineTrace {
  const existing = character.pipeline
  const pipeline: PipelineTrace = {
    parserBuildId: existing?.parserBuildId ?? debug?.parserBuildId ?? 'unknown-parser-build',
    parseRunId: existing?.parseRunId ?? debug?.parseRunId ?? `parse-${foundryId(12)}`,
    normalizedCharacterId: existing?.normalizedCharacterId ?? debug?.normalizedCharacterId ?? `normalized-${foundryId(12)}`,
    actorBuildId: existing?.actorBuildId ?? debug?.actorBuildId ?? null,
    auditBuildId: existing?.auditBuildId ?? debug?.auditBuildId ?? null,
  }
  character.pipeline = pipeline
  if (debug) {
    debug.parseRunId = pipeline.parseRunId
    debug.normalizedCharacterId = pipeline.normalizedCharacterId
    debug.actorBuildId = pipeline.actorBuildId
    debug.auditBuildId = pipeline.auditBuildId
  }
  return pipeline
}

function applyBuildIds(character: NormalizedCharacter, debug: SheetParseDebugInfo | null | undefined, pipeline: PipelineTrace) {
  pipeline.actorBuildId = `actor-${foundryId(12)}`
  pipeline.auditBuildId = `audit-${foundryId(12)}`
  character.pipeline = pipeline
  if (debug) {
    debug.actorBuildId = pipeline.actorBuildId
    debug.auditBuildId = pipeline.auditBuildId
  }
}

function ensureAbilitySnapshotWarnings(character: NormalizedCharacter, pipeline: PipelineTrace) {
  const invalidAbilities = abilityKeys.filter((key) => character.abilities[key].score.value === null || character.abilities[key].score.value === undefined)
  character.warnings = character.warnings.filter((warning) => warning.code !== 'PIPELINE_ACTOR_BUILD_SOURCE_MISSING_ABILITY')
  if (!invalidAbilities.length) return
  character.warnings.push(
    makeWarning(
      'PIPELINE_ACTOR_BUILD_SOURCE_MISSING_ABILITY',
      `Actor build recebeu ability scores nulos em ${invalidAbilities.join(', ')}. source normalizedCharacterId=${pipeline.normalizedCharacterId}.`,
      'pipeline.actorBuild',
      invalidAbilities.join(', '),
      'error',
    ),
  )
}

function ensureConverterFlags(actor: FoundryActor): Record<string, unknown> {
  const flags = actor.flags as Record<string, unknown>
  const converterFlags = (flags['roll20-to-foundry'] as Record<string, unknown> | undefined) ?? {}
  flags['roll20-to-foundry'] = converterFlags
  actor.flags = flags
  return converterFlags
}

function collectNormalizedAbilities(character: NormalizedCharacter): Record<string, number | null> {
  return Object.fromEntries(abilityKeys.map((key) => [key, character.abilities[key].score.value ?? null]))
}

function attachClassProgressionSuggestions(actor: FoundryActor, character: NormalizedCharacter) {
  const flags = actor.flags as Record<string, unknown>
  const converterFlags = (flags['roll20-to-foundry'] as Record<string, unknown> | undefined) ?? {}
  converterFlags.classProgressionSuggestions = buildClassProgressionSuggestions(character, actor)
  flags['roll20-to-foundry'] = converterFlags
  actor.flags = flags
}
