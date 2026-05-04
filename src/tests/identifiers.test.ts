import { describe, expect, it } from 'vitest'
import { isValidFoundryIdentifier, makeUniqueFoundryIdentifier, toFoundryIdentifier } from '../lib/foundry/identifiers'

describe('foundry identifiers', () => {
  it('creates safe dnd5e item identifiers', () => {
    expect(toFoundryIdentifier('Retomar Fôlego')).toBe('retomar-folego')
    expect(toFoundryIdentifier('Superstição Tribal')).toBe('supersticao-tribal')
    expect(toFoundryIdentifier('🧌 Humano Goruun 🧌')).toBe('humano-goruun')
    expect(toFoundryIdentifier('Mestre da Ambidestria')).toBe('mestre-da-ambidestria')
    expect(toFoundryIdentifier('')).toBe('item')
  })

  it('creates unique identifiers inside an Actor', () => {
    const used = new Set<string>()
    expect(makeUniqueFoundryIdentifier('Retomar Fôlego', used)).toBe('retomar-folego')
    expect(makeUniqueFoundryIdentifier('Retomar Fôlego', used)).toBe('retomar-folego-2')
  })

  it('validates the allowed Foundry dnd5e identifier format', () => {
    expect(isValidFoundryIdentifier('retomar-folego_2')).toBe(true)
    expect(isValidFoundryIdentifier('Retomar Fôlego')).toBe(false)
    expect(isValidFoundryIdentifier('')).toBe(false)
  })
})
