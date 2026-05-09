import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { unresolvedFeature } from './unresolvedBonfireTestUtils'

describe('unresolved Bonfire rules', () => {
  it('creates a visible placeholder without blocking Foundry export', async () => {
    const { bundle } = await buildBonfireBundle({}, (character) => {
      character.features.push(unresolvedFeature('Regra Inexistente', 'class', 'classFeature', 'R31'))
    })

    const item = bundle.actor.items.find((candidate) => candidate.name === 'Regra Inexistente (Não Encontrado, CORRIGIR!)')
    const flags = item?.flags['roll20-to-foundry'] as Record<string, any> | undefined

    expect(item).toBeTruthy()
    expect(item?.type).toBe('feat')
    expect(String(item?.system.description && (item.system.description as Record<string, unknown>).value)).toContain('Não Encontrado, CORRIGIR!')
    expect(flags?.bonfireResolution?.status).toBe('not-found')
    expect(item?.system.identifier).toMatch(/^[a-z0-9_-]+$/)
    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.importReadiness.status).toBe('ready-with-review')
    expect(bundle.audit.summary.blockingErrorCount).toBe(0)
    expect(bundle.audit.summary.bonfireMissingRulePlaceholderCount).toBeGreaterThan(0)
  })
})
