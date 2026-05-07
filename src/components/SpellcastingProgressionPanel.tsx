import type { NormalizedCharacter } from '../lib/normalize/normalizedCharacterTypes'
import { calculateSpellSlots } from '../lib/spellcasting/calculateSpellSlots'
import { inferSpellcastingAbility } from '../lib/spellcasting/inferSpellcastingAbility'

export function SpellcastingProgressionPanel({ character }: { character: NormalizedCharacter | null }) {
  if (!character) return <p className="empty">Converta uma ficha para calcular progressão de magia.</p>
  const slots = calculateSpellSlots(character)
  const ability = inferSpellcastingAbility(character)
  return (
    <section className="automation-panel">
      <h2>Progressão de Magia</h2>
      <div className="audit-summary">
        <span>Classe: {character.identity.classes[0]?.name ?? '-'}</span>
        <span>Nível: {character.identity.classes[0]?.level ?? '-'}</span>
        <span>Tipo: {slots.spellcastingType}</span>
        <span>Habilidade: {ability ?? '-'}</span>
        <span>Fonte: {slots.source}</span>
      </div>
      <div className="audit-summary">
        {slots.levels.map((value, index) => (
          <span key={`spell-${index + 1}`}>
            spell{index + 1}: {value}
          </span>
        ))}
        {slots.pact ? <span>Pact: {slots.pact.value} nível {slots.pact.level}</span> : null}
      </div>
      {slots.warnings.length ? <p className="status">Avisos: {slots.warnings.join(', ')}</p> : null}
    </section>
  )
}
