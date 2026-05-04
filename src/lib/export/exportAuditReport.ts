import type { FoundryExportAuditReport } from '../foundry/foundryValidationReport'

export function exportAuditReport(report: FoundryExportAuditReport): string {
  return JSON.stringify(report, null, 2)
}
