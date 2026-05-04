import type { FoundryActor } from '../foundry/foundryTypes'
import type { FoundryExportAuditReport } from '../foundry/foundryValidationReport'

export function exportActorJson(actor: FoundryActor, report: FoundryExportAuditReport): string {
  if (!report.importReadiness.canExport) {
    throw new Error(`Actor export blocked: ${report.importReadiness.blockingReasons.join('; ')}`)
  }
  return JSON.stringify(actor, null, 2)
}
