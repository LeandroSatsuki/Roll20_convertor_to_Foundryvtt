import { describe, expect, it } from 'vitest'
import { resolveFeature } from '../lib/rules/featureResolver'
import { isRejectedFeatureNoise } from '../lib/sheets/parseBonfireCharacterSheet'

describe('bonfireLevelPrefixMatch', () => {
  it('matches Bonfire features with or without a level prefix and still ignores bare level markers', () => {
    const plain = resolveFeature('Vínculo Natural', { className: 'Druida', level: 5, section: 'class' })
    const prefixed = resolveFeature('Nível 1: Vínculo Natural', { className: 'Druida', level: 5, section: 'class' })

    expect(plain.ruleId).toBe('druida-vinculo-natural')
    expect(prefixed.ruleId).toBe('druida-vinculo-natural')
    expect(prefixed.resolvedName).toBe('Vínculo Natural')
    expect(isRejectedFeatureNoise('Nível 5')).toBe(true)
  })
})
