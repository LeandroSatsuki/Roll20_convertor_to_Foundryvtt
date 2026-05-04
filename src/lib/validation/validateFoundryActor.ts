import { z } from 'zod'
import { isValidFoundryIdentifier } from '../foundry/identifiers'
import { validateFoundryActorDeep } from '../foundry/validateFoundryActor'

const foundryItemSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  system: z.object({
    identifier: z.string().regex(/^[a-z0-9_-]+$/),
  }).passthrough(),
}).passthrough()

export const foundryActorSchema = z.object({
  name: z.string().min(1),
  type: z.literal('character'),
  img: z.string(),
  system: z.record(z.unknown()),
  prototypeToken: z.record(z.unknown()),
  items: z.array(foundryItemSchema),
  effects: z.array(z.unknown()),
  flags: z.record(z.unknown()),
  _stats: z.object({
    systemId: z.literal('dnd5e'),
    systemVersion: z.literal('5.2.4'),
  }),
})

export function validateFoundryActor(actor: unknown) {
  const zodResult = foundryActorSchema.safeParse(actor)
  const deepErrors = validateFoundryActorDeep(actor).filter((result) => result.severity === 'error')
  return {
    success: zodResult.success && deepErrors.length === 0,
    data: zodResult.success ? zodResult.data : undefined,
    error: zodResult.success ? undefined : zodResult.error,
    validations: validateFoundryActorDeep(actor),
  }
}

export type InvalidFoundryItemIdentifier = {
  itemName: string
  identifier: unknown
  index: number
}

export function getInvalidFoundryItemIdentifiers(actor: unknown): InvalidFoundryItemIdentifier[] {
  if (!actor || typeof actor !== 'object' || !('items' in actor) || !Array.isArray(actor.items)) return []

  return actor.items.flatMap((item, index) => {
    const itemRecord = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const system = itemRecord.system && typeof itemRecord.system === 'object' ? (itemRecord.system as Record<string, unknown>) : {}
    const identifier = system.identifier
    if (isValidFoundryIdentifier(identifier)) return []
    return [
      {
        itemName: typeof itemRecord.name === 'string' ? itemRecord.name : `Item ${index + 1}`,
        identifier,
        index,
      },
    ]
  })
}
