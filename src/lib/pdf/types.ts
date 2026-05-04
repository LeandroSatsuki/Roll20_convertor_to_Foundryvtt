export type ExtractedPdfPage = {
  pageNumber: number
  text: string
}

export type ExtractedPdfText = {
  fileName: string
  pages: ExtractedPdfPage[]
  combinedText: string
}
