import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('nannaFeatureNoiseRegression', () => {
  it('drops level markers from items and biography', async () => {
    const { bundle, debug } = await buildBonfireBundle({
      overrides: [
        { sheetName: 'LOG', address: 'Z45', value: 'Nível 5' },
        { sheetName: 'LOG', address: 'Z46', value: 'Nível 9' },
        { sheetName: 'LOG', address: 'Z47', value: 'Nível 13' },
        { sheetName: 'LOG', address: 'Z48', value: 'Nível 17' },
      ],
    })

    const biography = String((((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value as string | undefined) ?? '')
    const itemNames = bundle.actor.items.map((item) => item.name)

    expect(itemNames.some((name) => /^N[ií]vel\s+\d+$/i.test(name))).toBe(false)
    expect(biography).not.toMatch(/N[ií]vel\s+(5|9|13|17)/i)
    expect(debug.rejectedFeatureNoise.map((entry) => entry.value)).toEqual(expect.arrayContaining(['Nível 5', 'Nível 9', 'Nível 13', 'Nível 17']))
  })
})
