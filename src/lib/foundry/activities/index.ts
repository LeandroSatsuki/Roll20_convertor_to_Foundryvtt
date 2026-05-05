import { foundryId } from '../ids'

export type SupportedActivityType = 'attack' | 'damage' | 'heal' | 'utility' | 'cast'

export type FoundryActivityShape = {
  _id: string
  type: SupportedActivityType
  name: string
  activation?: {
    type: string
    cost: number | null
    condition: string
  }
  attack?: {
    ability: string
    classification: 'weapon' | 'spell' | 'utility'
    mode: 'melee' | 'ranged'
    bonus?: number | null
  }
  damage?: {
    parts: Array<{
      formula: string
      type: string
    }>
  }
  healing?: {
    formula: string
  }
  spellcasting?: {
    ability: string
    preparation?: 'prepared' | 'known' | 'atwill'
    progression?: 'full' | 'half' | 'third' | 'none'
  }
  consumption?: {
    spellSlot?: boolean
  }
  range?: {
    value: number | null
    long: number | null
    units: string
  }
  target?: {
    template: string
    affects: string
  }
  notes?: string
}

export type ActivityValidationResult = {
  valid: boolean
  errors: string[]
}

type BaseActivityOptions = {
  name: string
  activationType?: string
  activationCost?: number | null
  condition?: string
  notes?: string
}

type AttackActivityOptions = BaseActivityOptions & {
  ability: string
  classification?: 'weapon' | 'spell' | 'utility'
  mode?: 'melee' | 'ranged'
  damageFormula?: string
  damageType?: string
  attackBonus?: number | null
  range?: { value: number | null; long: number | null; units?: string }
}

type DamageActivityOptions = BaseActivityOptions & {
  damageFormula: string
  damageType: string
}

type HealActivityOptions = BaseActivityOptions & {
  formula: string
}

type CastActivityOptions = BaseActivityOptions & {
  ability: string
  preparation?: 'prepared' | 'known' | 'atwill'
  progression?: 'full' | 'half' | 'third' | 'none'
  consumesSpellSlot?: boolean
}

function baseActivity(options: BaseActivityOptions): Pick<FoundryActivityShape, '_id' | 'name' | 'activation' | 'notes'> {
  return {
    _id: foundryId(),
    name: options.name,
    activation: {
      type: options.activationType ?? 'special',
      cost: options.activationCost ?? 1,
      condition: options.condition ?? '',
    },
    notes: options.notes,
  }
}

export function createUtilityActivity(options: BaseActivityOptions): FoundryActivityShape {
  return {
    ...baseActivity(options),
    type: 'utility',
  }
}

export function createAttackActivity(options: AttackActivityOptions): FoundryActivityShape {
  const activity: FoundryActivityShape = {
    ...baseActivity(options),
    type: 'attack',
    attack: {
      ability: options.ability,
      classification: options.classification ?? 'weapon',
      mode: options.mode ?? 'melee',
      bonus: options.attackBonus ?? null,
    },
  }

  if (options.damageFormula && options.damageType) {
    activity.damage = {
      parts: [{ formula: options.damageFormula, type: options.damageType }],
    }
  }

  if (options.range) {
    activity.range = {
      value: options.range.value ?? null,
      long: options.range.long ?? null,
      units: options.range.units ?? 'ft',
    }
  }

  return activity
}

export function createDamageActivity(options: DamageActivityOptions): FoundryActivityShape {
  return {
    ...baseActivity(options),
    type: 'damage',
    damage: {
      parts: [{ formula: options.damageFormula, type: options.damageType }],
    },
  }
}

export function createHealActivity(options: HealActivityOptions): FoundryActivityShape {
  return {
    ...baseActivity(options),
    type: 'heal',
    healing: {
      formula: options.formula,
    },
  }
}

export function createCastActivity(options: CastActivityOptions): FoundryActivityShape {
  return {
    ...baseActivity(options),
    type: 'cast',
    spellcasting: {
      ability: options.ability,
      preparation: options.preparation ?? 'prepared',
      progression: options.progression ?? 'none',
    },
    consumption: {
      spellSlot: options.consumesSpellSlot ?? false,
    },
  }
}

export function validateActivityShape(activity: unknown): ActivityValidationResult {
  const errors: string[] = []
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) {
    return { valid: false, errors: ['Activity deve ser um objeto.'] }
  }

  const record = activity as Record<string, unknown>
  if (typeof record._id !== 'string' || !record._id) errors.push('Activity precisa de _id.')
  if (typeof record.name !== 'string' || !record.name.trim()) errors.push('Activity precisa de name.')
  if (!['attack', 'damage', 'heal', 'utility', 'cast'].includes(String(record.type))) errors.push('Activity precisa de type suportado.')

  switch (record.type) {
    case 'attack': {
      const attack = record.attack as Record<string, unknown> | undefined
      if (!attack || typeof attack !== 'object') {
        errors.push('Attack activity precisa de bloco attack.')
        break
      }
      if (typeof attack.ability !== 'string' || !attack.ability) errors.push('Attack activity precisa de attack.ability.')
      if (!['weapon', 'spell', 'utility'].includes(String(attack.classification))) errors.push('Attack activity precisa de classification valida.')
      if (!['melee', 'ranged'].includes(String(attack.mode))) errors.push('Attack activity precisa de mode valido.')
      if ('damage' in record) errors.push(...validateDamageBlock(record.damage))
      break
    }
    case 'damage':
      errors.push(...validateDamageBlock(record.damage))
      break
    case 'heal': {
      const healing = record.healing as Record<string, unknown> | undefined
      if (!healing || typeof healing !== 'object' || typeof healing.formula !== 'string' || !healing.formula.trim()) {
        errors.push('Heal activity precisa de healing.formula.')
      }
      break
    }
    case 'cast': {
      const spellcasting = record.spellcasting as Record<string, unknown> | undefined
      if (!spellcasting || typeof spellcasting !== 'object') {
        errors.push('Cast activity precisa de bloco spellcasting.')
        break
      }
      if (typeof spellcasting.ability !== 'string' || !spellcasting.ability) errors.push('Cast activity precisa de spellcasting.ability.')
      break
    }
    case 'utility':
    default:
      break
  }

  return { valid: errors.length === 0, errors }
}

function validateDamageBlock(damage: unknown): string[] {
  const errors: string[] = []
  if (!damage || typeof damage !== 'object' || Array.isArray(damage)) {
    errors.push('Damage activity precisa de bloco damage.')
    return errors
  }
  const record = damage as Record<string, unknown>
  if (!Array.isArray(record.parts) || record.parts.length === 0) {
    errors.push('Damage activity precisa de pelo menos uma parte de dano.')
    return errors
  }
  record.parts.forEach((part, index) => {
    if (!part || typeof part !== 'object' || Array.isArray(part)) {
      errors.push(`Damage part ${index} invalida.`)
      return
    }
    const piece = part as Record<string, unknown>
    if (typeof piece.formula !== 'string' || !piece.formula.trim()) errors.push(`Damage part ${index} sem formula.`)
    if (typeof piece.type !== 'string' || !piece.type.trim()) errors.push(`Damage part ${index} sem tipo.`)
  })
  return errors
}
