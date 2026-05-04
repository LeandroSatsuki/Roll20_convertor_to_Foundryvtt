import { describe, expect, it } from 'vitest'
import { mapNormalizedToFoundryActor } from '../lib/foundry/mapNormalizedToFoundryActor'
import { parseRoll20Character } from '../lib/parser/parseRoll20Character'
import { sampleHeyzelText } from '../lib/samples/sampleExpectedHeyzel'

describe('foundryMappingWithRules', () => {
  it('writes ruleResolution flags and keeps identifiers valid', () => {
    const actor = mapNormalizedToFoundryActor(parseRoll20Character(sampleHeyzelText, { fileName: 'sample.pdf' }))
    const retomar = actor.items.find((item) => item.name === 'Retomar Fôlego')
    const unknown = actor.items.find((item) => ruleResolution(item)?.kind === 'unknown')

    expect(ruleResolution(retomar)?.confidence).toBe('high')
    expect(ruleResolution(retomar)?.sourceUrl).toBeTruthy()
    expect(actor.items.every((item) => /^[a-z0-9_-]+$/.test(String(item.system.identifier)))).toBe(true)
    if (unknown) expect(unknown.type).toBe('feat')
  })
})

function ruleResolution(item: { flags: Record<string, unknown> } | undefined): Record<string, unknown> | undefined {
  const converterFlags = item?.flags['roll20-to-foundry'] as Record<string, unknown> | undefined
  return converterFlags?.ruleResolution as Record<string, unknown> | undefined
}
