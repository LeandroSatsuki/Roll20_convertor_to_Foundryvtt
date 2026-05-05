import { DownloadButtons } from './DownloadButtons'
import type { FoundryExportAuditReport } from '../lib/foundry/foundryValidationReport'
import type { SheetParseDebugInfo } from '../lib/sheets/sheetTypes'

export function ExportPanel({ normalized, actor, auditReport, debug, blocked, reason }: { normalized: unknown; actor: unknown; auditReport?: FoundryExportAuditReport | null; debug?: SheetParseDebugInfo | null; blocked: boolean; reason?: string }) {
  return <DownloadButtons normalized={normalized} actor={actor} auditReport={auditReport} debug={debug} actorExportBlocked={blocked} actorExportBlockedReason={reason} />
}
