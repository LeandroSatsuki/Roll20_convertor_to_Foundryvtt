import type { NormalizedCharacter } from '../lib/character/normalizedCharacterTypes'
import { resolveFeature } from '../lib/rules/featureResolver'

export function FeatureResolutionPanel({ character }: { character: NormalizedCharacter | null }) {
  if (!character) return <p className="empty">Importe uma ficha para resolver características.</p>
  const context = {
    className: character.identity.classes[0]?.name,
    level: character.identity.classes[0]?.level,
    race: character.identity.race.value,
    background: character.identity.background.value,
    subclass: character.identity.classes[0]?.subclass,
  }
  const rows = character.features.map((feature) => resolveFeature(feature.raw || feature.name.value, { ...context, section: feature.sourceType }))

  if (!rows.length) return <p className="empty">Nenhuma característica detectada.</p>

  return (
    <div className="resolution-table">
      <div className="resolution-header">
        <span>Nome na ficha</span>
        <span>Tipo detectado</span>
        <span>Regra encontrada</span>
        <span>Score</span>
        <span>Confiança</span>
        <span>Warning</span>
      </div>
      {rows.map((row) => (
        <div className={`resolution-row confidence-${row.confidence}`} key={`${row.rawName}-${row.identifier}`}>
          <span>{row.rawName}</span>
          <span>{row.kind}</span>
          <span>{row.ruleId ?? 'não encontrado'}</span>
          <span>{row.score ?? 0}</span>
          <span>{row.confidence}</span>
          <span>{row.warnings.map((warning) => warning.message).join(' ')}</span>
        </div>
      ))}
    </div>
  )
}
