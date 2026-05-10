import { Download } from 'lucide-react'
import type { FoundryExportAuditReport } from '../lib/foundry/foundryValidationReport'
import { buildDiagnosticPackage } from '../lib/pipeline/buildDiagnosticPackage'
import type { SheetParseDebugInfo } from '../lib/sheets/sheetTypes'

type DownloadButtonsProps = {
  normalized: unknown
  actor: unknown
  auditReport?: FoundryExportAuditReport | null
  debug?: SheetParseDebugInfo | null
  actorExportBlocked?: boolean
  actorExportBlockedReason?: string
}

export function DownloadButtons({ normalized, actor, auditReport, debug, actorExportBlocked = false, actorExportBlockedReason }: DownloadButtonsProps) {
  const pipelineIds = extractPipelineIds(normalized, actor, auditReport, debug)
  const diagnosticPackage = normalized && actor && auditReport ? buildDiagnosticPackage({ pipelineIds, debug: debug ?? null, normalized: normalized as any, actor: actor as any, audit: auditReport }) : null
  return (
    <section className="download-row">
      <DownloadButton label="Baixar Foundry Actor JSON — IMPORTAR NO FOUNDRY" fileName="foundry-actor.json" data={actor} blocked={actorExportBlocked} blockedReason={actorExportBlockedReason} />
      <DownloadButton label="Baixar Audit Report — RELATÓRIO" fileName="foundry-audit-report.json" data={auditReport} />
      <details className="download-debug-tools">
        <summary>Avançado / Debug</summary>
        <div className="download-row">
          <DownloadButton label="Baixar Normalized Character JSON — DEBUG, NÃO IMPORTAR" fileName="normalized-character.json" data={normalized} />
          <DownloadButton
            label="Baixar Diagnostic Package — DEBUG AVANÇADO"
            fileName="pipeline-diagnostic-package.json"
            data={diagnosticPackage}
          />
        </div>
      </details>
    </section>
  )
}

function DownloadButton({ label, fileName, data, blocked = false, blockedReason }: { label: string; fileName: string; data: unknown; blocked?: boolean; blockedReason?: string }) {
  const disabled = !data || blocked
  return (
    <button type="button" disabled={disabled} title={blocked ? blockedReason : undefined} onClick={() => !disabled && downloadJson(fileName, data)}>
      <Download size={16} aria-hidden="true" />
      {label}
    </button>
  )
}

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function extractPipelineIds(normalized: unknown, actor: unknown, auditReport?: FoundryExportAuditReport | null, debug?: SheetParseDebugInfo | null) {
  const normalizedRecord = normalized && typeof normalized === 'object' ? (normalized as Record<string, unknown>) : {}
  const normalizedPipeline = normalizedRecord.pipeline && typeof normalizedRecord.pipeline === 'object' ? (normalizedRecord.pipeline as Record<string, unknown>) : {}
  const actorRecord = actor && typeof actor === 'object' ? (actor as Record<string, unknown>) : {}
  const actorFlags =
    actorRecord.flags && typeof actorRecord.flags === 'object' ? (((actorRecord.flags as Record<string, unknown>)['roll20-to-foundry'] as Record<string, unknown> | undefined) ?? {}) : {}
  return {
    parserBuildId: String(normalizedPipeline.parserBuildId ?? debug?.parserBuildId ?? actorFlags.parserBuildId ?? auditReport?.parserBuildId ?? ''),
    parseRunId: String(normalizedPipeline.parseRunId ?? debug?.parseRunId ?? actorFlags.parseRunId ?? auditReport?.parseRunId ?? ''),
    normalizedCharacterId: String(normalizedPipeline.normalizedCharacterId ?? debug?.normalizedCharacterId ?? actorFlags.normalizedCharacterId ?? auditReport?.normalizedCharacterId ?? ''),
    actorBuildId: String(normalizedPipeline.actorBuildId ?? debug?.actorBuildId ?? actorFlags.actorBuildId ?? auditReport?.actorBuildId ?? ''),
    auditBuildId: String(normalizedPipeline.auditBuildId ?? debug?.auditBuildId ?? actorFlags.auditBuildId ?? auditReport?.auditBuildId ?? ''),
  }
}
