import { DownloadButtons } from './DownloadButtons'
import type { FoundryExportAuditReport } from '../lib/foundry/foundryValidationReport'

export function ExportPanel({ normalized, actor, auditReport, blocked, reason }: { normalized: unknown; actor: unknown; auditReport?: FoundryExportAuditReport | null; blocked: boolean; reason?: string }) {
  return <DownloadButtons normalized={normalized} actor={actor} auditReport={auditReport} actorExportBlocked={blocked} actorExportBlockedReason={reason} />
}
