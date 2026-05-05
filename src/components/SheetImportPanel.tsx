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
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [includeHiddenSheets, setIncludeHiddenSheets] = useState(false)

  async function handleFile(file: File | null) {
    if (!file) return
    try {
      onStatus('Lendo planilha .xlsx...')
      const loadedWorkbook = await readWorkbook(file, file.name)
      const result = parseBonfireCharacterSheet(loadedWorkbook, { includeHiddenSheets, selectedTemplateId: selectedTemplateId === 'bonfire-log-v2' ? 'bonfire-log-v2' : undefined })
      setWorkbook(loadedWorkbook)
      setCandidates(result.debug.sheetCandidates)
      setRegionCandidates(result.debug.regionCandidates)
      setSelectedSheetName(result.debug.selectedSheetName ?? '')
      setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
      onImported(result)
      onStatus(
        result.debug.confidence === 'low'
          ? 'A planilha não foi reconhecida como ficha Bonfire. Verifique se você exportou a aba correta como .xlsx.'
          : `Planilha importada: ${result.character.identity.name.value || file.name}.`,
      )
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'Falha ao importar planilha.')
    }
  }

  function handleSheetSelection(sheetName: string) {
    setSelectedSheetName(sheetName)
    if (!workbook || !sheetName) return
    const result = parseBonfireCharacterSheet(workbook, { selectedSheetName: sheetName, includeHiddenSheets: true, selectedTemplateId: selectedTemplateId === 'bonfire-log-v2' ? 'bonfire-log-v2' : undefined })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
    onImported(result)
    onStatus(`Planilha reprocessada usando a aba: ${sheetName}.`)
  }

  function handleRegionSelection(value: string) {
    setSelectedRegionValue(value)
    if (!workbook || !selectedSheetName || !value) return
    const [, indexText] = value.split(':')
    const result = parseBonfireCharacterSheet(workbook, { selectedSheetName, selectedRegionIndex: Number(indexText), includeHiddenSheets: true, selectedTemplateId: selectedTemplateId === 'bonfire-log-v2' ? 'bonfire-log-v2' : undefined })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    onImported(result)
    onStatus(`Planilha reprocessada usando região candidata ${Number(indexText) + 1}.`)
  }

  function handleTemplateSelection(templateId: string) {
    setSelectedTemplateId(templateId)
    if (!workbook) return
    const result = parseBonfireCharacterSheet(workbook, {
      selectedSheetName: selectedSheetName || undefined,
      includeHiddenSheets: true,
      selectedTemplateId: templateId === 'bonfire-log-v2' ? 'bonfire-log-v2' : undefined,
    })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    setSelectedSheetName(result.debug.selectedSheetName ?? selectedSheetName)
    setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
    onImported(result)
    onStatus(templateId ? `Planilha reprocessada com template ${templateId}.` : 'Planilha reprocessada com detecção automática.')
  }

  function handleIncludeHidden(value: boolean) {
    setIncludeHiddenSheets(value)
    if (!workbook) return
    const result = parseBonfireCharacterSheet(workbook, { includeHiddenSheets: value, selectedTemplateId: selectedTemplateId === 'bonfire-log-v2' ? 'bonfire-log-v2' : undefined })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    setSelectedSheetName(result.debug.selectedSheetName ?? '')
    setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
    onImported(result)
  }

  function handleDiagnostic() {
    if (!workbook) return
    const result = parseBonfireCharacterSheet(workbook, {
      selectedSheetName: selectedSheetName || undefined,
      selectedRegionIndex: selectedRegionValue ? Number(selectedRegionValue.split(':')[1]) : undefined,
      includeHiddenSheets: true,
      selectedTemplateId: selectedTemplateId === 'bonfire-log-v2' ? 'bonfire-log-v2' : undefined,
    })
    setCandidates(result.debug.sheetCandidates)
    setRegionCandidates(result.debug.regionCandidates)
    setSelectedSheetName(result.debug.selectedSheetName ?? selectedSheetName)
    setSelectedRegionValue(regionValue(result.debug.selectedRegion, result.debug.regionCandidates))
    onImported(result)
    const parserSource = result.debug.parseBonfireLogV2SheetCalled ? 'novo' : 'antigo'
    const { character } = result
    onStatus(
      `Diagnóstico Pipkin | parser=${parserSource} (${result.debug.templateParserUsed ?? 'n/a'}) | str=${fmt(character.abilities.str.score.value)} dex=${fmt(character.abilities.dex.score.value)} con=${fmt(character.abilities.con.score.value)} int=${fmt(character.abilities.int.score.value)} wis=${fmt(character.abilities.wis.score.value)} cha=${fmt(character.abilities.cha.score.value)} | ac=${fmt(character.attributes.ac.value)} hp.max=${fmt(character.attributes.hp.max.value)} speed=${fmt(character.attributes.speed.value)} passive=${fmt(character.attributes.passivePerception.value)}`,
    )
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
            <span>Aba da ficha</span>
            <select value={selectedSheetName} onChange={(event) => handleSheetSelection(event.target.value)}>
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
            <span>Template</span>
            <select value={selectedTemplateId} onChange={(event) => handleTemplateSelection(event.target.value)}>
              <option value="">Detecção automática</option>
              <option value="bonfire-log-v2">bonfire-log-v2</option>
            </select>
          </label>
          <label className="field">
            <span>Região da ficha</span>
            <select value={selectedRegionValue} onChange={(event) => handleRegionSelection(event.target.value)} disabled={!selectedSheetName || !visibleRegionCandidates.length}>
              <option value="">Selecione uma região</option>
              {visibleRegionCandidates.map((candidate, index) => (
                <option key={`${candidate.sheetName}-${candidate.bounds.startRow}-${candidate.bounds.startCol}-${index}`} value={`${candidate.sheetName}:${index}`}>
                  {index + 1} | linhas {candidate.bounds.startRow + 1}-{candidate.bounds.endRow + 1} | cols {candidate.bounds.startCol + 1}-{candidate.bounds.endCol + 1} | score {candidate.score} | {candidate.confidence}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-toggle">
            <input type="checkbox" checked={includeHiddenSheets} onChange={(event) => handleIncludeHidden(event.target.checked)} />
            <span>Incluir abas ocultas</span>
          </label>
          <button type="button" onClick={handleDiagnostic}>
            Rodar diagnóstico Pipkin
          </button>
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

function fmt(value: unknown) {
  return value === null || value === undefined || value === '' ? 'null' : String(value)
}
