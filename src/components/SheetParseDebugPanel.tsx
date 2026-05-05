import type { AnchorHit, SheetParseDebugInfo, SheetRegionCandidate } from '../lib/sheets/sheetTypes'

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
        <dt>Parser version</dt>
        <dd>{debug.parserVersion}</dd>
        <dt>Parser build</dt>
        <dd>{debug.parserBuildId}</dd>
        <dt>Generated at</dt>
        <dd>{debug.generatedAt}</dd>
        <dt>Source marker</dt>
        <dd>{debug.sourceCodeMarker}</dd>
        <dt>Abas encontradas</dt>
        <dd>{debug.sheetNames.join(', ') || 'Nenhuma'}</dd>
        <dt>Template</dt>
        <dd>{debug.templateUsed ?? debug.templateId ?? 'auto'}</dd>
        <dt>Modo de leitura</dt>
        <dd>{debug.readMode ?? '-'}</dd>
        <dt>Abas usadas</dt>
        <dd>{debug.selectedSheets.join(', ') || 'Nenhuma'}</dd>
        <dt>Abas ignoradas</dt>
        <dd>{debug.ignoredSheets.join(', ') || 'Nenhuma'}</dd>
        <dt>Template parser</dt>
        <dd>{debug.templateParserUsed ?? '-'}</dd>
        <dt>parseBonfireLogV2Sheet</dt>
        <dd>{String(debug.parseBonfireLogV2SheetCalled)}</dd>
        <dt>Aba escolhida</dt>
        <dd>{debug.selectedSheetName ?? 'Nenhuma'}</dd>
        <dt>Regiao escolhida</dt>
        <dd>{debug.selectedRegion ? `${debug.selectedRegion.regionName} | ${formatBounds(debug.selectedRegion)}` : 'Nenhuma'}</dd>
        <dt>Score</dt>
        <dd>{debug.selectedSheetScore}</dd>
        <dt>Confianca</dt>
        <dd>{debug.confidence}</dd>
        <dt>Selecao</dt>
        <dd>{debug.selectedBy}</dd>
        <dt>Bloqueio</dt>
        <dd>{debug.parseBlockedReason ?? '-'}</dd>
      </dl>

      <h3>Regiao selecionada</h3>
      {debug.selectedRegion ? (
        <div className="debug-table" role="table" aria-label="Regiao selecionada">
          <div role="row">
            <strong>Regiao</strong>
            <strong>Bounds</strong>
            <strong>Positivos</strong>
            <strong>Negativos</strong>
            <strong>Ignorados fora</strong>
            <strong>Ignorados por contexto</strong>
          </div>
          <div role="row">
            <span>{debug.selectedRegion.regionName}</span>
            <code>{formatBounds(debug.selectedRegion)}</code>
            <span>{formatAnchorList(debug.selectedRegion.positiveAnchors)}</span>
            <span>{formatAnchorList(debug.selectedRegion.negativeAnchors)}</span>
            <span>{formatAnchorList(debug.selectedRegion.ignoredOutsideRegion ?? [])}</span>
            <span>{formatAnchorList(debug.selectedRegion.ignoredNegativeAnchors ?? [], true)}</span>
          </div>
        </div>
      ) : (
        <p className="empty">Nenhuma regiao selecionada.</p>
      )}

      <h3>Regioes candidatas</h3>
      {debug.regionCandidates.length ? (
        <div className="debug-table sheet-candidates" role="table" aria-label="Regioes candidatas">
          <div role="row">
            <strong>Aba</strong>
            <strong>Regiao</strong>
            <strong>Bounds</strong>
            <strong>Score</strong>
            <strong>Confidence</strong>
            <strong>Positivos</strong>
            <strong>Negativos</strong>
            <strong>Ignorados fora</strong>
            <strong>Motivo</strong>
          </div>
          {debug.regionCandidates.map((candidate, index) => (
            <div role="row" key={`${candidate.sheetName}-${candidate.regionName}-${candidate.bounds.startRow}-${candidate.bounds.startCol}-${index}`}>
              <span>{candidate.sheetName}</span>
              <span>{candidate.regionName}</span>
              <code>{formatBounds(candidate)}</code>
              <span>{candidate.score}</span>
              <span>{candidate.confidence}</span>
              <span>{formatAnchorList(candidate.positiveAnchors)}</span>
              <span>{formatAnchorList(candidate.negativeAnchors)}</span>
              <span>{formatAnchorList(candidate.ignoredOutsideRegion ?? [])}</span>
              <span>{candidate.rejectionReasons.join(', ') || '-'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhuma regiao candidata calculada.</p>
      )}

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

      <h3>Anchors deduplicadas por merge</h3>
      {debug.discardedDuplicateAnchors.length ? (
        <div className="debug-table" role="table" aria-label="Anchors deduplicadas">
          <div role="row">
            <strong>Label</strong>
            <strong>Celula</strong>
            <strong>Origem do merge</strong>
          </div>
          {debug.discardedDuplicateAnchors.map((anchor) => (
            <div role="row" key={`${anchor.label}-${anchor.address}`}>
              <span>{anchor.label}</span>
              <code>{anchor.address}</code>
              <span>{anchor.mergeSourceAddress ?? '-'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhuma anchor descartada por merge duplicado.</p>
      )}

      <h3>Blocked name matches</h3>
      {debug.blockedNameMatches.length ? (
        <div className="debug-table" role="table" aria-label="Blocked name matches">
          <div role="row">
            <strong>Valor</strong>
            <strong>Normalizado</strong>
            <strong>Motivo</strong>
          </div>
          {debug.blockedNameMatches.map((entry, index) => (
            <div role="row" key={`${entry.normalizedValue}-${index}`}>
              <span>{entry.value}</span>
              <span>{entry.normalizedValue}</span>
              <span>{entry.reason}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhum match de nome bloqueado.</p>
      )}

      <h3>Ability Block Candidates</h3>
      {debug.abilityBlockCandidates.length ? (
        <div className="debug-table" role="table" aria-label="Ability block candidates">
          <div role="row">
            <strong>Atributo</strong>
            <strong>Label</strong>
            <strong>Candidatos</strong>
            <strong>Selecionada</strong>
          </div>
          {debug.abilityBlockCandidates.map((entry) => (
            <div role="row" key={`${entry.ability}-${entry.labelAddress ?? 'none'}`}>
              <span>{entry.ability}</span>
              <code>{entry.labelAddress ?? '-'}</code>
              <span>{entry.candidateCells.map((cell) => `${cell.address ?? '-'}=${cell.rawValue ?? '-'} (${cell.accepted ? 'ok' : cell.rejectedReason ?? 'rej'})`).join(', ')}</span>
              <code>{entry.selectedCell ?? '-'}</code>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhum candidato do bloco de atributos registrado.</p>
      )}

      <h3>Negativos ignorados fora da regiao</h3>
      {debug.ignoredOutsideRegion.length ? (
        <div className="debug-table" role="table" aria-label="Negativos ignorados fora da regiao">
          <div role="row">
            <strong>Label</strong>
            <strong>Celula</strong>
            <strong>Valor</strong>
            <strong>Motivo</strong>
          </div>
          {debug.ignoredOutsideRegion.map((anchor) => (
            <div role="row" key={`${anchor.label}-${anchor.address}`}>
              <span>{anchor.label}</span>
              <code>{anchor.address}</code>
              <span>{anchor.value}</span>
              <span>{anchor.ignoredReason ?? 'fora da regiao'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhum negativo ignorado fora da regiao.</p>
      )}

      <h3>Campos finais aplicados</h3>
      {debug.finalExtractedFields.length ? (
        <div className="debug-table" role="table" aria-label="Campos extraidos">
          <div role="row">
            <strong>Campo</strong>
            <strong>Tipo</strong>
            <strong>Origem</strong>
            <strong>Aba</strong>
            <strong>Endereco</strong>
            <strong>Valor bruto</strong>
            <strong>Valor parseado</strong>
            <strong>Normalizado</strong>
            <strong>Status</strong>
          </div>
          {debug.finalExtractedFields.map((field, index) => (
            <div role="row" key={`${field.fieldPath}-${field.cellAddress ?? 'none'}-${index}`} className={field.accepted ? 'accepted' : 'rejected'}>
              <span>{field.fieldPath}</span>
              <span>{field.sourceType ?? '-'}</span>
              <code>{field.source ?? '-'}</code>
              <span>{field.resolvedSheet ?? '-'}</span>
              <code>{field.resolvedAddress ?? field.cellAddress ?? '-'}</code>
              <span>{field.rawValue ?? '-'}</span>
              <span>{field.parsedValue ?? '-'}</span>
              <span>{field.normalizedValue ?? '-'}</span>
              <span>
                {field.accepted ? 'aceito' : field.rejectedReason ?? field.reason ?? 'rejeitado'}
                {field.issueCode ? ` | ${field.issueCode}` : ''}
                {field.inheritedFromMerge ? ` | merge de ${field.mergeSourceAddress}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhuma celula extraida.</p>
      )}

      <h3>Tentativas de extracao</h3>
      {debug.extractionAttempts.length ? (
        <div className="debug-table" role="table" aria-label="Tentativas de extracao">
          <div role="row">
            <strong>Campo</strong>
            <strong>Tipo</strong>
            <strong>Origem</strong>
            <strong>Aba</strong>
            <strong>Endereco</strong>
            <strong>Valor bruto</strong>
            <strong>Valor parseado</strong>
            <strong>Normalizado</strong>
            <strong>Status</strong>
          </div>
          {debug.extractionAttempts.map((field, index) => (
            <div role="row" key={`${field.fieldPath}-${field.cellAddress ?? 'none'}-${index}`} className={field.accepted ? 'accepted' : 'rejected'}>
              <span>{field.fieldPath}</span>
              <span>{field.sourceType ?? '-'}</span>
              <code>{field.source ?? '-'}</code>
              <span>{field.resolvedSheet ?? '-'}</span>
              <code>{field.resolvedAddress ?? field.cellAddress ?? '-'}</code>
              <span>{field.rawValue ?? '-'}</span>
              <span>{field.parsedValue ?? '-'}</span>
              <span>{field.normalizedValue ?? '-'}</span>
              <span>
                {field.accepted ? 'aceito' : field.rejectedReason ?? field.reason ?? 'rejeitado'}
                {field.issueCode ? ` | ${field.issueCode}` : ''}
                {field.inheritedFromMerge ? ` | merge de ${field.mergeSourceAddress}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Nenhuma tentativa registrada.</p>
      )}
    </section>
  )
}

function formatBounds(region: SheetRegionCandidate | { bounds: { startRow: number; endRow: number; startCol: number; endCol: number } }) {
  const bounds = 'bounds' in region ? region.bounds : region
  return `L${bounds.startRow + 1}-L${bounds.endRow + 1}, C${bounds.startCol + 1}-C${bounds.endCol + 1}`
}

function formatAnchorList(anchors: AnchorHit[], showIgnoredReason = false) {
  return anchors.map((anchor) => `${anchor.label} ${anchor.address}${showIgnoredReason && anchor.ignoredReason ? ` (${anchor.ignoredReason})` : ''}`).join(', ') || '-'
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
