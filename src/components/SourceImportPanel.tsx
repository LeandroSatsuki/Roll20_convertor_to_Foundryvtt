import type { SheetCharacterParseResult } from '../lib/sheets/sheetTypes'
import { PdfUploader } from './PdfUploader'
import { SheetImportPanel } from './SheetImportPanel'

type SourceImportPanelProps = {
  file: File | null
  onPdfFileChange: (file: File | null) => void
  onPdfExtract: () => void
  onPdfConvert: () => void
  canConvertPdf: boolean
  isExtracting: boolean
  onSheetImported: (result: SheetCharacterParseResult) => void
  onStatus: (status: string) => void
  onNormalizedJsonImported: (file: File) => void
}

export function SourceImportPanel({ file, onPdfFileChange, onPdfExtract, onPdfConvert, canConvertPdf, isExtracting, onSheetImported, onStatus, onNormalizedJsonImported }: SourceImportPanelProps) {
  return (
    <section className="source-panel">
      <div>
        <h2>Fonte principal</h2>
        <SheetImportPanel onImported={onSheetImported} onStatus={onStatus} />
      </div>
      <details>
        <summary>Avançado / Debug</summary>
        <div>
          <h2>PDF fallback (avançado)</h2>
          <PdfUploader file={file} onFileChange={onPdfFileChange} onExtract={onPdfExtract} isExtracting={isExtracting} />
          <button type="button" onClick={onPdfConvert} disabled={!canConvertPdf}>
            Converter PDF (avançado)
          </button>
        </div>
        <div>
          <h2>JSON normalizado (debug)</h2>
          <label className="file-input">
            <span>Importar JSON normalizado</span>
            <input type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && onNormalizedJsonImported(event.target.files[0])} />
          </label>
        </div>
      </details>
    </section>
  )
}
