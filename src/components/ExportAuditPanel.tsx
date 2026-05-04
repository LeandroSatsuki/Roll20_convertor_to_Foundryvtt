import type { FoundryExportAuditReport } from '../lib/foundry/foundryValidationReport'
import { FoundryValidationPanel } from './FoundryValidationPanel'

export function ExportAuditPanel({ report }: { report: FoundryExportAuditReport | null }) {
  return <FoundryValidationPanel report={report} />
}
