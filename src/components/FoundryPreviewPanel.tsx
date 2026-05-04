import { JsonPreview } from './JsonPreview'

export function FoundryPreviewPanel({ actor }: { actor: unknown }) {
  return <JsonPreview value={actor} />
}
