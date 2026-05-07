import { isValidFoundryIdentifier, toFoundryIdentifier } from '../foundry/identifiers'
import { validateActivityShape } from '../foundry/activities'
import { asRecord } from './foundryLibraryIndexer'

export type SanitizedItemResult<T> = {
  item: T
  sanitizedActorReferences: number
  warnings: string[]
}

export function sanitizeFoundryLibraryItem<T>(item: T, oldItemId: string): SanitizedItemResult<T> {
  const warnings: string[] = []
  let sanitizedActorReferences = 0
  const record = asRecord(item) as Record<string, unknown>

  delete record.folder
  delete record.ownership
  delete record.permission
  delete record.sort

  const system = asRecord(record.system)
  record.system = system
  if (!isValidFoundryIdentifier(system.identifier)) system.identifier = toFoundryIdentifier(record.name, 'item')
  sanitizeActivities(system, warnings)
  sanitizedActorReferences += cleanRecord(system, oldItemId)

  const flags = asRecord(record.flags)
  record.flags = flags
  const dnd5e = asRecord(flags.dnd5e)
  if (typeof dnd5e.sourceId === 'string' && looksLikeOldActorReference(dnd5e.sourceId, oldItemId)) {
    delete dnd5e.sourceId
    sanitizedActorReferences += 1
  }
  if (Object.keys(dnd5e).length) flags.dnd5e = dnd5e
  sanitizedActorReferences += cleanRecord(flags, oldItemId)

  if (Array.isArray(record.effects)) {
    for (const effect of record.effects) {
      const effectRecord = asRecord(effect)
      if (typeof effectRecord.origin === 'string' && looksLikeOldActorReference(effectRecord.origin, oldItemId)) {
        delete effectRecord.origin
        sanitizedActorReferences += 1
      }
      sanitizedActorReferences += cleanRecord(effectRecord, oldItemId)
    }
  } else {
    record.effects = []
  }

  removeUndefinedDeep(record)
  if (sanitizedActorReferences > 0) warnings.push('FOUNDRY_LIBRARY_CLONED_WITH_CLEANED_ORIGIN')
  return { item, sanitizedActorReferences, warnings }
}

function sanitizeActivities(system: Record<string, unknown>, warnings: string[]) {
  const activities = system.activities
  if (!activities || typeof activities !== 'object') return
  if (Array.isArray(activities)) {
    for (let index = activities.length - 1; index >= 0; index -= 1) {
      const result = validateActivityShape(activities[index])
      if (!result.valid) {
        activities.splice(index, 1)
        warnings.push('ACTIVITY_INVALID_SHAPE')
      }
    }
    return
  }
  for (const [key, activity] of Object.entries(activities)) {
    const result = validateActivityShape(activity)
    if (!result.valid) {
      delete (activities as Record<string, unknown>)[key]
      warnings.push('ACTIVITY_INVALID_SHAPE')
    }
  }
}

function cleanRecord(value: Record<string, unknown>, oldItemId: string): number {
  let count = 0
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string') {
      if (looksLikeOldActorReference(child, oldItemId)) {
        value[key] = child.replace(/Actor\.[^.]+\./g, '').replace(oldItemId, '')
        count += 1
      }
    } else if (Array.isArray(child)) {
      for (const nested of child) {
        if (nested && typeof nested === 'object') count += cleanRecord(nested as Record<string, unknown>, oldItemId)
      }
    } else if (child && typeof child === 'object') {
      count += cleanRecord(child as Record<string, unknown>, oldItemId)
    }
  }
  return count
}

function looksLikeOldActorReference(value: string, oldItemId: string): boolean {
  return value.includes(`.${oldItemId}`) || value.includes(oldItemId) || /Actor\.[A-Za-z0-9]{16}\./.test(value)
}

function removeUndefinedDeep(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      if (value[index] === undefined) value.splice(index, 1)
      else removeUndefinedDeep(value[index])
    }
    return value
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const record = value as Record<string, unknown>
    if (record[key] === undefined) delete record[key]
    else removeUndefinedDeep(record[key])
  }
  return value
}
