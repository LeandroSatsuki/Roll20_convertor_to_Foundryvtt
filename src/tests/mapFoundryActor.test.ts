import { describe, expect, it } from 'vitest'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseRoll20Character } from '../lib/parser/parseRoll20Character'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

describe('mapNormalizedToFoundryActor', () => {
  it('generates a Foundry character Actor', () => {
    const character = parseRoll20Character(sampleHeyzelText, { fileName: 'sample.pdf' })
    const actor = mapNormalizedToFoundryActor(character)
    expect(actor.type).toBe('character')
    expect((actor.system.abilities as any).str.value).toBe(18)
    expect((actor.system.attributes as any).hp.max).toBe(80)
    expect((actor.system.attributes as any).ac.flat).toBe(17)
    expect(actor.items.some((item) => item.name === 'Retomar Fôlego' && item.type === 'feat')).toBe(true)
    expect(actor.items.some((item) => item.name === 'Surto de Ação' && item.type === 'feat')).toBe(true)
    expect(actor.items.some((item) => item.name === 'Shortsword' && item.type === 'weapon')).toBe(true)
    expect(actor.items.every((item) => /^[a-z0-9_-]+$/.test(String(item.system.identifier)))).toBe(true)
    expect(actor.items.find((item) => item.name === 'Retomar Fôlego')?.system.identifier).toBe('retomar-folego')
  })

  it('exports parseable JSON without undefined or copied Adriel id', () => {
    const character = parseRoll20Character(sampleHeyzelText, { fileName: 'sample.pdf' })
    const actor = mapNormalizedToFoundryActor(character)
    const json = JSON.stringify(actor)
    expect(() => JSON.parse(json)).not.toThrow()
    expect(json).not.toContain('undefined')
    expect(json).not.toContain('1fuCNOuindysAgC6')
  })
})
