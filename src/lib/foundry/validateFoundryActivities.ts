import { isRecord, validation, type FoundryValidationResult } from './foundryValidationReport'

const allowedActivityTypes = new Set(['attack', 'damage', 'heal', 'save', 'utility', 'check', 'summon', 'enchant', 'cast'])

export function validateFoundryActivities(activities: unknown, path: string, itemName?: string, itemId?: string): FoundryValidationResult[] {
  if (activities === undefined) return []
  if (!isRecord(activities) && !Array.isArray(activities)) {
    return [validation('FOUNDRY_ACTIVITIES_INVALID', 'error', 'system.activities deve ser objeto ou array.', path, itemName, itemId)]
  }
  const values = Array.isArray(activities) ? activities : Object.values(activities)
  const results: FoundryValidationResult[] = []
  values.forEach((activity, index) => {
    if (!isRecord(activity)) {
      results.push(validation('FOUNDRY_ACTIVITY_INVALID', 'warning', 'Activity incompleta; exportar sem activity é mais seguro.', `${path}.${index}`, itemName, itemId))
      return
    }
    if (typeof activity._id !== 'string' || !activity._id) {
      results.push(validation('FOUNDRY_ACTIVITY_ID_MISSING', 'warning', 'Activity sem _id; revisar ou remover activity.', `${path}.${index}._id`, itemName, itemId))
    }
    if (typeof activity.type !== 'string' || !allowedActivityTypes.has(activity.type)) {
      results.push(validation('FOUNDRY_ACTIVITY_TYPE_INVALID', 'warning', 'Activity sem type válido; revisar antes de usar automações.', `${path}.${index}.type`, itemName, itemId))
    }
  })
  return results
}
