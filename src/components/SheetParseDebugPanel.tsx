import type { SheetParseDebugInfo } from '../lib/sheets/sheetTypes'

export function SheetParseDebugPanel({ debug }: { debug: SheetParseDebugInfo | null }) {
  if (!debug) return <p className="empty">Nenhuma planilha importada.</p>

  return (
    <section className="sheet-debug">
      <div className="panel-actions">
        <h2>Debug da Planilha</h2>
        <button type="button" onClick={() => downloadDebugJson(debug)}>
          Baixar debug da planilha
        </button>
      </div>
      <dl className="debug-summary">
        <dt>Arquivo</dt>
        <dd>{debug.workbookFileName}</dd>
        <dt>Abas encontradas</dt>
        <dd>{debug.sheetNames.join(', ') || 'Nenhuma'}</dd>
        <dt>Aba escolhida</dt>
        <dd>{debug.selectedSheetName ?? 'Nenhuma'}</dd>
        <dt>Score da aba</dt>
        <dd>{debug.selectedSheetScore}</dd>
        <dt>Confianca</dt>
        <dd>{debug.confidence}</dd>
        <dt>Selecao</dt>
        <dd>{debug.selectedBy}</dd>
        <dt>Bloqueio</dt>
        <dd>{debug.parseBlockedReason ?? '-'}</dd>
      </dl>

      <h3>Score de todas as abas</h3>
      {debug.sheetCandidates.length ? (
        <div className="debug-table sheet-candidates" role="table" aria-label="Score de todas as abas">
          <div role="row">
            <strong>Aba</strong>
            <strong>Hidden</strong>
            <strong>Score</strong>
            <strong>Confidence</strong>
            <strong>Positivos</strong>
            <strong>Negativos</strong>
            <strong>Motivo</strong>
          </div>
          {debug.sheetCandidates.map((candidate) => (
            <div role="row" key={candidate.sheetName}>
              <span>{candidate.sheetName}</span>
              <span>{candidate.veryHidden ? 'very hidden' : candidate.hidden ? 'hidden' : 'visible'}</span>
              <span>{candidate.score}</span>
              <span>{candidate.confidence}</span>
              <span>{candidate.positiveAnchors.map((anchor) => anchor.label).join(', ') || '-'}</span>
              <span>{candidate.negativeAnchors.map((anchor) => anchor.label).join(', ') || '-'}</span>
              <span>{candidate.rejectionReasons.join(', ') || '-'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhum score de aba calculado.</p>
      )}

      <h3>Candidatos de nome</h3>
      {debug.nameCandidates.length ? (
        <div className="debug-table name-candidates" role="table" aria-label="Candidatos de nome">
          <div role="row">
            <strong>Valor</strong>
            <strong>Celula</strong>
            <strong>Estrategia</strong>
            <strong>Distancia</strong>
            <strong>Status</strong>
          </div>
          {debug.nameCandidates.map((candidate, index) => (
            <div role="row" key={`${candidate.address}-${candidate.strategy}-${index}`} className={candidate.accepted ? 'accepted' : 'rejected'}>
              <span>{candidate.value}</span>
              <code>{candidate.address}</code>
              <span>{candidate.strategy}</span>
              <span>{candidate.distance}</span>
              <span>{candidate.accepted ? 'aceito' : candidate.rejectedReason ?? 'rejeitado'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhum candidato de nome avaliado.</p>
      )}

      <h3>Anchors encontrados</h3>
      {debug.anchorsFound.length ? (
        <div className="debug-table" role="table" aria-label="Anchors encontrados">
          <div role="row">
            <strong>Label</strong>
            <strong>Celula</strong>
            <strong>Valor</strong>
          </div>
          {debug.anchorsFound.map((anchor) => (
            <div role="row" key={`${anchor.label}-${anchor.address}`}>
              <span>{anchor.label}</span>
              <code>{anchor.address}</code>
              <span>{anchor.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhum anchor de ficha encontrado.</p>
      )}

      <h3>Celulas usadas</h3>
      {debug.extractedFields.length ? (
        <div className="debug-table" role="table" aria-label="Campos extraidos">
          <div role="row">
            <strong>Campo</strong>
            <strong>Celula</strong>
            <strong>Valor bruto</strong>
            <strong>Normalizado</strong>
            <strong>Status</strong>
          </div>
          {debug.extractedFields.map((field, index) => (
            <div role="row" key={`${field.fieldPath}-${field.cellAddress ?? 'none'}-${index}`} className={field.accepted ? 'accepted' : 'rejected'}>
              <span>{field.fieldPath}</span>
              <code>{field.cellAddress ?? '-'}</code>
              <span>{field.rawValue ?? '-'}</span>
              <span>{field.normalizedValue ?? '-'}</span>
              <span>
                {field.accepted ? 'aceito' : field.rejectedReason ?? field.reason ?? 'rejeitado'}
                {field.inheritedFromMerge ? ` | merge de ${field.mergeSourceAddress}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhuma celula extraida.</p>
      )}
    </section>
  )
}

function downloadDebugJson(debug: SheetParseDebugInfo) {
  const blob = new Blob([JSON.stringify(debug, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${debug.workbookFileName.replace(/\.[^.]+$/, '') || 'sheet'}-debug.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
