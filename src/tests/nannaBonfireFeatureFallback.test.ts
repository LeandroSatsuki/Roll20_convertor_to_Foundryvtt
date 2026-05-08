import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('nannaBonfireFeatureFallback', () => {
  it('resolves Bonfire custom features with fallback descriptions instead of missing descriptions', async () => {
    const { bundle } = await buildBonfireBundle({
      overrides: [
        { sheetName: 'LOG', address: 'T5', value: 'Druida 5' },
        { sheetName: 'LOG', address: 'T7', value: 'Elfo da Lua' },
        { sheetName: 'LOG', address: 'H11', value: 'Estudante de Arqueomancia' },
        { sheetName: 'LOG', address: 'R31', value: 'Ancestralidade Feérica' },
        { sheetName: 'LOG', address: 'R32', value: 'Transe Élfico' },
        { sheetName: 'LOG', address: 'R33', value: 'Sonho da Lua' },
        { sheetName: 'LOG', address: 'R34', value: 'Bruma Serenante' },
        { sheetName: 'LOG', address: 'R35', value: 'Juramento Três luas' },
      ],
    })

    for (const name of ['Ancestralidade Feérica', 'Transe Élfico', 'Sonho da Lua', 'Bruma Serenante', 'Juramento Três Luas']) {
      const item = bundle.actor.items.find((candidate) => candidate.name === name)
      const flags = item?.flags['roll20-to-foundry'] as Record<string, any> | undefined
      expect(item).toBeTruthy()
      expect(flags?.descriptionMeta?.status).not.toBe('missing')
    }
  })
})
