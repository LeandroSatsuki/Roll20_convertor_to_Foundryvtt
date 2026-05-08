import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('noBackgroundDuplicateFeature', () => {
  it('does not turn the identity background into a duplicate feature item', async () => {
    const { bundle, debug } = await buildBonfireBundle({
      overrides: [
        { sheetName: 'LOG', address: 'H11', value: 'Estudante de Arqueomancia' },
        { sheetName: 'LOG', address: 'R37', value: 'Estudante de Arqueomancia' },
      ],
    })

    expect(bundle.actor.items.some((item) => item.type === 'feat' && item.name === 'Estudante de Arqueomancia')).toBe(false)
    expect(debug.ignoredDuplicateIdentityFeatures.some((entry) => entry.reason === 'duplicateOfIdentityBackground')).toBe(true)
  })
})
