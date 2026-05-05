export type SourceType = 'roll20-pdf' | 'bonfire-xlsx' | 'google-sheets-xlsx' | 'manual-json' | 'r20exporter-campaign-json' | 'r20exporter-zip'
export type Confidence = 'high' | 'medium' | 'low'
export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type SkillKey =
  | 'acr'
  | 'ani'
  | 'arc'
  | 'ath'
  | 'dec'
  | 'his'
  | 'ins'
  | 'itm'
  | 'inv'
  | 'med'
  | 'nat'
  | 'prc'
  | 'prf'
  | 'per'
  | 'rel'
  | 'slt'
  | 'ste'
  | 'sur'

export type FieldValue<T> = {
  value: T
  raw?: string
  confidence: Confidence
  warnings?: string[]
  source?: string
}

export type AbilityValue = {
  score: FieldValue<number>
  mod: FieldValue<number>
}

export type SaveValue = {
  total: FieldValue<number>
  proficient: FieldValue<boolean>
  bonus: FieldValue<number>
}

export type SkillValue = {
  labelPtBr: string
  ability: AbilityKey
  total: FieldValue<number>
  proficiencyLevel: FieldValue<0 | 0.5 | 1 | 2>
  bonus: FieldValue<number>
}

export type NormalizedAttack = {
  name: FieldValue<string>
  attackBonus: FieldValue<number | null>
  damageFormula: FieldValue<string | null>
  damageType: FieldValue<string | null>
  category: 'weapon' | 'spell' | 'healing' | 'utility' | 'unknown'
  raw: string
}

export type NormalizedFeature = {
  name: FieldValue<string>
  sourceType:
    | 'race'
    | 'background'
    | 'class'
    | 'subclass'
    | 'feat'
    | 'maneuver'
    | 'weapon-mastery'
    | 'action'
    | 'other'
  level?: number
  description: FieldValue<string>
  uses?: {
    value: FieldValue<number | null>
    max: FieldValue<number | null>
    recovery: 'sr' | 'lr' | 'charges' | 'none' | 'unknown'
  }
  activation?: {
    type: 'action' | 'bonus' | 'reaction' | 'special' | 'none' | 'unknown'
  }
  raw: string
}

export type NormalizedResource = {
  label: FieldValue<string>
  value: FieldValue<number | null>
  max: FieldValue<number | null>
  recovery: FieldValue<'sr' | 'lr' | 'none' | 'unknown'>
  shouldBecomeItem: boolean
  raw: string
}

export type NormalizedSpell = {
  name: FieldValue<string>
  level: number
  raw: string
}

export type NormalizedEquipment = {
  name: FieldValue<string>
  quantity: FieldValue<number>
  category: 'armor' | 'weapon' | 'consumable' | 'equipment' | 'tool' | 'loot' | 'unknown'
  raw: string
}

export type ConversionWarning = {
  code: string
  severity: 'info' | 'warning' | 'error'
  message: string
  fieldPath?: string
  raw?: string
}

export type PipelineTrace = {
  parserBuildId: string
  parseRunId: string
  normalizedCharacterId: string
  actorBuildId?: string | null
  auditBuildId?: string | null
}

export type NormalizedCharacter = {
  source: {
    type: SourceType
    fileName: string
    extractedAt: string
    pages?: Array<{ pageNumber: number; text: string }>
    rawCampaignJson?: unknown
  }
  identity: {
    name: FieldValue<string>
    player?: FieldValue<string>
    classText: FieldValue<string>
    classes: Array<{ name: string; level: number; subclass?: string }>
    background: FieldValue<string>
    race: FieldValue<string>
    alignment: FieldValue<string>
    xp?: FieldValue<number | null>
  }
  media?: {
    avatarUrl?: FieldValue<string | null>
    tokenUrl?: FieldValue<string | null>
  }
  abilities: Record<AbilityKey, AbilityValue>
  proficiencyBonus: FieldValue<number>
  saves: Record<AbilityKey, SaveValue>
  skills: Record<SkillKey, SkillValue>
  attributes: {
    ac: FieldValue<number | null>
    initiative: FieldValue<number | null>
    speed: FieldValue<number | null>
    speedUnits: 'ft' | 'm' | null
    passivePerception: FieldValue<number | null>
    hp: {
      value: FieldValue<number | null>
      max: FieldValue<number | null>
      temp: FieldValue<number | null>
      tempMax: FieldValue<number | null>
    }
    hitDice: {
      total: FieldValue<number | null>
      spent: FieldValue<number | null>
      denomination?: FieldValue<string | null>
    }
    senses: {
      darkvision: FieldValue<number | null>
    }
  }
  currency: Record<'cp' | 'sp' | 'ep' | 'gp' | 'pp', FieldValue<number>>
  proficiencies: {
    tools: FieldValue<string[]>
    languages: FieldValue<string[]>
    weapons: FieldValue<string[]>
    armor: FieldValue<string[]>
  }
  attacks: NormalizedAttack[]
  equipment?: NormalizedEquipment[]
  features: NormalizedFeature[]
  resources: NormalizedResource[]
  spells: {
    spellcastingClass: FieldValue<string | null>
    ability: FieldValue<AbilityKey | null>
    saveDc: FieldValue<number | null>
    attackBonus: FieldValue<number | null>
    cantrips: NormalizedSpell[]
    levels: Record<string, { slotsMax: FieldValue<number>; slotsUsed: FieldValue<number>; spells: NormalizedSpell[] }>
  }
  pipeline?: PipelineTrace
  warnings: ConversionWarning[]
}
