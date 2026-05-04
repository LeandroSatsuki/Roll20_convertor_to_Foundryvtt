import { buildUserOverrideDownload, type UnresolvedRuleQueueEntry } from '../lib/rules/resolution/unresolvedRuleQueue'

export function UnresolvedRulesPanel({ entries }: { entries: UnresolvedRuleQueueEntry[] }) {
  function downloadOverride() {
    const blob = new Blob([buildUserOverrideDownload(entries)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'user-overrides.local.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (!entries.length) return <p className="empty">Nenhuma regra ficou na fila de revisão.</p>
  return (
    <section>
      <div className="panel-actions">
        <h3>Fila de regras não resolvidas</h3>
        <button type="button" onClick={downloadOverride}>
          Baixar override local
        </button>
      </div>
      {entries.map((entry) => (
        <article className="warning warning" key={`${entry.rawName}-${entry.section}`}>
          <strong>{entry.rawName}</strong>
          <p>{entry.reason}</p>
          <small>{entry.section ?? 'sem seção'} | sugestão: {entry.suggestedKind ?? 'unknown'}</small>
        </article>
      ))}
    </section>
  )
}

