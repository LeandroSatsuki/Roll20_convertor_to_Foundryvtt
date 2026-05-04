import { hasUndefinedDeep, isRecord, validation, type FoundryValidationResult } from './foundryValidationReport'
import { validateFoundryItems } from './validateFoundryItems'
import { validateFoundrySpells } from './validateFoundrySpells'

const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const skillKeys = ['acr', 'ani', 'arc', 'ath', 'dec', 'his', 'ins', 'itm', 'inv', 'med', 'nat', 'prc', 'prf', 'per', 'rel', 'slt', 'ste', 'sur']
const skillValues = new Set([0, 0.5, 1, 2])

export function validateFoundryActorDeep(actor: unknown): FoundryValidationResult[] {
  const results: FoundryValidationResult[] = []
  if (!isRecord(actor)) return [validation('FOUNDRY_ACTOR_INVALID', 'error', 'Actor root deve ser objeto.')]
  if (typeof actor.name !== 'string' || !actor.name.trim()) results.push(validation('FOUNDRY_ACTOR_NAME_MISSING', 'error', 'actor.name é obrigatório.', 'name'))
  if (actor.type !== 'character') results.push(validation('FOUNDRY_ACTOR_TYPE_INVALID', 'error', 'actor.type deve ser character.', 'type'))
  if (!isRecord(actor.system)) results.push(validation('FOUNDRY_ACTOR_SYSTEM_MISSING', 'error', 'actor.system ausente.', 'system'))
  if (!Array.isArray(actor.items)) results.push(validation('FOUNDRY_ACTOR_ITEMS_INVALID', 'error', 'actor.items deve ser array.', 'items'))
  if (!Array.isArray(actor.effects)) results.push(validation('FOUNDRY_ACTOR_EFFECTS_INVALID', 'error', 'actor.effects deve ser array.', 'effects'))
  if (!isRecord(actor.prototypeToken)) results.push(validation('FOUNDRY_ACTOR_TOKEN_MISSING', 'error', 'actor.prototypeToken ausente.', 'prototypeToken'))
  const stats = isRecord(actor._stats) ? actor._stats : {}
  if (stats.systemId !== 'dnd5e') results.push(validation('FOUNDRY_ACTOR_SYSTEM_ID_INVALID', 'error', '_stats.systemId deve ser dnd5e.', '_stats.systemId'))
  if (typeof stats.systemVersion !== 'string' || !stats.systemVersion) results.push(validation('FOUNDRY_ACTOR_SYSTEM_VERSION_MISSING', 'error', '_stats.systemVersion ausente.', '_stats.systemVersion'))
  if (hasUndefinedDeep(actor)) results.push(validation('FOUNDRY_ACTOR_UNDEFINED', 'error', 'Actor contém undefined.', 'actor'))
  if (isRecord(actor.system)) {
    results.push(...validateAbilities(actor.system))
    results.push(...validateSkills(actor.system))
    results.push(...validateAttributes(actor.system))
  }
  results.push(...validateFoundrySpells(actor))
  results.push(...validateFoundryItems(actor))
  return results
}

function validateAbilities(system: Record<string, unknown>): FoundryValidationResult[] {
  const abilities = isRecord(system.abilities) ? system.abilities : {}
  return abilityKeys.flatMap((key) => {
    const path = `system.abilities.${key}`
    const ability = abilities[key]
    if (!isRecord(ability)) return [validation('FOUNDRY_ABILITY_MISSING', 'error', `Ability ${key} ausente.`, path)]
    const results: FoundryValidationResult[] = []
    if (typeof ability.value !== 'number') results.push(validation('FOUNDRY_ABILITY_VALUE_INVALID', 'error', `${key}.value deve ser número.`, `${path}.value`))
    if (ability.proficient !== 0 && ability.proficient !== 1) results.push(validation('FOUNDRY_ABILITY_PROF_INVALID', 'error', `${key}.proficient deve ser 0 ou 1.`, `${path}.proficient`))
    return results
  })
}

function validateSkills(system: Record<string, unknown>): FoundryValidationResult[] {
  const skills = isRecord(system.skills) ? system.skills : {}
  return skillKeys.flatMap((key) => {
    const path = `system.skills.${key}`
    const skill = skills[key]
    if (!isRecord(skill)) return [validation('FOUNDRY_SKILL_MISSING', 'error', `Skill ${key} ausente.`, path)]
    const results: FoundryValidationResult[] = []
    if (!skillValues.has(skill.value as number)) results.push(validation('FOUNDRY_SKILL_VALUE_INVALID', 'error', `${key}.value inválido.`, `${path}.value`))
    if (typeof skill.ability !== 'string' || !abilityKeys.includes(skill.ability)) results.push(validation('FOUNDRY_SKILL_ABILITY_INVALID', 'error', `${key}.ability inválida.`, `${path}.ability`))
    const bonuses = isRecord(skill.bonuses) ? skill.bonuses : {}
    if (typeof bonuses.check !== 'string') results.push(validation('FOUNDRY_SKILL_BONUS_CHECK_INVALID', 'error', `${key}.bonuses.check deve ser string.`, `${path}.bonuses.check`))
    return results
  })
}

function validateAttributes(system: Record<string, unknown>): FoundryValidationResult[] {
  const attributes = isRecord(system.attributes) ? system.attributes : {}
  const results: FoundryValidationResult[] = []
  const hp = isRecord(attributes.hp) ? attributes.hp : {}
  if (hp.max !== null && typeof hp.max !== 'number') results.push(validation('FOUNDRY_HP_MAX_INVALID', 'error', 'hp.max deve ser número ou null.', 'system.attributes.hp.max'))
  if (hp.value !== null && typeof hp.value !== 'number') results.push(validation('FOUNDRY_HP_VALUE_INVALID', 'error', 'hp.value deve ser número ou null.', 'system.attributes.hp.value'))
  const ac = isRecord(attributes.ac) ? attributes.ac : {}
  if (typeof ac.calc !== 'string' || !ac.calc) results.push(validation('FOUNDRY_AC_CALC_MISSING', 'error', 'ac.calc ausente.', 'system.attributes.ac.calc'))
  if (ac.calc === 'flat' && typeof ac.flat !== 'number') results.push(validation('FOUNDRY_AC_FLAT_INVALID', 'error', 'ac.flat deve ser número quando ac.calc é flat.', 'system.attributes.ac.flat'))
  const movement = isRecord(attributes.movement) ? attributes.movement : undefined
  if (!movement) results.push(validation('FOUNDRY_MOVEMENT_INVALID', 'error', 'movement ausente ou inválido.', 'system.attributes.movement'))
  const senses = isRecord(attributes.senses) ? attributes.senses : {}
  if (senses.darkvision !== null && typeof senses.darkvision !== 'number') results.push(validation('FOUNDRY_DARKVISION_INVALID', 'error', 'senses.darkvision deve ser número ou null.', 'system.attributes.senses.darkvision'))
  if (attributes.spellcasting !== '' && !abilityKeys.includes(String(attributes.spellcasting))) {
    results.push(validation('FOUNDRY_SPELLCASTING_INVALID', 'error', 'attributes.spellcasting deve ser ability válida ou string vazia.', 'system.attributes.spellcasting'))
  }
  return results
}
