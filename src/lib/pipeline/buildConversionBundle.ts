import { buildExportAuditReport } from '../export/buildExportAuditReport'
import { foundryId } from '../foundry/ids'
import { mapNormalizedToFoundryActor } from '../foundry/mapNormalizedToFoundryActor'
import type { FoundryActor } from '../foundry/foundryTypes'
import type { FoundryExportAuditReport } from '../foundry/foundryValidationReport'
import type { AbilityKey, NormalizedCharacter, PipelineTrace } from '../normalize/normalizedCharacterTypes'
import { makeWarning } from '../parser/parserUtils'
import type { SheetParseDebugInfo } from '../sheets/sheetTypes'

export type ConversionBundle = {
  normalized: NormalizedCharacter
  actor: FoundryActor
  audit: FoundryExportAuditReport
  debug: SheetParseDebugInfo | null
  pipelineIds: PipelineTrace
}

const abilityKeys: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function buildConversionBundle(character: NormalizedCharacter, debug?: SheetParseDebugInfo | null): ConversionBundle {
  const pipeline = ensurePipelineTrace(character, debug)
  applyBuildIds(character, debug, pipeline)
  ensureAbilitySnapshotWarnings(character, pipeline)

  const actor = mapNormalizedToFoundryActor(character)
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
