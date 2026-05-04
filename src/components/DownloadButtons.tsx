import { Download } from 'lucide-react'
import type { FoundryExportAuditReport } from '../lib/foundry/foundryValidationReport'

type DownloadButtonsProps = {
  normalized: unknown
  actor: unknown
  auditReport?: FoundryExportAuditReport | null
  actorExportBlocked?: boolean
  actorExportBlockedReason?: string
}

export function DownloadButtons({ normalized, actor, auditReport, actorExportBlocked = false, actorExportBlockedReason }: DownloadButtonsProps) {
  return (
    <section className="download-row">
      <DownloadButton label="JSON normalizado" fileName="normalized-character.json" data={normalized} />
      <DownloadButton label="Actor Foundry" fileName="foundry-actor.json" data={actor} blocked={actorExportBlocked} blockedReason={actorExportBlockedReason} />
      <DownloadButton label="Audit Report" fileName="foundry-audit-report.json" data={auditReport} />
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
