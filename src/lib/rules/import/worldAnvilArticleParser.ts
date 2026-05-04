import { toFoundryIdentifier } from '../../foundry/identifiers'
import type { BonfireRuleEntity } from '../schema/bonfireEntityTypes'
import type { WorldAnvilManualArticle } from './worldAnvilTypes'

export function parseWorldAnvilArticleSummary(article: WorldAnvilManualArticle): BonfireRuleEntity {
  return {
    id: toFoundryIdentifier(article.title),
    identifier: toFoundryIdentifier(article.title),
    name: article.title,
    aliases: [],
    kind: 'unknown',
    sourceUrl: article.url,
    sourceName: 'World Anvil manual import',
    description: article.text.slice(0, 500),
    tags: article.category ? [article.category] : [],
  }
}

