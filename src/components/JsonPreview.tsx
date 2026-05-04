export function JsonPreview({ value }: { value: unknown }) {
  return <pre className="json-preview">{value ? JSON.stringify(value, null, 2) : 'Ainda não gerado.'}</pre>
}
