import type { ExtractedPdfText } from './types'

export async function extractPdfText(file: File): Promise<ExtractedPdfText> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join('\n')
    pages.push({ pageNumber, text })
  }

  return {
    fileName: file.name,
    pages,
    combinedText: pages.map((page) => `--- PAGE ${page.pageNumber} ---\n${page.text}`).join('\n\n'),
  }
}
