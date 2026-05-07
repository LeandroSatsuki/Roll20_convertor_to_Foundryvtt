import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('unresolvedFeatureBio', () => {
  it('adds unresolved features to the playable biography without blocking export', async () => {
    const { bundle } = await buildBonfireBundle({
      overrides: [{ sheetName: 'LOG', address: 'R31', value: 'Feature Fantasma' }],
    })

    const biography = String((((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value as string | undefined) ?? '')
    const featureItem = bundle.actor.items.find((item) => item.name === 'Feature Fantasma')
    const flags = featureItem?.flags['roll20-to-foundry'] as Record<string, any> | undefined

    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(featureItem).toBeTruthy()
    expect(flags?.featureSource?.unresolved).toBe(true)
    expect(biography).toContain('Características para revisar/adicionar manualmente')
    expect(biography).toContain('Feature Fantasma')
  })
})
