import { useMemo, useState } from 'react'
import { CharacterReviewPanel } from './components/CharacterReviewPanel'
import { ConversionWarnings } from './components/ConversionWarnings'
import { ExportAuditPanel } from './components/ExportAuditPanel'
import { ExportPanel } from './components/ExportPanel'
import { ExtractedTextViewer } from './components/ExtractedTextViewer'
import { FeatureResolutionPanel } from './components/FeatureResolutionPanel'
import { FoundryPreviewPanel } from './components/FoundryPreviewPanel'
import { ItemAutomationPanel } from './components/ItemAutomationPanel'
import { JsonPreview } from './components/JsonPreview'
import { RuleResolutionReviewPanel } from './components/RuleResolutionReviewPanel'
import { RuleStorePanel } from './components/RuleStorePanel'
import { SheetParseDebugPanel } from './components/SheetParseDebugPanel'
import { SourceImportPanel } from './components/SourceImportPanel'
import { normalizedCharacterSchema } from './lib/normalize/normalizedCharacterSchema'
import type { NormalizedCharacter } from './lib/normalize/normalizedCharacterTypes'
import { buildConversionBundle, type ConversionBundle } from './lib/pipeline/buildConversionBundle'
import { extractPdfText } from './lib/pdf/extractPdfText'
import type { ExtractedPdfPage } from './lib/pdf/types'
import { parseRoll20Character } from './lib/parser/parseRoll20Character'
import type { SheetCharacterParseResult, SheetParseDebugInfo } from './lib/sheets/sheetTypes'
import { validateFoundryActor } from './lib/validation/validateFoundryActor'
import './App.css'

type Tab = 'raw' | 'normalized' | 'review' | 'rules' | 'resolution' | 'audit' | 'itemAutomation' | 'foundry' | 'warnings' | 'sheetDebug'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<ExtractedPdfPage[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('raw')
  const [conversion, setConversion] = useState<ConversionBundle | null>(null)
  const [isExtracting, setExtracting] = useState(false)
  const [status, setStatus] = useState('')
  const [workbookMeta, setWorkbookMeta] = useState<SheetCharacterParseResult['rawWorkbookMeta'] | null>(null)
  const [sheetDebug, setSheetDebug] = useState<SheetParseDebugInfo | null>(null)
  const character = conversion?.normalized ?? null
  const actor = conversion?.actor ?? null
  const auditReport = conversion?.audit ?? null

  const combinedText = useMemo(() => pages.map((page) => page.text).join('\n\n'), [pages])
  const actorExportBlockedReason = auditReport?.importReadiness.blockingReasons.join('\n') || undefined

  async function handleExtract() {
    if (!file) return
    setExtracting(true)
    setStatus('')
    try {
      const extracted = await extractPdfText(file)
      setPages(extracted.pages)
      setWorkbookMeta(null)
      setSheetDebug(null)
      setActiveTab('raw')
      setStatus(`Texto extraído de ${extracted.pages.length} página(s).`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao extrair texto do PDF.')
    } finally {
      setExtracting(false)
    }
  }

  function acceptCharacter(parsed: NormalizedCharacter, successStatus: string, debugOverride: SheetParseDebugInfo | null = null) {
    const bundle = buildConversionBundle(parsed, debugOverride)
    const mapped = bundle.actor
    const report = bundle.audit
    const actorValidation = validateFoundryActor(mapped)
    if (!report.importReadiness.canExport) {
      parsed.warnings.push({
        code: 'FOUNDRY_EXPORT_BLOCKED',
        severity: 'error',
        message: `Exportação bloqueada: ${report.importReadiness.blockingReasons.join('; ')}`,
        fieldPath: 'foundryAudit',
      })
      setStatus('Exportação bloqueada: veja a aba Auditoria Foundry.')
    } else if (!actorValidation.success) {
      setStatus('O Actor Foundry gerou erros de validação básica.')
    } else {
      setStatus(successStatus)
    }
    setConversion(bundle)
    setSheetDebug(bundle.debug)
  }

  function handleConvert() {
    if (!combinedText.trim() || !file) {
      setStatus('Extraia o texto do PDF antes de converter.')
      return
    }
    const parsed = parseRoll20Character(combinedText, { fileName: file.name, pages })
    const normalizedValidation = normalizedCharacterSchema.safeParse(parsed)
    if (!normalizedValidation.success) {
      setStatus('O modelo normalizado gerou erros de validação. Veja os dados normalizados para revisar.')
    }
    setSheetDebug(null)
    acceptCharacter(parsed, 'Conversão PDF gerada. Revise os campos destacados antes de importar no Foundry.', null)
    setActiveTab('review')
  }

  function handleSheetImported(result: SheetCharacterParseResult) {
    setWorkbookMeta(result.rawWorkbookMeta)
    setSheetDebug(result.debug)
    setPages([])
    const bundle = buildConversionBundle(result.character, result.debug)
    const actorValidation = validateFoundryActor(bundle.actor)
    if (!bundle.audit.importReadiness.canExport) {
      bundle.normalized.warnings.push({
        code: 'FOUNDRY_EXPORT_BLOCKED',
        severity: 'error',
        message: `Exportação bloqueada: ${bundle.audit.importReadiness.blockingReasons.join('; ')}`,
        fieldPath: 'foundryAudit',
      })
      setStatus('Exportação bloqueada: veja a aba Auditoria Foundry.')
    } else if (!actorValidation.success) {
      setStatus('O Actor Foundry gerou erros de validação básica.')
    } else {
      setStatus('Planilha convertida. Revise as características resolvidas antes de exportar.')
    }
    setConversion(bundle)
    setSheetDebug(bundle.debug)
    setActiveTab(result.debug.confidence === 'low' ? 'sheetDebug' : 'audit')
  }

  async function handleNormalizedJsonImported(jsonFile: File) {
    try {
      const parsed = JSON.parse(await jsonFile.text()) as NormalizedCharacter
      setWorkbookMeta(null)
      const bundle = buildConversionBundle(parsed, null)
      setSheetDebug(null)
      setPages([])
      setConversion(bundle)
      setStatus('JSON normalizado importado.')
      setActiveTab('audit')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao importar JSON normalizado.')
    }
  }

  function handleCharacterChange(updated: NormalizedCharacter) {
    const bundle = buildConversionBundle(updated, sheetDebug)
    setConversion(bundle)
    setSheetDebug(bundle.debug)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Roll20 to Foundry Converter</h1>
          <p>Excel/Google Sheets, PDF fallback e JSON normalizado para Actor Foundry dnd5e.</p>
        </div>
        <button type="button" onClick={handleConvert} disabled={!pages.length}>
          Converter PDF
        </button>
      </header>

      <SourceImportPanel
        file={file}
        onPdfFileChange={setFile}
        onPdfExtract={handleExtract}
        isExtracting={isExtracting}
        onSheetImported={handleSheetImported}
        onStatus={setStatus}
        onNormalizedJsonImported={(jsonFile) => void handleNormalizedJsonImported(jsonFile)}
      />

      {status ? <p className="status">{status}</p> : null}
      {workbookMeta ? (
        <p className="status">
          Template: {workbookMeta.templateId ?? workbookMeta.detectedTemplate} ({workbookMeta.confidence}) | Aba escolhida: {workbookMeta.selectedSheetName ?? 'nenhuma'} | Score: {workbookMeta.selectedSheetScore} | Anchors:{' '}
          {workbookMeta.anchorsFound.map((anchor) => `${anchor.label} ${anchor.address}`).join(', ') || 'nenhum'}
        </p>
      ) : null}
      <ExportPanel normalized={character} actor={actor} auditReport={auditReport} debug={sheetDebug} blocked={!auditReport?.importReadiness.canExport} reason={actorExportBlockedReason} />

      <nav className="tabs" aria-label="Etapas">
        {[
          ['raw', 'Texto bruto'],
          ['normalized', 'Dados normalizados'],
          ['review', 'Revisão da ficha'],
          ['rules', 'Regras Bonfire'],
          ['resolution', 'Resolução'],
          ['audit', 'Auditoria Foundry'],
          ['itemAutomation', 'Automação dos Itens'],
          ['foundry', 'JSON Foundry'],
          ['warnings', 'Avisos'],
          ['sheetDebug', 'Debug planilha'],
        ].map(([id, label]) => (
          <button className={activeTab === id ? 'active' : ''} type="button" key={id} onClick={() => setActiveTab(id as Tab)}>
            {label}
          </button>
        ))}
      </nav>

      <section className="panel">
        {activeTab === 'raw' ? <ExtractedTextViewer pages={pages} /> : null}
        {activeTab === 'normalized' ? <JsonPreview value={character} /> : null}
        {activeTab === 'review' ? <CharacterReviewPanel character={character} onChange={handleCharacterChange} /> : null}
        {activeTab === 'rules' ? <RuleStorePanel /> : null}
        {activeTab === 'resolution' ? (
          <>
            <FeatureResolutionPanel character={character} />
            <RuleResolutionReviewPanel character={character} />
          </>
        ) : null}
        {activeTab === 'audit' ? <ExportAuditPanel report={auditReport} /> : null}
        {activeTab === 'itemAutomation' ? <ItemAutomationPanel actor={actor} /> : null}
        {activeTab === 'foundry' ? <FoundryPreviewPanel actor={actor} /> : null}
        {activeTab === 'warnings' ? <ConversionWarnings warnings={character?.warnings ?? []} /> : null}
        {activeTab === 'sheetDebug' ? <SheetParseDebugPanel debug={sheetDebug} /> : null}
      </section>
    </main>
  )
}

export default App
