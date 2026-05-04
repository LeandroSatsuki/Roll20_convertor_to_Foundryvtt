import { useMemo, useState } from 'react'
import { CharacterReviewPanel } from './components/CharacterReviewPanel'
import { ConversionWarnings } from './components/ConversionWarnings'
import { ExportAuditPanel } from './components/ExportAuditPanel'
import { ExportPanel } from './components/ExportPanel'
import { ExtractedTextViewer } from './components/ExtractedTextViewer'
import { FeatureResolutionPanel } from './components/FeatureResolutionPanel'
import { FoundryPreviewPanel } from './components/FoundryPreviewPanel'
import { JsonPreview } from './components/JsonPreview'
import { RuleResolutionReviewPanel } from './components/RuleResolutionReviewPanel'
import { RuleStorePanel } from './components/RuleStorePanel'
import { SourceImportPanel } from './components/SourceImportPanel'
import { buildExportAuditReport } from './lib/export/buildExportAuditReport'
import type { FoundryActor } from './lib/foundry/foundryTypes'
import type { FoundryExportAuditReport } from './lib/foundry/foundryValidationReport'
import { mapNormalizedToFoundryActor } from './lib/foundry/mapNormalizedToFoundryActor'
import { normalizedCharacterSchema } from './lib/normalize/normalizedCharacterSchema'
import type { NormalizedCharacter } from './lib/normalize/normalizedCharacterTypes'
import { extractPdfText } from './lib/pdf/extractPdfText'
import type { ExtractedPdfPage } from './lib/pdf/types'
import { parseRoll20Character } from './lib/parser/parseRoll20Character'
import type { SheetCharacterParseResult } from './lib/sheets/sheetTypes'
import { validateFoundryActor } from './lib/validation/validateFoundryActor'
import './App.css'

type Tab = 'raw' | 'normalized' | 'review' | 'rules' | 'resolution' | 'audit' | 'foundry' | 'warnings'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<ExtractedPdfPage[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('raw')
  const [character, setCharacter] = useState<NormalizedCharacter | null>(null)
  const [actor, setActor] = useState<FoundryActor | null>(null)
  const [auditReport, setAuditReport] = useState<FoundryExportAuditReport | null>(null)
  const [isExtracting, setExtracting] = useState(false)
  const [status, setStatus] = useState('')
  const [workbookMeta, setWorkbookMeta] = useState<SheetCharacterParseResult['rawWorkbookMeta'] | null>(null)

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
      setActiveTab('raw')
      setStatus(`Texto extraído de ${extracted.pages.length} página(s).`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao extrair texto do PDF.')
    } finally {
      setExtracting(false)
    }
  }

  function acceptCharacter(parsed: NormalizedCharacter, successStatus: string) {
    const mapped = mapNormalizedToFoundryActor(parsed)
    const report = buildExportAuditReport(mapped, parsed)
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
    setCharacter(parsed)
    setActor(mapped)
    setAuditReport(report)
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
    acceptCharacter(parsed, 'Conversão PDF gerada. Revise os campos destacados antes de importar no Foundry.')
    setActiveTab('review')
  }

  function handleSheetImported(result: SheetCharacterParseResult) {
    setWorkbookMeta(result.rawWorkbookMeta)
    setPages([])
    acceptCharacter(result.character, 'Planilha convertida. Revise as características resolvidas antes de exportar.')
    setActiveTab('audit')
  }

  async function handleNormalizedJsonImported(jsonFile: File) {
    try {
      const parsed = JSON.parse(await jsonFile.text()) as NormalizedCharacter
      setWorkbookMeta(null)
      setPages([])
      acceptCharacter(parsed, 'JSON normalizado importado.')
      setActiveTab('audit')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha ao importar JSON normalizado.')
    }
  }

  function handleCharacterChange(updated: NormalizedCharacter) {
    const mapped = mapNormalizedToFoundryActor(updated)
    setCharacter(updated)
    setActor(mapped)
    setAuditReport(buildExportAuditReport(mapped, updated))
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
      {workbookMeta ? <p className="status">Template: {workbookMeta.detectedTemplate} ({workbookMeta.confidence}) | Abas: {workbookMeta.sheetNames.join(', ')}</p> : null}
      <ExportPanel normalized={character} actor={actor} auditReport={auditReport} blocked={!auditReport?.importReadiness.canExport} reason={actorExportBlockedReason} />

      <nav className="tabs" aria-label="Etapas">
        {[
          ['raw', 'Texto bruto'],
          ['normalized', 'Dados normalizados'],
          ['review', 'Revisão da ficha'],
          ['rules', 'Regras Bonfire'],
          ['resolution', 'Resolução'],
          ['audit', 'Auditoria Foundry'],
          ['foundry', 'JSON Foundry'],
          ['warnings', 'Avisos'],
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
        {activeTab === 'foundry' ? <FoundryPreviewPanel actor={actor} /> : null}
        {activeTab === 'warnings' ? <ConversionWarnings warnings={character?.warnings ?? []} /> : null}
      </section>
    </main>
  )
}

export default App
