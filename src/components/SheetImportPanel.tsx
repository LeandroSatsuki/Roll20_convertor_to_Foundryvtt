import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import type { SheetCandidate, SheetCharacterParseResult, SheetRegionCandidate, WorkbookData } from '../lib/sheets/sheetTypes'

type SheetImportPanelProps = {
  onImported: (result: SheetCharacterParseResult) => void
  onStatus: (status: string) => void
}

export function SheetImportPanel({ onImported, onStatus }: SheetImportPanelProps) {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null)
  const [candidates, setCandidates] = useState<SheetCandidate[]>([])
  const [regionCandidates, setRegionCandidates] = useState<SheetRegionCandidate[]>([])
  const [selectedSheetName, setSelectedSheetName] = useState('')
  const [selectedRegionValue, setSelectedRegionValue] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<'bonfire-v2.1' | 'automatic'>('bonfire-v2.1')
  const [includeHiddenSheets, setIncludeHiddenSheets] = useState(false)

  const usingFixedTemplate = selectedTemplateId === 'bonfire-v2.1'

  function parseWorkbookSelection(loadedWorkbook: WorkbookData, overrides: { sheetName?: string; regionIndex?: number; includeHidden?: boolean; templateId?: 'bonfire-v2.1' | 'automatic' } = {}) {
    const templateId = overrides.templateId ?? selectedTemplateId
    const manualSheetName = overrides.sheetName ?? selectedSheetName ?? undefined
    return parseBonfireCharacterSheet(loadedWorkbook, {
      selectedSheetName: templateId === 'automatic' ? manualSheetName : undefined,
      selectedRegionIndex: templateId === 'automatic' ? overrides.regionIndex : undefined,
      includeHiddenSheets: templateId === 'automatic' ? (overrides.includeHidden ?? includeHiddenSheets) : false,
      selectedTemplateId: templateId,
    })
  }

  async function handleFile(file: File | null) {
    if (!file) return
    try {
      onStatus('Lendo planilha .xlsx...')
      const loadedWorkbook = await readWorkbook(file, file.name)
      const result = parseWorkbookSelection(loadedWorkbook, { templateId: selectedTemplateId })
      setWorkbook(loadedWorkbook)
      setCandidates(result.debug.sheetCandidates)
      setRegionCandidates(result.debug.regionCandidates)
      setSelectedSheetName(result.debug.selectedSheetName ?? '')
      setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
      onImported(result)
      onStatus(
        result.debug.templateUsed === 'bonfire-v2.1'
          ? `Planilha importada com Bonfire v2.1 usando ${result.debug.selectedSheets.join(', ')}.`
          : result.debug.confidence === 'low'
          ? 'A planilha nao foi reconhecida como ficha Bonfire. Verifique se voce exportou a aba correta como .xlsx.'
          : `Planilha importada: ${result.character.identity.name.value || file.name}.`,
      )
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'Falha ao importar planilha.')
    }
  }

  function handleSheetSelection(sheetName: string) {
    setSelectedSheetName(sheetName)
    if (!workbook || !sheetName) return
    const result = parseWorkbookSelection(workbook, { sheetName, includeHidden: true, templateId: 'automatic' })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
    onImported(result)
    onStatus(result.debug.confidence === 'low' ? `A aba ${sheetName} parece nao ser a ficha principal.` : `Planilha reprocessada usando a aba: ${sheetName}.`)
  }

  function handleRegionSelection(value: string) {
    setSelectedRegionValue(value)
    if (!workbook || !selectedSheetName || !value) return
    const [, indexText] = value.split(':')
    const result = parseWorkbookSelection(workbook, { sheetName: selectedSheetName, regionIndex: Number(indexText), includeHidden: true, templateId: 'automatic' })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    onImported(result)
    onStatus(result.debug.confidence === 'low' ? 'A regiao selecionada parece nao ser a ficha principal.' : `Planilha reprocessada usando regiao candidata ${Number(indexText) + 1}.`)
  }

  function handleTemplateSelection(templateId: 'bonfire-v2.1' | 'automatic') {
    setSelectedTemplateId(templateId)
    if (!workbook) return
    const result = parseWorkbookSelection(workbook, {
      sheetName: templateId === 'automatic' ? selectedSheetName || undefined : undefined,
      regionIndex: templateId === 'automatic' && selectedRegionValue ? Number(selectedRegionValue.split(':')[1]) : undefined,
      includeHidden: templateId === 'automatic' ? true : false,
      templateId,
    })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    setSelectedSheetName(result.debug.selectedSheetName ?? selectedSheetName)
    setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
    onImported(result)
    onStatus(templateId === 'bonfire-v2.1' ? 'Planilha reprocessada com o template fixo Bonfire v2.1.' : 'Planilha reprocessada com deteccao automatica.')
  }

  function handleIncludeHidden(value: boolean) {
    setIncludeHiddenSheets(value)
    if (!workbook) return
    const result = parseWorkbookSelection(workbook, { includeHidden: value, templateId: 'automatic' })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    setSelectedSheetName(result.debug.selectedSheetName ?? '')
    setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
    onImported(result)
  }

  const visibleRegionCandidates = regionCandidates.filter((candidate) => candidate.sheetName === selectedSheetName)

  return (
    <div className="sheet-import">
      <label className="file-input">
        <FileSpreadsheet size={18} aria-hidden="true" />
        <span>Importar Excel/Google Sheets (.xlsx)</span>
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
      </label>

      {workbook ? (
        <div className="sheet-selector">
          <label className="field">
            <span>Template</span>
            <select value={selectedTemplateId} onChange={(event) => handleTemplateSelection(event.target.value as 'bonfire-v2.1' | 'automatic')}>
              <option value="bonfire-v2.1">Bonfire v2.1</option>
              <option value="automatic">Automatico</option>
            </select>
          </label>
          <label className="field">
            <span>Aba da ficha</span>
            <select value={selectedSheetName} onChange={(event) => handleSheetSelection(event.target.value)} disabled={usingFixedTemplate}>
              <option value="">Selecione uma aba</option>
              {candidates
                .filter((candidate) => includeHiddenSheets || !candidate.hidden)
                .map((candidate) => (
                  <option key={candidate.sheetName} value={candidate.sheetName}>
                    {candidate.sheetName} | {candidate.hidden ? 'hidden' : 'visible'} | score {candidate.score} | {candidate.confidence} | +{candidate.positiveAnchors.length} / -{candidate.negativeAnchors.length}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Regiao da ficha</span>
            <select value={selectedRegionValue} onChange={(event) => handleRegionSelection(event.target.value)} disabled={usingFixedTemplate || !selectedSheetName || !visibleRegionCandidates.length}>
              <option value="">Selecione uma regiao</option>
              {visibleRegionCandidates.map((candidate, index) => (
                <option key={`${candidate.sheetName}-${candidate.bounds.startRow}-${candidate.bounds.startCol}-${index}`} value={`${candidate.sheetName}:${index}`}>
                  {index + 1} | {candidate.regionName} | linhas {candidate.bounds.startRow + 1}-{candidate.bounds.endRow + 1} | cols {candidate.bounds.startCol + 1}-{candidate.bounds.endCol + 1} | score {candidate.score} | {candidate.confidence} | +{candidate.positiveAnchors.length} / -{candidate.negativeAnchors.length}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-toggle">
            <input type="checkbox" checked={includeHiddenSheets} onChange={(event) => handleIncludeHidden(event.target.checked)} disabled={usingFixedTemplate} />
            <span>Incluir abas ocultas</span>
          </label>
          {usingFixedTemplate ? <p className="field-hint">O template fixo usa somente as abas LOG, Personagem e Magias. Abas auxiliares sao ignoradas.</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function regionValue(region: SheetRegionCandidate | undefined, candidates: SheetRegionCandidate[]): string {
  if (!region) return ''
  const index = candidates
    .filter((candidate) => candidate.sheetName === region.sheetName)
    .findIndex(
      (candidate) =>
        candidate.bounds.startRow === region.bounds.startRow &&
        candidate.bounds.endRow === region.bounds.endRow &&
        candidate.bounds.startCol === region.bounds.startCol &&
        candidate.bounds.endCol === region.bounds.endCol,
    )
  return index >= 0 ? `${region.sheetName}:${index}` : ''
}
