import type { FoundryLibraryEntry, FoundryLibraryReport, FoundryReferenceLibrary } from './foundryReferenceLibraryTypes'

export function buildFoundryLibraryReport(libraryId: string, files: FoundryReferenceLibrary['files'], entries: FoundryLibraryEntry[]): FoundryLibraryReport {
  return {
    libraryId,
    filesLoadedCount: files.length,
    itemsLoadedCount: entries.length,
    spellsLoadedCount: entries.filter((entry) => entry.type === 'spell').length,
    featsLoadedCount: entries.filter((entry) => entry.type === 'feat').length,
    equipmentLoadedCount: entries.filter((entry) => ['equipment', 'loot', 'tool'].includes(entry.type)).length,
    weaponsLoadedCount: entries.filter((entry) => entry.type === 'weapon').length,
    consumablesLoadedCount: entries.filter((entry) => entry.type === 'consumable').length,
    itemsWithActivitiesCount: entries.filter((entry) => entry.quality.hasActivities).length,
    itemsWithEffectsCount: entries.filter((entry) => entry.quality.hasEffects).length,
    itemsWithMidiCount: entries.filter((entry) => entry.quality.hasMidiProperties).length,
    itemsWithPlutoniumCount: entries.filter((entry) => entry.quality.hasPlutoniumFlags).length,
    rejectedItemsCount: files.reduce((sum, file) => sum + file.rejectedItemCount, 0),
  }
}

export function summarizeFoundryReferenceLibrary(library: FoundryReferenceLibrary | null | undefined): FoundryLibraryReport | null {
  return library?.report ?? null
}
