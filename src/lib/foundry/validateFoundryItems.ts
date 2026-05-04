import { isValidFoundryIdentifier } from './identifiers'
import { hasUndefinedDeep, isRecord, validation, type FoundryValidationResult } from './foundryValidationReport'
import { validateFoundryActivities } from './validateFoundryActivities'
import { validateFoundryUses } from './validateFoundryUses'

const allowedItemTypes = new Set(['class', 'subclass', 'race', 'background', 'feat', 'weapon', 'equipment', 'consumable', 'loot', 'spell', 'tool'])
const foundryIdPattern = /^[A-Za-z0-9]{16}$/

export function validateFoundryItems(actor: unknown): FoundryValidationResult[] {
  const actorRecord = isRecord(actor) ? actor : {}
  if (!Array.isArray(actorRecord.items)) return [validation('FOUNDRY_ITEMS_NOT_ARRAY', 'error', 'actor.items deve ser array.', 'items')]
  const usedIdentifiers = new Map<string, string>()
  const results: FoundryValidationResult[] = []
  actorRecord.items.forEach((item, index) => {
    const path = `items.${index}`
    if (!isRecord(item)) {
      results.push(validation('FOUNDRY_ITEM_INVALID', 'error', 'Item deve ser objeto.', path))
      return
    }
    const itemName = typeof item.name === 'string' ? item.name : ''
    const itemId = typeof item._id === 'string' ? item._id : undefined
    if (!itemId || !foundryIdPattern.test(itemId)) results.push(validation('FOUNDRY_ITEM_ID_INVALID', 'error', 'Item _id inválido.', `${path}._id`, itemName, itemId))
    if (!itemName) results.push(validation('FOUNDRY_ITEM_NAME_MISSING', 'error', 'Item sem name.', `${path}.name`, itemName, itemId))
    if (typeof item.type !== 'string' || !item.type) {
      results.push(validation('FOUNDRY_ITEM_TYPE_MISSING', 'error', 'Item sem type.', `${path}.type`, itemName, itemId))
    } else if (!allowedItemTypes.has(item.type)) {
      results.push(validation('FOUNDRY_ITEM_TYPE_INVALID', 'error', `Item type inválido: ${item.type}.`, `${path}.type`, itemName, itemId))
    }
    if (!isRecord(item.system)) {
      results.push(validation('FOUNDRY_ITEM_SYSTEM_MISSING', 'error', 'Item sem system.', `${path}.system`, itemName, itemId))
    } else {
      const identifier = item.system.identifier
      if (!isValidFoundryIdentifier(identifier)) {
        results.push(validation('FOUNDRY_ITEM_IDENTIFIER_INVALID', 'error', `Identifier inválido: ${String(identifier)}.`, `${path}.system.identifier`, itemName, itemId))
      } else {
        const safeIdentifier = String(identifier)
        const previous = usedIdentifiers.get(safeIdentifier)
        if (previous) results.push(validation('FOUNDRY_ITEM_IDENTIFIER_DUPLICATE', 'error', `Identifier duplicado com ${previous}: ${safeIdentifier}.`, `${path}.system.identifier`, itemName, itemId))
        usedIdentifiers.set(safeIdentifier, itemName || itemId || path)
      }
      results.push(...validateFoundryUses(item.system.uses, `${path}.system.uses`, itemName, itemId))
      results.push(...validateFoundryActivities(item.system.activities, `${path}.system.activities`, itemName, itemId))
    }
    if (!isRecord(item.flags) || !isRecord(item.flags['roll20-to-foundry'])) {
      results.push(validation('FOUNDRY_ITEM_CONVERTER_FLAGS_MISSING', 'warning', 'Item gerado sem flags roll20-to-foundry.', `${path}.flags.roll20-to-foundry`, itemName, itemId))
    }
    if (hasUndefinedDeep(item)) results.push(validation('FOUNDRY_ITEM_UNDEFINED', 'error', 'Item contém undefined.', path, itemName, itemId))
  })
  return results
}
