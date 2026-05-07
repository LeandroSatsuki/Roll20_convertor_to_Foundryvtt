import type { FoundryItem } from '../foundry/foundryTypes'
import { matchFoundryLibraryItem } from '../foundry-library/foundryLibraryMatcher'
import { cloneFoundryLibraryItem, markFallbackHydration } from '../foundry-library/cloneFoundryLibraryItem'
import type { FoundryReferenceLibrary } from '../foundry-library/foundryReferenceLibraryTypes'
import { resolveSpellOverride } from '../rules/spellResolver'
import { toDnd5eClassKey } from '../spellcasting/classSpellcastingRules'
import type { AbilityKey } from '../normalize/normalizedCharacterTypes'
import { classifyHydrationFallback, fallbackReason, shouldHydrateWithLibrary } from './hydrationPriority'

export function hydrateSpellItem(item: FoundryItem, library: FoundryReferenceLibrary, context: { characterClass?: string; spellcastingAbility?: AbilityKey | null }): FoundryItem {
  const level = typeof item.system.level === 'number' ? item.system.level : undefined
  const sourceClass = toDnd5eClassKey(context.characterClass)
  const match = matchFoundryLibraryItem(library, {
    requestedName: item.name,
    requestedType: 'spell',
    characterClass: context.characterClass,
    spellLevel: level,
    sourceClass,
  })
  if (!shouldHydrateWithLibrary(match)) {
    return markFallbackHydration(item, item.name, 'spell', match.warnings.includes('FOUNDRY_LIBRARY_TYPE_CONFLICT') ? 'type-conflict' : fallbackReason(match), {
      fallbackCategory: classifyHydrationFallback(item, 'spell', match),
      matchScore: match.best?.score,
      matchConfidence: match.best?.confidence ?? match.confidence,
      warnings: match.warnings,
      ambiguous: match.warnings.includes('FOUNDRY_LIBRARY_AMBIGUOUS_MATCH'),
    })
  }

  const hydrated = cloneFoundryLibraryItem(match, item.name, 'spell')
  hydrated.system = { ...hydrated.system }
  hydrated.system.level = level ?? hydrated.system.level ?? 0
  hydrated.system.method = 'spell'
  hydrated.system.sourceClass = sourceClass
  hydrated.system.ability = context.spellcastingAbility ?? hydrated.system.ability ?? ''
  hydrated.system.preparation = normalizePreparation(hydrated.system.preparation)
  hydrated.system.description = appendBonfireSpellOverride(hydrated.system.description, item.name)
  return hydrated
}

function normalizePreparation(value: unknown): Record<string, unknown> {
  const existing = value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {}
  return {
    ...existing,
    mode: existing.mode ?? 'prepared',
    prepared: existing.prepared ?? true,
  }
}

function appendBonfireSpellOverride(description: unknown, spellName: string): Record<string, unknown> {
  const existing = description && typeof description === 'object' && !Array.isArray(description) ? { ...(description as Record<string, unknown>) } : {}
  const value = typeof existing.value === 'string' ? existing.value : ''
  const override = resolveSpellOverride(spellName)
  if (!override || value.includes('Ajuste Bonfire')) return { ...existing, value, chat: existing.chat ?? '' }
  const block = `<section class="bonfire-override"><h2>Ajuste Bonfire</h2><p>${escapeHtml(override.description || override.shortDescription || 'Esta magia possui ajuste Bonfire no seed local.')}</p>${override.sourceUrl ? `<p><strong>URL:</strong> ${escapeHtml(override.sourceUrl)}</p>` : ''}</section>`
  return { ...existing, value: `${value}${value ? '\n' : ''}${block}`, chat: existing.chat ?? '' }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
