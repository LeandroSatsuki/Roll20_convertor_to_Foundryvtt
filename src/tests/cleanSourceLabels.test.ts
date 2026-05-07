import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('cleanSourceLabels', () => {
  it('removes legacy roll20-pdf labels from bonfire-xlsx exports', async () => {
    const { bundle } = await buildBonfireBundle({ includeMagias: true })
    const actorJson = JSON.stringify(bundle.actor)
    const itemSources = bundle.actor.items.map((item) => ((item.flags['roll20-to-foundry'] as Record<string, unknown> | undefined)?.source ?? null))

    expect(actorJson).not.toContain('Roll20 PDF Conversion Notes')
    expect(actorJson).not.toContain('roll20-pdf')
    expect(itemSources.every((source) => source !== 'roll20-pdf')).toBe(true)
  })
})
