import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { isTemplateNoiseOrPlaceholder, normalizeTemplateFeatureValue } from '../lib/sheets/templateNoise'

describe('templateNoiseDoesNotBecomeFeature', () => {
  it('rejects template headers/placeholders and keeps level-prefixed feature names', async () => {
    expect(isTemplateNoiseOrPlaceholder('Raça')).toBe(true)
    expect(isTemplateNoiseOrPlaceholder('Classe')).toBe(true)
    expect(isTemplateNoiseOrPlaceholder('Talentos')).toBe(true)
    expect(isTemplateNoiseOrPlaceholder('Nível 5')).toBe(true)
    expect(normalizeTemplateFeatureValue('Nível 5: Marca Anômala')).toBe('Marca Anômala')

    const { character, bundle } = await buildBonfireBundle({
      overrides: [
        { sheetName: 'LOG', address: 'R31', value: 'Raça' },
        { sheetName: 'LOG', address: 'R32', value: 'Classe' },
        { sheetName: 'LOG', address: 'Z31', value: 'Talentos' },
        { sheetName: 'LOG', address: 'Z32', value: 'Nível 5' },
        { sheetName: 'LOG', address: 'AH31', value: 'Nível 5: Marca Anômala' },
      ],
    })

    const featureNames = character.features.map((feature) => feature.name.value)
    const itemNames = bundle.actor.items.map((item) => item.name)

    expect(featureNames).not.toContain('Raça')
    expect(featureNames).not.toContain('Classe')
    expect(featureNames).not.toContain('Talentos')
    expect(featureNames).not.toContain('Nível 5')
    expect(featureNames).toContain('Marca Anômala')
    expect(itemNames).not.toContain('Raça')
    expect(itemNames).not.toContain('Classe')
    expect(itemNames).not.toContain('Talentos')
    expect(itemNames).not.toContain('Nível 5')
    expect(itemNames.some((name) => name.includes('Marca Anômala'))).toBe(true)
  })
})
