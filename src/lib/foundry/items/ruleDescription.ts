import type { BonfireSpellOverrideRule } from '../../rules/bonfireTypes'
import { getBonfireRuleEntity } from '../../rules/store/bonfireRuleStore'
import { escapeHtml } from '../mapWeapons'

export type ItemDescriptionStatus = 'complete' | 'fallback' | 'missing'

export type ItemDescriptionMeta = {
  html: string
  status: ItemDescriptionStatus
  sourceUrl?: string
  sourceName?: string
  warningCodes: string[]
  warningMessages: string[]
  overrideApplied?: boolean
}

type RuleDescriptionOptions = {
  itemName: string
  itemKind: string
  ruleId?: string
  fallbackText?: string
  sourceUrl?: string
  sourceName?: string
}

type SpellDescriptionOptions = {
  itemName: string
  fallbackText?: string
  overrideRule?: BonfireSpellOverrideRule
}

export function buildRuleDescriptionMeta(options: RuleDescriptionOptions): ItemDescriptionMeta {
  const entity = getBonfireRuleEntity(options.ruleId)
  const sourceUrl = entity?.sourceUrl ?? options.sourceUrl
  const sourceName = entity?.sourceName ?? options.sourceName ?? 'Bonfire Tales'
  const primaryDescription = sanitizeRuleText(entity?.description)
  const shortDescription = sanitizeRuleText(entity?.shortDescription)

  if (primaryDescription) {
    return {
      html: renderRuleDescriptionHtml({
        title: entity?.name ?? options.itemName,
        body: primaryDescription,
        kind: entity?.kind ?? options.itemKind,
        sourceName,
        sourceUrl,
      }),
      status: 'complete',
      sourceUrl,
      sourceName,
      warningCodes: [],
      warningMessages: [],
    }
  }

  if (shortDescription) {
    return {
      html: renderRuleDescriptionHtml({
        title: entity?.name ?? options.itemName,
        body: shortDescription,
        kind: entity?.kind ?? options.itemKind,
        sourceName,
        sourceUrl,
      }),
      status: 'fallback',
      sourceUrl,
      sourceName,
      warningCodes: ['RULE_DESCRIPTION_FALLBACK_USED'],
      warningMessages: ['Descricao detalhada ausente no seed local; usando resumo curto da regra.'],
    }
  }

  if (sourceUrl) {
    return {
      html: renderRuleDescriptionHtml({
        title: entity?.name ?? options.itemName,
        body: 'Descricao detalhada nao cadastrada no seed local. Consulte a fonte Bonfire Tales.',
        kind: entity?.kind ?? options.itemKind,
        sourceName,
        sourceUrl,
      }),
      status: 'fallback',
      sourceUrl,
      sourceName,
      warningCodes: ['RULE_DESCRIPTION_FALLBACK_USED'],
      warningMessages: ['Descricao detalhada ausente no seed local; item exportado com link para consulta.'],
    }
  }

  const fallbackText = sanitizeRuleText(options.fallbackText) ?? 'Descricao generica preservada para revisao manual.'
  return {
    html: renderRuleDescriptionHtml({
      title: options.itemName,
      body: fallbackText,
      kind: options.itemKind,
      sourceName: options.sourceName ?? 'Conversor local',
      sourceUrl: undefined,
    }),
    status: 'missing',
    sourceUrl: undefined,
    sourceName: options.sourceName ?? 'Conversor local',
    warningCodes: ['RULE_DESCRIPTION_MISSING'],
    warningMessages: ['Descricao ausente no Rule Store; mantendo fallback seguro.'],
  }
}

export function buildSpellDescriptionMeta(options: SpellDescriptionOptions): ItemDescriptionMeta {
  const rule = options.overrideRule
  const baseDescription = sanitizeRuleText(rule?.baseDescription)
  const overrideDescription = sanitizeRuleText(rule?.description)
  const sourceUrl = rule?.sourceUrl
  const sourceName = 'Bonfire Tales'
  const overrideApplied = Boolean(rule && rule.status !== 'allowed' && overrideDescription)
  const warningCodes: string[] = []
  const warningMessages: string[] = []

  if (overrideApplied) {
    warningCodes.push('SPELL_OVERRIDE_DESCRIPTION_APPLIED')
    warningMessages.push(`Ajuste Bonfire aplicado para ${options.itemName}.`)
  }

  if (baseDescription) {
    return {
      html: renderRuleDescriptionHtml({
        title: options.itemName,
        body: baseDescription,
        kind: 'spell',
        sourceName,
        sourceUrl,
        overrideHtml:
          overrideApplied && overrideDescription
            ? `<section class="bonfire-override"><h3>Ajuste Bonfire</h3>${paragraphs(overrideDescription)}${rule?.foundryNotes ? paragraphs(rule.foundryNotes) : ''}</section>`
            : undefined,
      }),
      status: 'complete',
      sourceUrl,
      sourceName,
      warningCodes,
      warningMessages,
      overrideApplied,
    }
  }

  if (overrideDescription || sourceUrl) {
    const body = overrideDescription ?? 'Descricao detalhada nao cadastrada no seed local. Consulte a fonte Bonfire Tales.'
    warningCodes.push('RULE_DESCRIPTION_FALLBACK_USED')
    warningMessages.push('Magia exportada com descricao fallback baseada no seed local.')
    return {
      html: renderRuleDescriptionHtml({
        title: options.itemName,
        body,
        kind: 'spell',
        sourceName,
        sourceUrl,
        overrideHtml:
          overrideApplied && rule?.foundryNotes
            ? `<section class="bonfire-override"><h3>Ajuste Bonfire</h3>${paragraphs(rule.foundryNotes)}</section>`
            : undefined,
      }),
      status: 'fallback',
      sourceUrl,
      sourceName,
      warningCodes,
      warningMessages,
      overrideApplied,
    }
  }

  return {
    html: renderRuleDescriptionHtml({
      title: options.itemName,
      body: sanitizeRuleText(options.fallbackText) ?? 'Magia extraida da aba Magias. Revise a descricao manualmente.',
      kind: 'spell',
      sourceName: 'Conversor local',
      sourceUrl: undefined,
    }),
    status: 'missing',
    sourceUrl: undefined,
    sourceName: 'Conversor local',
    warningCodes: ['RULE_DESCRIPTION_MISSING'],
    warningMessages: ['Magia sem descricao no seed local.'],
    overrideApplied: false,
  }
}

function renderRuleDescriptionHtml({
  title,
  body,
  kind,
  sourceName,
  sourceUrl,
  overrideHtml,
}: {
  title: string
  body: string
  kind: string
  sourceName: string
  sourceUrl?: string
  overrideHtml?: string
}): string {
  return [
    '<section class="bonfire-rule">',
    `<h2>${escapeHtml(title)}</h2>`,
    paragraphs(body),
    overrideHtml ?? '',
    '<hr>',
    `<p><strong>Tipo:</strong> ${escapeHtml(kind)}</p>`,
    `<p><strong>Fonte:</strong> ${escapeHtml(sourceName)}</p>`,
    sourceUrl ? `<p><strong>URL:</strong> <a href="${escapeAttribute(sourceUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(sourceUrl)}</a></p>` : '',
    '</section>',
  ].join('')
}

function paragraphs(value: string): string {
  return value
    .split(/\n{2,}|\r\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function sanitizeRuleText(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return trimmed ? trimmed : undefined
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
