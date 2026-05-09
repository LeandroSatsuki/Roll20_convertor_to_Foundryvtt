import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { unresolvedFeature } from './unresolvedBonfireTestUtils'

describe('coverage gaps stay generic', () => {
  it('exports a structurally valid Actor with coverage entries instead of requiring a character patch', async () => {
    const { bundle } = await buildBonfireBundle({}, (character) => {
      character.identity.classText.value = 'Classe Nova 3'
      character.identity.classes = [{ name: 'Classe Nova', level: 3 }]
      character.features.push(unresolvedFeature('Regra de Classe Nova Sem Seed', 'class', 'classFeature', 'R33'))
    })

    const missingRules = bundle.audit.auditDebug.bonfireMissingRules ?? []
    const sourceText = readFileSync('src/lib/foundry/items/index.ts', 'utf8')

    expect(bundle.audit.importReadiness.canExport).toBe(true)
    expect(bundle.audit.importReadiness.status).toBe('ready-with-review')
    expect(missingRules.some((entry) => entry.name === 'Regra de Classe Nova Sem Seed' && entry.reason === 'not-found-in-bonfire-rule-store')).toBe(true)
    expect(sourceText).not.toContain('Johnny')
    expect(sourceText).not.toContain('Nanna')
    expect(sourceText).not.toContain('Pipkin')
  })
})
