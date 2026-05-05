import type { FoundryActor } from '../foundry/foundryTypes'
import type { FoundryExportAuditReport } from '../foundry/foundryValidationReport'
import type { NormalizedCharacter, PipelineTrace } from '../normalize/normalizedCharacterTypes'
import type { SheetParseDebugInfo } from '../sheets/sheetTypes'

export type PipelineDiagnosticPackage = {
  pipelineIds: PipelineTrace
  debug: SheetParseDebugInfo | null
  normalized: NormalizedCharacter
  actor: FoundryActor
  audit: FoundryExportAuditReport
}

export function buildDiagnosticPackage(input: {
  pipelineIds: PipelineTrace
  debug: SheetParseDebugInfo | null
  normalized: NormalizedCharacter
  actor: FoundryActor
  audit: FoundryExportAuditReport
}): PipelineDiagnosticPackage {
  return {
    pipelineIds: input.pipelineIds,
    debug: input.debug,
    normalized: input.normalized,
    actor: input.actor,
    audit: input.audit,
  }
}
