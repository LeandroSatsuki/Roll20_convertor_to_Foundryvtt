import type { AbilityKey, ConversionWarning } from '../character/normalizedCharacterTypes'

export type BonfireClassRule = {
  id: string
  name: string
  aliases: string[]
  hitDie: string
  primaryAbility: AbilityKey[]
  savingThrows: AbilityKey[]
  proficiencies: {
    armor: string[]
    weapons: string[]
    tools: string[]
    skills: string[]
  }
  spellcasting?: {
    ability: AbilityKey
    prepared: boolean
    progression: 'full' | 'half' | 'third' | 'none'
  }
  featuresByLevel: Record<string, BonfireRuleFeature[]>
  sourceUrl?: string
}

export type BonfireSubclassRule = {
  id: string
  name: string
  className: string
  aliases: string[]
  featuresByLevel: Record<string, BonfireRuleFeature[]>
  sourceUrl?: string
}

export type BonfireRaceRule = {
  id: string
  name: string
  aliases: string[]
  speed: number
  size: string
  features: BonfireRuleFeature[]
  sourceUrl?: string
}

export type BonfireBackgroundRule = {
  id: string
  name: string
  aliases: string[]
  features: BonfireRuleFeature[]
  proficiencies: string[]
  startingGold?: number
  sourceUrl?: string
}

export type BonfireFeatRule = {
  id: string
  name: string
  aliases: string[]
  category: 'origin' | 'general' | 'racial' | 'extra' | 'unknown'
  prerequisites: string[]
  effects: string[]
  uses?: BonfireUses
  activation?: string
  sourceUrl?: string
}

export type BonfireWeaponRule = {
  id: string
  name: string
  aliases: string[]
  category: 'simple' | 'martial' | 'armor' | 'shield' | 'consumable' | 'equipment' | 'focus' | 'unknown'
  damage?: string
  damageType?: string
  properties: string[]
  masteryOptions: string[]
  price?: string
  weight?: string
  sourceUrl?: string
}

export type BonfireSpellOverrideRule = {
  id: string
  spellName: string
  status: 'allowed' | 'banned' | 'limited' | 'adjusted' | 'buff' | 'nerf' | 'rework'
  description: string
  foundryNotes: string
  sourceUrl?: string
}

export type BonfireRuleFeature = {
  id: string
  name: string
  aliases?: string[]
  level?: number
  description: string
  kind?: FeatureResolution['kind']
  uses?: BonfireUses
  activation?: string
  sourceUrl?: string
}

export type BonfireUses = {
  max: number | string
  recovery: 'sr' | 'lr' | 'sr-lr' | 'day' | 'charges' | 'none' | 'unknown'
}

export type FeatureResolutionContext = {
  className?: string
  level?: number
  race?: string
  background?: string
  subclass?: string
  section?: string
}

export type FeatureResolution = {
  rawName: string
  resolvedName: string
  identifier: string
  kind:
    | 'classFeature'
    | 'subclassFeature'
    | 'raceFeature'
    | 'backgroundFeature'
    | 'feat'
    | 'originFeat'
    | 'racialFeat'
    | 'weaponMastery'
    | 'spellcasting'
    | 'resource'
    | 'weapon'
    | 'armor'
    | 'equipment'
    | 'consumable'
    | 'spell'
    | 'spellOverride'
    | 'unknown'
  confidence: 'high' | 'medium' | 'low'
  score?: number
  ruleId?: string
  sourceUrl?: string
  description?: string
  uses?: BonfireUses
  activation?: string
  candidates?: Array<{
    ruleId: string
    name: string
    kind: string
    score: number
    confidence: string
  }>
  manuallyResolved?: boolean
  warnings: ConversionWarning[]
}
