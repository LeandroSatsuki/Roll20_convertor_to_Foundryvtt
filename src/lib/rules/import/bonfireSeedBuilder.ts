import type { BonfireRuleEntity } from '../schema/bonfireEntityTypes'

export function buildBonfireSeedJson(entities: BonfireRuleEntity[]): string {
  return JSON.stringify(
    entities.map((entity) => ({
      id: entity.id,
      identifier: entity.identifier,
      name: entity.name,
      aliases: entity.aliases,
      kind: entity.kind,
      sourceUrl: entity.sourceUrl,
      description: entity.shortDescription ?? entity.description ?? '',
      foundry: entity.foundry,
      tags: entity.tags,
    })),
    null,
    2,
  )
}
