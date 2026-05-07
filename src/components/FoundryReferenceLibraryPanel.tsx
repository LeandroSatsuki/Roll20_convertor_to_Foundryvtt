import { buildFoundryReferenceLibrary } from '../lib/foundry-library/buildFoundryReferenceLibrary'
import type { FoundryReferenceLibrary } from '../lib/foundry-library/foundryReferenceLibraryTypes'

type Props = {
  library: FoundryReferenceLibrary | null
  onLibraryLoaded: (library: FoundryReferenceLibrary | null) => void
  onStatus: (status: string) => void
}

export function FoundryReferenceLibraryPanel({ library, onLibraryLoaded, onStatus }: Props) {
  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const inputs = []
    const rejected: string[] = []
    for (const file of Array.from(files)) {
      try {
        inputs.push({ sourceFileName: file.name, actorJson: JSON.parse(await file.text()) as unknown })
      } catch {
        rejected.push(file.name)
      }
    }
    if (!inputs.length) {
      onStatus(`Nenhum Actor JSON valido foi carregado.${rejected.length ? ` Arquivos invalidos: ${rejected.join(', ')}.` : ''}`)
      return
    }
    try {
      const built = buildFoundryReferenceLibrary(inputs)
      onLibraryLoaded(built)
      onStatus(`Biblioteca Foundry carregada: ${built.report.itemsLoadedCount} item(ns) em ${built.report.filesLoadedCount} arquivo(s).${rejected.length ? ` Ignorados: ${rejected.join(', ')}.` : ''}`)
    } catch (error) {
      onStatus(error instanceof Error ? error.message : 'Falha ao carregar biblioteca Foundry.')
    }
  }

  return (
    <section className="automation-panel">
      <div className="panel-actions">
        <div>
          <h2>Biblioteca Foundry</h2>
          <p className="empty">Carregue Actor JSONs grandes apenas como fonte local de Items configurados.</p>
        </div>
        <label className="file-input">
          <span>Carregar Actor JSONs</span>
          <input type="file" accept="application/json,.json" multiple onChange={(event) => void handleFiles(event.target.files)} />
        </label>
      </div>

      {library ? (
        <>
          <div className="audit-summary">
            <span>Arquivos: {library.report.filesLoadedCount}</span>
            <span>Items: {library.report.itemsLoadedCount}</span>
            <span>Spells: {library.report.spellsLoadedCount}</span>
            <span>Feats: {library.report.featsLoadedCount}</span>
            <span>Equip.: {library.report.equipmentLoadedCount}</span>
            <span>Weapons: {library.report.weaponsLoadedCount}</span>
            <span>Consumables: {library.report.consumablesLoadedCount}</span>
            <span>Activities: {library.report.itemsWithActivitiesCount}</span>
            <span>Effects: {library.report.itemsWithEffectsCount}</span>
            <span>Midi-QOL: {library.report.itemsWithMidiCount}</span>
            <span>Plutonium: {library.report.itemsWithPlutoniumCount}</span>
          </div>
          <div className="resolution-table">
            <div className="resolution-header">
              <span>Arquivo</span>
              <span>Actor fonte</span>
              <span>Items</span>
              <span>Aceitos</span>
              <span>Ignorados</span>
            </div>
            {library.files.map((file) => (
              <div className="resolution-row" key={`${file.fileName}-${file.actorName}`}>
                <span>{file.fileName}</span>
                <span>{file.actorName}</span>
                <span>{file.itemCount}</span>
                <span>{file.acceptedItemCount}</span>
                <span>{file.rejectedItemCount}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => downloadJson('foundry-reference-library-report.json', library.report)}>
            Exportar relatório da biblioteca
          </button>
        </>
      ) : (
        <p className="empty">Nenhuma biblioteca carregada. A exportação continua usando Rule Store e builders locais.</p>
      )}
    </section>
  )
}

function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
