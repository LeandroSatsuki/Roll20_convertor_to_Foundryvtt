import type { FoundryLibraryEntry } from './foundryReferenceLibraryTypes'

export function qualityScore(entry: FoundryLibraryEntry): number {
  return [
    entry.quality.hasActivities ? 30 : 0,
    entry.quality.hasMidiProperties ? 25 : 0,
    entry.quality.hasEffects ? 20 : 0,
    entry.quality.hasPlutoniumFlags ? 15 : 0,
    entry.quality.hasCompendiumSource ? 10 : 0,
    entry.quality.hasDescription ? 8 : 0,
    entry.quality.hasUses ? 6 : 0,
    entry.quality.hasDamageOrHealing ? 6 : 0,
    entry.spell?.level !== undefined ? 3 : 0,
    -countEmptyImportantFields(entry),
  ].reduce((sum, value) => sum + value, 0)
}

export function preferredEntry(entries: FoundryLibraryEntry[]): FoundryLibraryEntry | undefined {
  return [...entries].sort((left, right) => qualityScore(right) - qualityScore(left))[0]
}

export function groupLibraryEntries(entries: FoundryLibraryEntry[]): { byNormalizedName: Map<string, FoundryLibraryEntry[]>; preferredByKey: Map<string, FoundryLibraryEntry> } {
  const byNormalizedName = new Map<string, FoundryLibraryEntry[]>()
  for (const entry of entries) {
    const keys = Array.from(new Set([entry.normalizedName, entry.normalizedNameWithoutParentheses, entry.identifier, ...entry.aliases].filter(Boolean) as string[]))
    for (const key of keys) {
      const list = byNormalizedName.get(key) ?? []
      list.push(entry)
      byNormalizedName.set(key, list)
    }
  }
  const preferredByKey = new Map<string, FoundryLibraryEntry>()
  for (const [key, list] of byNormalizedName) {
    const preferred = preferredEntry(list)
    if (preferred) preferredByKey.set(key, preferred)
  }
  return { byNormalizedName, preferredByKey }
}

function countEmptyImportantFields(entry: FoundryLibraryEntry): number {
  return [entry.identifier, entry.source?.book, entry.source?.custom, entry.source?.rules, entry.plutonium?.hash, entry.dnd5e?.sourceId].filter((value) => !value).length
}
