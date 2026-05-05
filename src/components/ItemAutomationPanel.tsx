import type { FoundryActor } from '../lib/foundry/foundryTypes'
import { getItemAutomationMeta } from '../lib/foundry/items'

export function ItemAutomationPanel({ actor }: { actor: FoundryActor | null }) {
  if (!actor) return <p className="empty">Gere um Actor para revisar a automação dos itens.</p>

  return (
    <section className="automation-panel">
      <header className="panel-actions">
        <div>
          <h2>Automação dos Itens</h2>
          <p className="empty">Mostra quais itens receberam estrutura funcional e quais ficaram em revisão manual.</p>
        </div>
      </header>
      <div className="automation-list">
        {actor.items.map((item) => {
          const automation = getItemAutomationMeta(item)
          const warnings = automation?.warnings ?? []
          return (
            <article className={`automation-card ${automation?.level ?? 'none'}`} key={item._id}>
              <div className="automation-card-header">
                <strong>{item.name}</strong>
                <span>{item.type}</span>
                <span>automação {automation?.level ?? 'none'}</span>
              </div>
              <p>Activities: {(automation?.activitiesCreated ?? []).map((activity) => `${activity.type}:${activity.name}`).join(', ') || 'nenhuma'}</p>
              <p>Uses: {automation?.usesConfigured ? 'sim' : 'não'} | Recovery: {automation?.recoveryConfigured ? 'sim' : 'não'}</p>
              {warnings.length ? (
                <div className="automation-warnings">
                  {warnings.map((warning) => (
                    <small key={warning}>{warning}</small>
                  ))}
                </div>
              ) : (
                <small>Sem warnings de automação.</small>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
