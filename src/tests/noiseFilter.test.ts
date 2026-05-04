import { describe, expect, it } from 'vitest'
import { isProbablyTableHeaderOrNoise } from '../lib/sheets/parseBonfireCharacterSheet'

describe('sheet noise filter', () => {
  it('rejects table headers, prices, quantities, and progression labels', () => {
    for (const value of ['Nível 1', 'Nível 4', 'CUSTO', 'PESO', '50. gp', 'Priceless', '#']) {
      expect(isProbablyTableHeaderOrNoise(value), value).toBe(true)
    }
  })

  it('accepts real feature names', () => {
    for (const value of ['Canalizar Divindade', 'Retomar Fôlego', 'Marca Anômala']) {
      expect(isProbablyTableHeaderOrNoise(value), value).toBe(false)
    }
  })
})
