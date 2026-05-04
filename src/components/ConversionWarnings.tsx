import type { ConversionWarning } from '../lib/normalize/normalizedCharacterTypes'

export function ConversionWarnings({ warnings }: { warnings: ConversionWarning[] }) {
  if (!warnings.length) return <p className="empty">Nenhum aviso.</p>
  return (
    <div className="warnings">
      {warnings.map((warning, index) => (
        <article className={`warning ${warning.severity}`} key={`${warning.code}-${index}`}>
          <strong>{warning.code}</strong>
          <p>{warning.message}</p>
          {warning.fieldPath ? <small>{warning.fieldPath}</small> : null}
        </article>
      ))}
    </div>
  )
}
