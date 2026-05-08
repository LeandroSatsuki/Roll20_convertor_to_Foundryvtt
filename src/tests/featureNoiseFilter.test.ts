import { describe, expect, it } from 'vitest'
import { isRejectedFeatureNoise } from '../lib/sheets/parseBonfireCharacterSheet'

describe('featureNoiseFilter', () => {
  it('rejects exact level markers and keeps real feature names', () => {
    expect(isRejectedFeatureNoise('Nível 5')).toBe(true)
    expect(isRejectedFeatureNoise('Nível 9')).toBe(true)
    expect(isRejectedFeatureNoise('Nível 13')).toBe(true)
    expect(isRejectedFeatureNoise('Nível 17')).toBe(true)
    expect(isRejectedFeatureNoise('Level 5')).toBe(true)

    expect(isRejectedFeatureNoise('Líder Inspirador')).toBe(false)
    expect(isRejectedFeatureNoise('Ordem Primal: Xamã')).toBe(false)
    expect(isRejectedFeatureNoise('Surto Selvagem: Elo Primal')).toBe(false)
  })
})
