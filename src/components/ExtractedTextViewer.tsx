import type { ExtractedPdfPage } from '../lib/pdf/types'

export function ExtractedTextViewer({ pages }: { pages: ExtractedPdfPage[] }) {
  if (!pages.length) return <p className="empty">Nenhum texto extraído ainda.</p>
  return (
    <div className="page-list">
      {pages.map((page) => (
        <article className="text-page" key={page.pageNumber}>
          <h3>Página {page.pageNumber}</h3>
          <pre>{page.text}</pre>
        </article>
      ))}
    </div>
  )
}
