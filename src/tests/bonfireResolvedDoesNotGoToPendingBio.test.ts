import { describe, expect, it } from 'vitest'
import type { NormalizedFeature } from '../lib/normalize/normalizedCharacterTypes'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('resolved Bonfire rules and pending biography', () => {
  it('does not mark Bonfire fallback or needs-review descriptions as not found', async () => {
    const feature: NormalizedFeature = {
      name: { value: 'Vínculo Natural', confidence: 'high', raw: 'Vínculo Natural' },
      sourceType: 'class',
      source: 'bonfire-v2.1',
      sourceCell: 'R39',
      sourceRange: 'LOG!R31:R42',
      sourceGroup: 'core-features',
      rawName: 'Vínculo Natural',
      cleanedName: 'Vínculo Natural',
      inferredKind: 'classFeature',
      classificationReason: 'known Bonfire custom feature',
      description: { value: '', confidence: 'low' },
      raw: 'Vínculo Natural',
    }

    const { bundle } = await buildBonfireBundle({}, (character) => {
      character.identity.classes = [{ name: 'Druida', level: 6 }]
      character.features.push(feature)
    })

    const biography = String(((bundle.actor.system.details as Record<string, unknown>).biography as Record<string, unknown>).value ?? '')
    const item = bundle.actor.items.find((candidate) => candidate.name === 'Vínculo Natural')

    expect(item).toBeTruthy()
    expect(bundle.actor.items.some((candidate) => candidate.name === 'Vínculo Natural (Não Encontrado, CORRIGIR!)')).toBe(false)
    expect(biography).not.toContain('Vínculo Natural (Não Encontrado, CORRIGIR!)')
    expect(biography).not.toContain('Vínculo Natural</li>')
    expect(bundle.audit.importReadiness.canExport).toBe(true)
  })
})
