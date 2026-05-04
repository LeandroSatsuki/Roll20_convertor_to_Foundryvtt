import type { NormalizedCharacter } from '../lib/character/normalizedCharacterTypes'
import { resolveCharacterRules } from '../lib/rules/resolution/featureResolutionPipeline'
import { RuleCandidateSelector } from './RuleCandidateSelector'
import { UnresolvedRulesPanel } from './UnresolvedRulesPanel'

export function RuleResolutionReviewPanel({ character }: { character: NormalizedCharacter | null }) {
  if (!character) return <p className="empty">Importe uma ficha para revisar regras Bonfire.</p>
  const result = resolveCharacterRules(character)
  if (!result.resolutions.length) return <p className="empty">Nenhuma característica detectada.</p>
  return (
    <section>
      <div className="resolution-table">
        <div className="resolution-header">
          <span>Nome na ficha</span>
          <span>Seção</span>
          <span>Tipo detectado</span>
          <span>Regra encontrada</span>
          <span>Score</span>
          <span>Confiança</span>
          <span>Fonte</span>
          <span>Ação</span>
        </div>
        {result.resolutions.map((row) => (
          <div className={`resolution-row confidence-${row.confidence === 'unknown' ? 'low' : row.confidence}`} key={`${row.rawName}-${row.ruleId ?? row.score}`}>
            <span>{row.rawName}</span>
            <span>{character.features.find((feature) => (feature.raw || feature.name.value) === row.rawName)?.sourceType ?? '-'}</span>
            <span>{row.kind}</span>
            <span>{row.ruleId ?? 'não encontrado'}</span>
            <span>{row.score}</span>
            <span>{row.confidence}</span>
            <span>{row.sourceUrl ? <a href={row.sourceUrl}>fonte</a> : '-'}</span>
            <span>
              <RuleCandidateSelector candidates={row.candidates} />
            </span>
          </div>
        ))}
      </div>
      <UnresolvedRulesPanel entries={result.unresolvedRules} />
    </section>
  )
}
