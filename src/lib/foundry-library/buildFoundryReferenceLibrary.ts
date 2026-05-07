import { foundryId } from '../foundry/ids'
import { buildFoundryLibraryReport } from './foundryLibraryReport'
import { groupLibraryEntries } from './foundryLibraryDeduper'
import { indexFoundryActorItems } from './foundryLibraryIndexer'
import type { FoundryLibraryEntry, FoundryReferenceLibrary, FoundryReferenceLibraryInput } from './foundryReferenceLibraryTypes'

export function buildFoundryReferenceLibrary(inputs: FoundryReferenceLibraryInput[]): FoundryReferenceLibrary {
  const files: FoundryReferenceLibrary['files'] = []
  const entries = inputs.flatMap((input) => {
    const indexed = indexFoundryActorItems(input.actorJson, input.sourceFileName)
    files.push({
      fileName: input.sourceFileName,
      actorName: indexed.actorName,
      itemCount: indexed.itemCount,
      acceptedItemCount: indexed.entries.length,
      rejectedItemCount: indexed.rejectedItemCount,
    })
    return indexed.entries
  })
  const grouped = groupLibraryEntries(entries)
  const indexes = buildIndexes(entries, grouped.byNormalizedName)
  const libraryId = `foundry-library-${foundryId(12)}`
  const library: FoundryReferenceLibrary = {
    libraryId,
    files,
    entries,
    indexes,
    byNormalizedName: grouped.byNormalizedName,
    preferredByKey: grouped.preferredByKey,
    report: buildFoundryLibraryReport(libraryId, files, entries),
  }
  return library
}

function buildIndexes(entries: FoundryLibraryEntry[], byNormalizedName: Map<string, FoundryLibraryEntry[]>): FoundryReferenceLibrary['indexes'] {
  return {
    byNormalizedName,
    byIdentifier: groupBy(entries, (entry) => entry.identifier ?? ''),
    byType: groupBy(entries, (entry) => entry.type),
    byPlutoniumHash: groupBy(entries, (entry) => entry.plutonium?.hash ?? ''),
  }
}

function groupBy(entries: FoundryLibraryEntry[], keyFor: (entry: FoundryLibraryEntry) => string): Map<string, FoundryLibraryEntry[]> {
  const grouped = new Map<string, FoundryLibraryEntry[]>()
  for (const entry of entries) {
    const key = keyFor(entry)
    if (!key) continue
    const list = grouped.get(key) ?? []
    list.push(entry)
    grouped.set(key, list)
  }
  return grouped
}
