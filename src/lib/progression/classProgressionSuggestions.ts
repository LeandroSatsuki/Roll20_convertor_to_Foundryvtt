import type { FoundryActor } from '../foundry/foundryTypes'
import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'
import { defaultBonfireRuleStore } from '../rules/bonfireRuleStore'
import { normalizeFoundryLibraryName } from '../foundry-library/foundryLibraryAliases'

export type ClassProgressionSuggestion = {
  expectedFeature: string
  level: number
  foundInSheet: boolean
  foundInLibrary: boolean
  action: 'already-present' | 'suggest' | 'ignore-subclass' | 'manual-review'
}

export function buildClassProgressionSuggestions(character: NormalizedCharacter, actor?: FoundryActor | null): ClassProgressionSuggestion[] {
  const mainClass = character.identity.classes[0]
  if (!mainClass?.name || !mainClass.level) return []
  const classRule = defaultBonfireRuleStore.classes.find((rule) => normalizeFoundryLibraryName(rule.name) === normalizeFoundryLibraryName(mainClass.name) || rule.aliases.some((alias) => normalizeFoundryLibraryName(alias) === normalizeFoundryLibraryName(mainClass.name)))
  if (!classRule) return []

  const presentSheet = new Set(character.features.map((feature) => normalizeFoundryLibraryName(feature.name.value)))
  const presentActor = new Set((actor?.items ?? []).map((item) => normalizeFoundryLibraryName(item.name)))
  const suggestions: ClassProgressionSuggestion[] = []

  for (const [levelText, features] of Object.entries(classRule.featuresByLevel ?? {})) {
    const level = Number(levelText)
    if (!Number.isInteger(level) || level > mainClass.level) continue
    for (const feature of features) {
      const key = normalizeFoundryLibraryName(feature.name)
      const foundInSheet = presentSheet.has(key)
      const foundInLibrary = presentActor.has(key)
      suggestions.push({
        expectedFeature: feature.name,
        level,
        foundInSheet,
        foundInLibrary,
        action: foundInSheet ? 'already-present' : 'suggest',
      })
    }
  }

  const subclassRule = defaultBonfireRuleStore.subclasses.find((rule) => normalizeFoundryLibraryName(rule.className) === normalizeFoundryLibraryName(mainClass.name))
  if (subclassRule && mainClass.subclass) {
    for (const [levelText, features] of Object.entries(subclassRule.featuresByLevel ?? {})) {
      const level = Number(levelText)
      if (!Number.isInteger(level) || level > mainClass.level) continue
      for (const feature of features) {
        suggestions.push({
          expectedFeature: feature.name,
          level,
          foundInSheet: presentSheet.has(normalizeFoundryLibraryName(feature.name)),
          foundInLibrary: presentActor.has(normalizeFoundryLibraryName(feature.name)),
          action: 'ignore-subclass',
        })
      }
    }
  }

  return suggestions
}
