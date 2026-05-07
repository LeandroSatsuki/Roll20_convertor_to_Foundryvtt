import { describe, expect, it } from 'vitest'
import { buildBonfireBundle } from './bonfireBundleFixture'

describe('classProgressionSuggestion', () => {
  it('suggests missing class features and skips subclass features for custom subclass handling', async () => {
    const { bundle } = await buildBonfireBundle({}, (character) => {
      character.identity.classes = [{ name: 'Clérigo', level: 5, subclass: 'Clérigo do Caos' }]
      character.identity.classText.value = 'Clérigo 5'
      character.features = character.features.filter((feature) => feature.name.value !== 'Autoridade Sagrada')
    })

    const suggestions = ((bundle.actor.flags['roll20-to-foundry'] as Record<string, unknown> | undefined)?.classProgressionSuggestions as Array<Record<string, unknown>> | undefined) ?? []
    const suggested = suggestions.find((entry) => entry.expectedFeature === 'Autoridade Sagrada')
    const ignoredSubclass = suggestions.find((entry) => entry.action === 'ignore-subclass')

    expect(suggested?.action).toBe('suggest')
    expect(ignoredSubclass).toBeTruthy()
    expect(bundle.audit.summary.classProgressionSuggestedCount).toBeGreaterThan(0)
    expect(bundle.audit.validations.some((validation) => validation.code === 'CLASS_PROGRESSION_FEATURE_SUGGESTED')).toBe(true)
    expect(bundle.audit.validations.some((validation) => validation.code === 'SUBCLASS_FEATURE_SKIPPED_CUSTOM_SUBCLASS')).toBe(true)
  })
})
