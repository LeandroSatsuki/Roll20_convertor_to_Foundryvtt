import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import { createFoundryActorTemplate } from './foundryActorTemplate'
import type { FoundryActor } from './foundryTypes'
import { toFoundryIdentifier } from './identifiers'
import { mapAbilities } from './mapAbilities'
import { mapItems } from './mapItems'
import { mapResources } from './mapResources'
import { mapSkills } from './mapSkills'
import { mapSpells } from './mapSpells'

export function mapNormalizedToFoundryActor(character: NormalizedCharacter): FoundryActor {
  const actor = createFoundryActorTemplate(character.identity.name.value || 'Unnamed Roll20 Character')
  actor.system.currency = Object.fromEntries(Object.entries(character.currency).map(([coin, value]) => [coin, value.value]))
  actor.system.abilities = mapAbilities(character)
  actor.system.skills = mapSkills(character)
  actor.system.spells = mapSpells(character)
  actor.system.resources = mapResources(character)

  actor.system.attributes = {
    ...(actor.system.attributes as Record<string, unknown>),
    ac: { calc: 'flat', flat: character.attributes.ac.value },
    hp: {
      value: character.attributes.hp.value.value,
      max: character.attributes.hp.max.value,
      temp: character.attributes.hp.temp.value,
      tempmax: character.attributes.hp.tempMax.value,
    },
    movement: {
      burrow: null,
      climb: null,
      fly: null,
      swim: null,
      walk: character.attributes.speed.value,
      units: character.attributes.speedUnits ?? 'ft',
      hover: false,
    },
    senses: {
      darkvision: character.attributes.senses.darkvision.value,
      blindsight: null,
      tremorsense: null,
      truesight: null,
      units: 'ft',
      special: '',
    },
    init: { ability: '', bonus: character.attributes.initiative.value ?? '' },
    spellcasting: character.spells.ability.value ?? '',
  }

  actor.system.details = {
    ...(actor.system.details as Record<string, unknown>),
    alignment: character.identity.alignment.value,
    race: character.identity.race.value,
    background: character.identity.background.value,
    biography: { value: buildBiography(character), public: '' },
  }
  actor.system.traits = { ...(actor.system.traits as Record<string, unknown>), size: 'med' }
  actor.system.tools = Object.fromEntries(character.proficiencies.tools.value.map((tool) => [toFoundryIdentifier(tool), { value: 1, ability: 'int', bonuses: { check: '' } }]))
  actor.items = mapItems(character)
  actor.flags = {
    'roll20-to-foundry': {
      source: character.source.type,
      fileName: character.source.fileName,
      warnings: character.warnings,
    },
  }

  return JSON.parse(JSON.stringify(actor))
}

function buildBiography(character: NormalizedCharacter): string {
  const warnings = character.warnings.map((warning) => `<li>${escapeHtml(warning.message)}</li>`).join('')
  const features = character.features.map((feature) => `<li>${escapeHtml(feature.name.value)}</li>`).join('')
  return `<section><h2>Roll20 PDF Conversion Notes</h2><p>Dados incertos foram preservados para revisão.</p><h3>Características detectadas</h3><ul>${features}</ul><h3>Avisos</h3><ul>${warnings}</ul></section>`
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
