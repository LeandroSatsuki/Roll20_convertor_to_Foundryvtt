import { defaultBonfireEntityRuleStore } from '../lib/rules/store/bonfireRuleStore'

export function RuleStorePanel() {
  const entities = defaultBonfireEntityRuleStore.entities
  const count = (kind: string) => entities.filter((entity) => entity.kind === kind).length
  return (
    <section className="rule-store-panel">
      <h3>Regras Bonfire</h3>
      <div className="audit-summary">
        <span>Total: {entities.length}</span>
        <span>Classes: {count('class')}</span>
        <span>Raças: {count('race')}</span>
        <span>Talentos: {entities.filter((entity) => ['feat', 'originFeat', 'racialFeat'].includes(entity.kind)).length}</span>
        <span>Equipamentos: {entities.filter((entity) => ['weapon', 'armor', 'equipment', 'consumable'].includes(entity.kind)).length}</span>
        <span>Magias/overrides: {count('spellOverride')}</span>
      </div>
    </section>
  )
}

