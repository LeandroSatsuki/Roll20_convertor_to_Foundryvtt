import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import type { SheetCandidate, SheetCharacterParseResult, WorkbookData } from '../lib/sheets/sheetTypes'

type SheetImportPanelProps = {
  onImported: (result: SheetCharacterParseResult) => void
  onStatus: (status: string) => void
}

export function SheetImportPanel({ onImported, onStatus }: SheetImportPanelProps) {
  const [workbook, setWorkbook] = useState<WorkbookData | null>(null)
  const [candidates, setCandidates] = useState<SheetCandidate[]>([])
  const [selectedSheetName, setSelectedSheetName] = useState('')
  const [includeHiddenSheets, setIncludeHiddenSheets] = useState(false)

  async function handleFile(file: File | null) {
    if (!file) return
    try {
      onStatus('Lendo planilha .xlsx...')
      const loadedWorkbook = await readWorkbook(file, file.name)
      const result = parseBonfireCharacterSheet(loadedWorkbook, { includeHiddenSheets })
      setWorkbook(loadedWorkbook)
      setCandidates(result.debug.sheetCandidates)
      setSelectedSheetName(result.debug.selectedSheetName ?? '')
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
    const result = parseBonfireCharacterSheet(workbook, { selectedSheetName: sheetName, includeHiddenSheets: true })
    setCandidates(result.debug.sheetCandidates)
    onImported(result)
    onStatus(`Planilha reprocessada usando a aba: ${sheetName}.`)
  }

  function handleIncludeHidden(value: boolean) {
    setIncludeHiddenSheets(value)
    if (!workbook) return
    const result = parseBonfireCharacterSheet(workbook, { includeHiddenSheets: value })
    setCandidates(result.debug.sheetCandidates)
    setSelectedSheetName(result.debug.selectedSheetName ?? '')
    onImported(result)
  }

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
          <label className="inline-toggle">
            <input type="checkbox" checked={includeHiddenSheets} onChange={(event) => handleIncludeHidden(event.target.checked)} />
            <span>Incluir abas ocultas</span>
          </label>
        </div>
      ) : null}
    </div>
  )
}
