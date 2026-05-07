import { describe, expect, it } from 'vitest'
import type { NormalizedCharacter } from '../lib/normalize/normalizedCharacterTypes'
import { calculateSpellSlots } from '../lib/spellcasting/calculateSpellSlots'

describe('spellcastingProgression', () => {
  it.each([
    ['Clérigo', 5, [4, 3, 2]],
    ['Mago', 5, [4, 3, 2]],
    ['Paladino', 5, [4, 2, 0]],
    ['Guerreiro', 6, [0, 0, 0]],
  ])('%s %i slots', (className, level, expected) => {
    const slots = calculateSpellSlots(character(className, level))
    expect(slots.levels.slice(0, 3)).toEqual(expected)
  })

  it('calculates pact magic separately for Bruxo 5', () => {
    const slots = calculateSpellSlots(character('Bruxo', 5))
    expect(slots.levels.every((value) => value === 0)).toBe(true)
    expect(slots.pact).toEqual({ value: 2, override: null, level: 3 })
  })
})

function character(className: string, level: number): NormalizedCharacter {
  return {
    source: { type: 'manual-json', fileName: 'test', extractedAt: new Date(0).toISOString() },
    identity: {
      name: { value: 'Test', confidence: 'high' },
      classText: { value: `${className} ${level}`, confidence: 'high' },
      classes: [{ name: className, level }],
      background: { value: '', confidence: 'high' },
      race: { value: '', confidence: 'high' },
      alignment: { value: '', confidence: 'high' },
    },
    abilities: {} as NormalizedCharacter['abilities'],
    proficiencyBonus: { value: 3, confidence: 'high' },
    saves: {} as NormalizedCharacter['saves'],
    skills: {} as NormalizedCharacter['skills'],
    attributes: {} as NormalizedCharacter['attributes'],
    currency: {} as NormalizedCharacter['currency'],
    proficiencies: { tools: { value: [], confidence: 'high' }, languages: { value: [], confidence: 'high' }, weapons: { value: [], confidence: 'high' }, armor: { value: [], confidence: 'high' } },
    attacks: [],
    equipment: [],
    features: [],
    resources: [],
    spells: { spellcastingClass: { value: className, confidence: 'high' }, ability: { value: null, confidence: 'high' }, saveDc: { value: null, confidence: 'high' }, attackBonus: { value: null, confidence: 'high' }, cantrips: [], levels: {} },
    warnings: [],
  }
}
