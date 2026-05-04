import { isRecord, validation, type FoundryValidationResult } from './foundryValidationReport'

export function validateFoundryUses(uses: unknown, path: string, itemName?: string, itemId?: string): FoundryValidationResult[] {
  if (uses === undefined) return []
  if (!isRecord(uses)) return [validation('FOUNDRY_USES_INVALID', 'error', 'system.uses deve ser objeto quando existir.', path, itemName, itemId)]
  const results: FoundryValidationResult[] = []
  if (!['string', 'number', 'object', 'undefined'].includes(typeof uses.max)) {
    results.push(validation('FOUNDRY_USES_MAX_INVALID', 'error', 'system.uses.max deve ser string, número ou null.', `${path}.max`, itemName, itemId))
  }
  if (uses.max !== undefined && uses.max !== null && typeof uses.max !== 'string' && typeof uses.max !== 'number') {
    results.push(validation('FOUNDRY_USES_MAX_INVALID', 'error', 'system.uses.max deve ser string, número ou null.', `${path}.max`, itemName, itemId))
  }
  if (uses.spent !== undefined && uses.spent !== null && typeof uses.spent !== 'number') {
    results.push(validation('FOUNDRY_USES_SPENT_INVALID', 'error', 'system.uses.spent deve ser número ou null.', `${path}.spent`, itemName, itemId))
  }
  if (uses.recovery !== undefined && !Array.isArray(uses.recovery)) {
    results.push(validation('FOUNDRY_USES_RECOVERY_INVALID', 'warning', 'system.uses.recovery deve ser array quando usado; recovery será revisão manual.', `${path}.recovery`, itemName, itemId))
  }
  if (Array.isArray(uses.recovery)) {
    uses.recovery.forEach((entry, index) => {
      if (!isRecord(entry)) results.push(validation('FOUNDRY_USES_RECOVERY_ENTRY_INVALID', 'warning', 'Entrada de recovery incompleta.', `${path}.recovery.${index}`, itemName, itemId))
    })
  }
  return results
}
