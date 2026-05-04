import { FileSpreadsheet } from 'lucide-react'
import { readWorkbook } from '../lib/sheets/readWorkbook'
import { parseBonfireCharacterSheet } from '../lib/sheets/parseBonfireCharacterSheet'
import type { SheetCharacterParseResult } from '../lib/sheets/sheetTypes'

type SheetImportPanelProps = {
  onImported: (result: SheetCharacterParseResult) => void
  onStatus: (status: string) => void
}

export function SheetImportPanel({ onImported, onStatus }: SheetImportPanelProps) {
  async function handleFile(file: File | null) {
    if (!file) return
    try {
      onStatus('Lendo planilha .xlsx...')
      const workbook = await readWorkbook(file, file.name)
      const result = parseBonfireCharacterSheet(workbook)
      onImported(result)
      onStatus(`Planilha importada: ${result.character.identity.name.value || file.name}.`)
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'Falha ao importar planilha.')
    }
  }

  return (
    <label className="file-input">
      <FileSpreadsheet size={18} aria-hidden="true" />
      <span>Importar Excel/Google Sheets (.xlsx)</span>
      <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
    </label>
  )
}
