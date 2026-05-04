import { FileUp } from 'lucide-react'

type PdfUploaderProps = {
  file: File | null
  onFileChange: (file: File | null) => void
  onExtract: () => void
  isExtracting: boolean
}

export function PdfUploader({ file, onFileChange, onExtract, isExtracting }: PdfUploaderProps) {
  return (
    <section className="toolbar">
      <label className="file-input">
        <FileUp size={18} aria-hidden="true" />
        <span>{file ? file.name : 'Selecionar PDF Roll20'}</span>
        <input type="file" accept="application/pdf" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
      </label>
      <button type="button" onClick={onExtract} disabled={!file || isExtracting}>
        {isExtracting ? 'Extraindo...' : 'Extrair texto'}
      </button>
    </section>
  )
}
