import type { FoundryExportAuditReport } from '../lib/foundry/foundryValidationReport'

export function FoundryValidationPanel({ report }: { report: FoundryExportAuditReport | null }) {
  if (!report) return <p className="empty">Gere um Actor para validar compatibilidade Foundry.</p>
  const statusLabel =
    report.importReadiness.status === 'blocked'
      ? 'Bloqueado'
      : report.importReadiness.status === 'ready-with-review'
        ? 'Pronto com pendências'
        : 'Pronto'
  const statusClass = report.importReadiness.status === 'blocked' ? 'blocked' : report.importReadiness.status === 'ready-with-review' ? 'warning' : 'ready'
  return (
    <section className="audit-panel">
      <header className={`audit-status ${statusClass}`}>
        <strong>{statusLabel}</strong>
        <span>{report.actorName}</span>
      </header>
      {report.importReadiness.status === 'ready-with-review' ? (
        <p className="status">O Actor é importável, mas existem regras Bonfire pendentes marcadas na ficha.</p>
      ) : null}
      <div className="audit-summary">
        <span>Itens: {report.summary.itemCount}</span>
        <span>Warnings: {report.summary.warningCount}</span>
        <span>Erros: {report.summary.errorCount}</span>
        <span>Erros bloqueantes: {report.summary.blockingErrorCount}</span>
        <span>Pendências de revisão: {report.summary.reviewIssueCount}</span>
        <span>Placeholders Bonfire: {report.summary.bonfireMissingRulePlaceholderCount}</span>
        <span>Itens para revisar: {report.summary.unresolvedReviewItemCount}</span>
        <span>Identifiers invalidos: {report.summary.invalidIdentifierCount}</span>
        <span>Identifiers duplicados: {report.summary.duplicateIdentifierCount}</span>
        <span>Features nao resolvidas: {report.summary.unresolvedFeatureCount}</span>
        <span>Rules high: {report.summary.resolvedHighCount}</span>
        <span>Rules medium: {report.summary.resolvedMediumCount}</span>
        <span>Rules low: {report.summary.resolvedLowCount}</span>
        <span>Unknown: {report.summary.unresolvedCount}</span>
        <span>Genericos: {report.summary.genericItemCount}</span>
        <span>Descricoes completas: {report.summary.describedItemCount}</span>
        <span>Descricoes fallback: {report.summary.descriptionFallbackCount}</span>
        <span>Descricoes ausentes: {report.summary.missingDescriptionCount}</span>
        <span>Itens com URL: {report.summary.sourceUrlCount}</span>
        <span>Auto full: {report.summary.automatedFullCount}</span>
        <span>Auto parcial: {report.summary.automatedPartialCount}</span>
        <span>Auto none: {report.summary.automatedNoneCount}</span>
        <span>Activities: {report.summary.activitiesCount}</span>
        <span>Activities invalidas: {report.summary.invalidActivitiesCount}</span>
        <span>Uses configurados: {report.summary.usesConfiguredCount}</span>
        <span>Recovery configurado: {report.summary.recoveryConfiguredCount}</span>
        <span>Biblioteca arquivos: {report.summary.libraryFilesLoadedCount}</span>
        <span>Biblioteca items: {report.summary.libraryItemsLoadedCount}</span>
        <span>Biblioteca spells: {report.summary.librarySpellsLoadedCount}</span>
        <span>Biblioteca feats: {report.summary.libraryFeatsLoadedCount}</span>
        <span>Com activities: {report.summary.libraryItemsWithActivitiesCount}</span>
        <span>Com effects: {report.summary.libraryItemsWithEffectsCount}</span>
        <span>Com Midi: {report.summary.libraryItemsWithMidiCount}</span>
        <span>Com Plutonium: {report.summary.libraryItemsWithPlutoniumCount}</span>
        <span>Hidratados: {report.summary.hydratedItemsCount}</span>
        <span>Fallback hidratação: {report.summary.hydrationFallbackCount}</span>
        <span>Refs antigas limpas: {report.summary.sanitizedActorReferenceCount}</span>
      </div>
      {report.importReadiness.blockingReasons.length ? (
        <div className="audit-blockers">
          <h3>Erros bloqueantes</h3>
          {report.importReadiness.blockingReasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      ) : null}
      <div className="audit-blockers">
        <h3>Descricoes dos itens</h3>
        <p>Completas: {report.auditDebug.itemDescriptions.complete.map((item) => item.name).join(', ') || 'nenhum'}</p>
        <p>Fallback: {report.auditDebug.itemDescriptions.fallback.map((item) => item.name).join(', ') || 'nenhum'}</p>
        <p>Ausentes: {report.auditDebug.itemDescriptions.missing.map((item) => item.name).join(', ') || 'nenhum'}</p>
      </div>
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
