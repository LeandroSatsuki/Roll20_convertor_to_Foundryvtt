import type { NormalizedCharacter, SkillKey } from '../lib/normalize/normalizedCharacterTypes'

type CharacterReviewFormProps = {
  character: NormalizedCharacter | null
  onChange: (character: NormalizedCharacter) => void
}

const abilityLabels = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' }

export function CharacterReviewForm({ character, onChange }: CharacterReviewFormProps) {
  if (!character) return <p className="empty">Converta o texto para revisar os campos.</p>

  const update = (recipe: (draft: NormalizedCharacter) => void) => {
    const draft = structuredClone(character)
    recipe(draft)
    onChange(draft)
  }

  return (
    <form className="review-form">
      <fieldset>
        <legend>Identidade</legend>
        <Field label="Nome" value={character.identity.name.value} confidence={character.identity.name.confidence} onChange={(value) => update((draft) => void (draft.identity.name.value = value))} />
        <Field label="Classe" value={character.identity.classText.value} confidence={character.identity.classText.confidence} onChange={(value) => update((draft) => void (draft.identity.classText.value = value))} />
        <Field label="Raça" value={character.identity.race.value} confidence={character.identity.race.confidence} onChange={(value) => update((draft) => void (draft.identity.race.value = value))} />
        <Field label="Antecedente" value={character.identity.background.value} confidence={character.identity.background.confidence} onChange={(value) => update((draft) => void (draft.identity.background.value = value))} />
        <Field label="Alinhamento" value={character.identity.alignment.value} confidence={character.identity.alignment.confidence} onChange={(value) => update((draft) => void (draft.identity.alignment.value = value))} />
      </fieldset>

      <fieldset>
        <legend>Atributos</legend>
        <div className="grid six">
          {(Object.keys(abilityLabels) as Array<keyof typeof abilityLabels>).map((key) => (
            <NumberField key={key} label={abilityLabels[key]} value={character.abilities[key].score.value} confidence={character.abilities[key].score.confidence} onChange={(value) => update((draft) => void (draft.abilities[key].score.value = value))} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Combate</legend>
        <div className="grid four">
          <NullableNumberField label="CA" value={character.attributes.ac.value} confidence={character.attributes.ac.confidence} onChange={(value) => update((draft) => void (draft.attributes.ac.value = value))} />
          <NullableNumberField label="Iniciativa" value={character.attributes.initiative.value} confidence={character.attributes.initiative.confidence} onChange={(value) => update((draft) => void (draft.attributes.initiative.value = value))} />
          <NullableNumberField label="PV máximo" value={character.attributes.hp.max.value} confidence={character.attributes.hp.max.confidence} onChange={(value) => update((draft) => void (draft.attributes.hp.max.value = value))} />
          <NullableNumberField label="Deslocamento" value={character.attributes.speed.value} confidence={character.attributes.speed.confidence} onChange={(value) => update((draft) => void (draft.attributes.speed.value = value))} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Perícias</legend>
        <div className="skill-grid">
          {(Object.keys(character.skills) as SkillKey[]).map((key) => (
            <NumberField key={key} label={character.skills[key].labelPtBr} value={character.skills[key].total.value} confidence={character.skills[key].total.confidence} onChange={(value) => update((draft) => void (draft.skills[key].total.value = value))} />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Recursos</legend>
        <div className="resource-list">
          {character.resources.map((resource, index) => (
            <div className="resource-row" key={resource.label.value}>
              <span>{resource.label.value}</span>
              <NullableNumberField label="Atual" value={resource.value.value} confidence={resource.value.confidence} onChange={(value) => update((draft) => void (draft.resources[index].value.value = value))} />
              <NullableNumberField label="Total" value={resource.max.value} confidence={resource.max.confidence} onChange={(value) => update((draft) => void (draft.resources[index].max.value = value))} />
            </div>
          ))}
        </div>
      </fieldset>
    </form>
  )
}

function Field({ label, value, confidence, onChange }: { label: string; value: string; confidence: string; onChange: (value: string) => void }) {
  return (
    <label className={`field confidence-${confidence}`}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function NumberField({ label, value, confidence, onChange }: { label: string; value: number; confidence: string; onChange: (value: number) => void }) {
  return (
    <label className={`field confidence-${confidence}`}>
      <span>{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function NullableNumberField({ label, value, confidence, onChange }: { label: string; value: number | null; confidence: string; onChange: (value: number | null) => void }) {
  return (
    <label className={`field confidence-${confidence}`}>
      <span>{label}</span>
      <input type="number" value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} />
    </label>
  )
}
