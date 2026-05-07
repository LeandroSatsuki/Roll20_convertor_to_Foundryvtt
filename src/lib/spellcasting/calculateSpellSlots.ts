import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import { getClassSpellcastingRule, type SpellcastingType } from './classSpellcastingRules'
import { calculatePactMagicSlots, type PactMagicSlots } from './pactMagicProgression'
import { fullCasterSlots, halfCasterSlots, spellSlotsForProgression, thirdCasterSlots, zeroSpellSlots, type SpellSlotArray } from './spellcastingProgression'

export type CalculatedSpellSlots = {
  levels: SpellSlotArray
  pact?: PactMagicSlots['pact']
  spellcastingType: SpellcastingType
  source: string
  warnings: string[]
}

export function calculateSpellSlots(character: NormalizedCharacter): CalculatedSpellSlots {
  const firstClass = character.identity.classes[0]
  const rule = getClassSpellcastingRule(firstClass?.name)
  const level = firstClass?.level ?? 0
  const warnings: string[] = []

  if (rule.type === 'full') {
    return { levels: spellSlotsForProgression(level, fullCasterSlots), spellcastingType: 'full', source: `${rule.displayName} ${level}`, warnings: ['SPELL_SLOTS_CALCULATED_FROM_CLASS'] }
  }
  if (rule.type === 'half') {
    return { levels: spellSlotsForProgression(level, halfCasterSlots), spellcastingType: 'half', source: `${rule.displayName} ${level}`, warnings: ['SPELL_SLOTS_CALCULATED_FROM_CLASS'] }
  }
  if (rule.type === 'third') {
    return { levels: spellSlotsForProgression(level, thirdCasterSlots), spellcastingType: 'third', source: `${rule.displayName} ${level}`, warnings: ['SPELL_SLOTS_CALCULATED_FROM_CLASS'] }
  }
  if (rule.type === 'pact') {
    return { levels: [...zeroSpellSlots], pact: calculatePactMagicSlots(level).pact, spellcastingType: 'pact', source: `${rule.displayName} ${level}`, warnings: ['SPELL_SLOTS_CALCULATED_FROM_CLASS'] }
  }

  if (hasAnySheetSpell(character)) warnings.push('SPELLCASTING_RULE_MISSING')
  return { levels: [...zeroSpellSlots], spellcastingType: 'none', source: firstClass?.name ?? 'unknown', warnings }
}

function hasAnySheetSpell(character: NormalizedCharacter): boolean {
  return character.spells.cantrips.length > 0 || Object.values(character.spells.levels).some((level) => level.spells.length > 0)
}
