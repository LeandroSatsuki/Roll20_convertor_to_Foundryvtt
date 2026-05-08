import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('identityDuplicateFeatureIgnored', () => {
  it('ignores features that duplicate race or background identity names', async () => {
    const { debug, bundle } = await buildBonfireBundle({
      overrides: [
        { sheetName: 'LOG', address: 'T7', value: 'Elfo da Lua' },
        { sheetName: 'LOG', address: 'H11', value: 'Estudante de Arqueomancia' },
        { sheetName: 'LOG', address: 'R31', value: 'Estudante de Arqueomancia' },
        { sheetName: 'LOG', address: 'R32', value: 'Elfo da Lua' },
      ],
    })

    const featNames = bundle.actor.items.filter((item) => item.type === 'feat').map((item) => item.name)
    expect(featNames.filter((name) => name === 'Estudante de Arqueomancia')).toHaveLength(0)
    expect(featNames.filter((name) => name === 'Elfo da Lua')).toHaveLength(1)
    expect(debug.ignoredDuplicateIdentityFeatures).toHaveLength(2)
  })
})
