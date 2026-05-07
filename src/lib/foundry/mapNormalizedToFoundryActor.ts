import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import { createFoundryActorTemplate } from './foundryActorTemplate'
import type { FoundryActor } from './foundryTypes'
import { toFoundryIdentifier } from './identifiers'
import { mapAbilities } from './mapAbilities'
import { mapItems } from './mapItems'
import { mapResources } from './mapResources'
import { mapSkills } from './mapSkills'
import { mapSpells } from './mapSpells'
import { hasSpellcastingAbilityUnknown, inferSpellcastingAbility } from '../spellcasting/inferSpellcastingAbility'

export function mapNormalizedToFoundryActor(character: NormalizedCharacter): FoundryActor {
  const actor = createFoundryActorTemplate(character.identity.name.value || 'Unnamed Roll20 Character')
  const abilitySnapshot = {
    str: character.abilities.str.score.value ?? null,
    dex: character.abilities.dex.score.value ?? null,
    con: character.abilities.con.score.value ?? null,
    int: character.abilities.int.score.value ?? null,
    wis: character.abilities.wis.score.value ?? null,
    cha: character.abilities.cha.score.value ?? null,
  }
  actor.system.currency = Object.fromEntries(Object.entries(character.currency).map(([coin, value]) => [coin, value.value]))
  actor.system.abilities = mapAbilities(character)
  actor.system.skills = mapSkills(character)
  actor.system.spells = mapSpells(character)
  actor.system.resources = mapResources(character)
  const spellcastingAbility = inferSpellcastingAbility(character)
  const initiative = mapInitiative(character)

  const acValue = character.attributes.ac.value
  actor.system.attributes = {
    ...(actor.system.attributes as Record<string, unknown>),
    ac: typeof acValue === 'number' ? { calc: 'flat', flat: acValue } : { calc: 'default', flat: null },
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
    init: initiative,
    spellcasting: spellcastingAbility ?? '',
  }

  actor.system.details = {
    ...(actor.system.details as Record<string, unknown>),
    alignment: character.identity.alignment.value,
    race: character.identity.race.value,
    background: character.identity.background.value,
    biography: { value: '', public: '' },
  }
  actor.system.traits = { ...(actor.system.traits as Record<string, unknown>), size: 'med' }
  actor.system.tools = Object.fromEntries(character.proficiencies.tools.value.map((tool) => [toFoundryIdentifier(tool), { value: 1, ability: 'int', bonuses: { check: '' } }]))
  actor.items = mapItems(character)
  actor.flags = {
    'roll20-to-foundry': {
      source: character.source.type,
      fileName: character.source.fileName,
      parserBuildId: character.pipeline?.parserBuildId,
      parseRunId: character.pipeline?.parseRunId,
      normalizedCharacterId: character.pipeline?.normalizedCharacterId,
      actorBuildId: character.pipeline?.actorBuildId ?? null,
      auditBuildId: character.pipeline?.auditBuildId ?? null,
      abilitiesBeforeActorBuild: abilitySnapshot,
      actorInputSnapshot: {
        abilities: abilitySnapshot,
      },
      warnings: character.warnings,
      spellcastingAbilityWarning: hasSpellcastingAbilityUnknown(character) ? 'SPELLCASTING_ABILITY_UNKNOWN' : null,
      initiativeWarning: character.warnings.some((warning) => warning.code === 'INITIATIVE_DEFAULTED_TO_DEX') ? 'INITIATIVE_DEFAULTED_TO_DEX' : null,
    },
  }

  return JSON.parse(JSON.stringify(actor))
}

function mapInitiative(character: NormalizedCharacter): { ability: 'dex'; bonus: string } {
  const total = character.attributes.initiative.value
  if (typeof total !== 'number') return { ability: 'dex', bonus: '' }

  const dexMod = character.abilities.dex.mod.value ?? (typeof character.abilities.dex.score.value === 'number' ? Math.floor((character.abilities.dex.score.value - 10) / 2) : 0)
  const residualBonus = total - dexMod
  return { ability: 'dex', bonus: residualBonus !== 0 ? String(residualBonus) : '' }
}
