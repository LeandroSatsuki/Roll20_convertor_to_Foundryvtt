import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('featureBonfireFallback', () => {
  it('uses Bonfire fallback for known custom features without surfacing them as pending biography items', async () => {
    const { bundle } = await buildBonfireBundle({
      overrides: [{ sheetName: 'LOG', address: 'R31', value: 'Afinidade Lunar' }],
    })

    const featureItem = bundle.actor.items.find((item) => item.name === 'Afinidade Lunar')
    const flags = featureItem?.flags['roll20-to-foundry'] as Record<string, any> | undefined
    const biography = String((((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value as string | undefined) ?? '')

    expect(featureItem).toBeTruthy()
    expect(flags?.featureSource?.fallbackBonfire).toBe(true)
    expect(flags?.descriptionMeta?.status === 'complete' || flags?.descriptionMeta?.status === 'fallback').toBe(true)
    expect(biography).not.toContain('Afinidade Lunar -')
    expect(biography).not.toContain('Características para revisar/adicionar manualmente')
  })
})
