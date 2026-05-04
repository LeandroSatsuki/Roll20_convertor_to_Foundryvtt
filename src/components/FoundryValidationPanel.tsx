import type { FoundryExportAuditReport } from '../lib/foundry/foundryValidationReport'

export function FoundryValidationPanel({ report }: { report: FoundryExportAuditReport | null }) {
  if (!report) return <p className="empty">Gere um Actor para validar compatibilidade Foundry.</p>
  return (
    <section className="audit-panel">
      <header className={`audit-status ${report.importReadiness.canExport ? (report.summary.warningCount ? 'warning' : 'ready') : 'blocked'}`}>
        <strong>{report.importReadiness.canExport ? (report.summary.warningCount ? 'Precisa de revisão' : 'Pronto para importar') : 'Bloqueado'}</strong>
        <span>{report.actorName}</span>
      </header>
      <div className="audit-summary">
        <span>Itens: {report.summary.itemCount}</span>
        <span>Warnings: {report.summary.warningCount}</span>
        <span>Erros: {report.summary.errorCount}</span>
        <span>Identifiers inválidos: {report.summary.invalidIdentifierCount}</span>
        <span>Features não resolvidas: {report.summary.unresolvedFeatureCount}</span>
        <span>Rules high: {report.summary.resolvedHighCount}</span>
        <span>Rules medium: {report.summary.resolvedMediumCount}</span>
        <span>Rules low: {report.summary.resolvedLowCount}</span>
        <span>Unknown: {report.summary.unresolvedCount}</span>
        <span>Genéricos: {report.summary.genericItemCount}</span>
      </div>
      {report.importReadiness.blockingReasons.length ? (
        <div className="audit-blockers">
          <h3>Erros bloqueantes</h3>
          {report.importReadiness.blockingReasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      ) : null}
      <div className="warnings">
        {report.validations.map((result, index) => (
          <article className={`warning ${result.severity}`} key={`${result.code}-${index}`}>
            <strong>{result.code}</strong>
            <p>{result.message}</p>
            {result.path ? <small>{result.path}</small> : null}
            {result.itemName ? <small>{result.itemName}</small> : null}
          </article>
        ))}
      </div>
    </section>
  )
}
