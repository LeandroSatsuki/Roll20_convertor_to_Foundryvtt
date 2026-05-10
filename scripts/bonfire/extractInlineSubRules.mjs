const rejectedTitles = new Set([
  'pre-requisito',
  'prerequisito',
  'efeito',
  'recarga',
  'fonte',
  'tipo',
  'nome',
  'mostrar',
  'especie',
  'espécie',
  'caracteristica racial',
  'característica racial',
  'caracteristicas raciais',
  'características raciais',
  'linhagem',
  'linhagens',
  'opcao',
  'opção',
  'regra',
])

export function extractInlineSubRules({ htmlNode, parentRule = {}, parentKind, sourceUrl }) {
  const html = String(htmlNode ?? '')
  const subRules = []
  const review = []

  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cellMatch) => cellMatch[1])
    if (cells.length < 2) continue

    const rowParent = parseParentCell(cells[0])
    const candidate = extractLeadingStrongCandidate(cells[1])
    if (!candidate) continue

    const built = buildSubRule({
      candidate,
      parentRule,
      parentKind,
      sourceUrl,
      parentOverride: rowParent,
    })

    if (built.review) review.push(built.review)
    if (built.subRule) subRules.push(built.subRule)
  }

  for (const match of html.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const candidate = extractLeadingStrongCandidate(match[2])
    if (!candidate) continue

    const built = buildSubRule({
      candidate,
      parentRule,
      parentKind,
      sourceUrl,
    })

    if (built.review) review.push(built.review)
    if (built.subRule) subRules.push(built.subRule)
  }

  const headingSections = extractHeadingSectionCandidates(html)
  for (const candidate of headingSections) {
    const built = buildSubRule({
      candidate,
      parentRule,
      parentKind,
      sourceUrl,
    })

    if (built.review) review.push(built.review)
    if (built.subRule) subRules.push(built.subRule)
  }

  return {
    subRules: dedupeSubRules(subRules),
    review: dedupeReview(review),
  }
}

export function inferSubRuleKindFromParentKind(parentKind) {
  const normalized = slug(parentKind)
  if (normalized === 'race' || normalized === 'racefeature' || normalized === 'essence') return 'raceFeature'
  if (normalized === 'class' || normalized === 'classfeature' || normalized === 'resource' || normalized === 'spellcasting') return 'classFeature'
  if (normalized === 'subclass' || normalized === 'subclassfeature') return 'subclassFeature'
  if (normalized === 'background' || normalized === 'backgroundfeature') return 'backgroundFeature'
  if (normalized === 'feat' || normalized === 'originfeat' || normalized === 'racialfeat') return 'feat'
  return 'customBonfireFeature'
}

function extractLeadingStrongCandidate(innerHtml) {
  const html = String(innerHtml ?? '').trim()
  if (!html) return null
  const match = html.match(/^\s*(?:<div\b[^>]*>\s*)*<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*([:.\-–—]?)\s*([\s\S]*)$/i)
  if (!match) return null
  return {
    rawTitle: cleanLabel(match[1]),
    descriptionHtml: String(match[3] ?? '').trim(),
  }
}

function extractHeadingSectionCandidates(html) {
  const candidates = []
  const headings = [...String(html ?? '').matchAll(/<h([3-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
  for (let index = 0; index < headings.length; index += 1) {
    const current = headings[index]
    const next = headings[index + 1]
    const rawTitle = cleanLabel(htmlToText(current[2]))
    if (!rawTitle || /^(?:n[ií]vel|nivel|level)\s+\d+/i.test(rawTitle)) continue
    const sectionHtml = String(html ?? '').slice(current.index + current[0].length, next?.index ?? String(html ?? '').length).trim()
    const descriptionHtml = trimLeadingSpacing(sectionHtml)
    const descriptionText = cleanRuleText(htmlToRuleText(descriptionHtml))
    if (!descriptionText) continue
    candidates.push({
      rawTitle,
      descriptionHtml,
    })
  }
  return candidates
}

function parseParentCell(cellHtml) {
  const text = cleanText(htmlToText(cellHtml))
  if (!text) return null
  const parentName = cleanParentName(text)
  if (!parentName) return null
  return {
    parentName,
    parentDisplayName: text,
  }
}

function buildSubRule({ candidate, parentRule, parentKind, sourceUrl, parentOverride = null }) {
  const title = cleanLabel(candidate.rawTitle)
  const kind = inferSubRuleKindFromParentKind(parentKind)
  const parentName = parentOverride?.parentName ?? parentRule.parentName ?? parentRule.name ?? parentRule.raceName ?? parentRule.className ?? parentRule.backgroundName ?? parentRule.subclassName ?? null
  const parentDisplayName = parentOverride?.parentDisplayName ?? parentRule.parentDisplayName ?? parentRule.displayName ?? parentRule.name ?? parentName
  const descriptionText = cleanRuleText(htmlToRuleText(candidate.descriptionHtml))

  if (!title || isRejectedTitle(title)) {
    return {
      subRule: null,
      review: title
        ? {
            name: title || '(sem titulo)',
            parentName: parentName ?? null,
            kind,
            sourceUrl: sourceUrl ?? null,
            descriptionStatus: 'needs-review',
            reason: 'generic-inline-bold-title',
          }
        : null,
    }
  }

  if (!descriptionText) {
    return {
      subRule: null,
      review: {
        name: title,
        parentName: parentName ?? null,
        kind,
        sourceUrl: sourceUrl ?? null,
        descriptionStatus: 'needs-review',
        reason: 'inline-bold-title-without-description',
      },
    }
  }

  const aliases = Array.from(
    new Set(
      [
        asciiAlias(title),
        parentName ? `${parentName}: ${title}` : null,
        parentName ? `${parentName} - ${title}` : null,
        parentDisplayName && parentDisplayName !== parentName ? `${parentDisplayName}: ${title}` : null,
        parentDisplayName && parentDisplayName !== parentName ? `${parentDisplayName} - ${title}` : null,
      ].filter(Boolean),
    ),
  )

  const bodyHtml = normalizeDescriptionBodyHtml(candidate.descriptionHtml, descriptionText)
  const subRule = {
    id: buildSubRuleId(kind, parentName, title),
    name: title,
    aliases,
    kind,
    source: 'bonfire',
    sourceUrl: sourceUrl ?? null,
    parentRuleId: buildParentRuleId(kind, parentName),
    parentName: parentName ?? undefined,
    parentDisplayName: parentDisplayName ?? undefined,
    descriptionText,
    descriptionHtml: renderSubRuleHtml({
      title,
      bodyHtml,
      parentDisplayName,
    }),
    descriptionStatus: 'complete',
    descriptionSource: 'inline-bold-subrule',
    tags: buildTags(kind, parentName),
    ...contextFields(kind, parentRule, parentName),
  }

  return {
    subRule,
    review: {
      name: title,
      parentName: parentName ?? null,
      kind,
      sourceUrl: sourceUrl ?? null,
      descriptionStatus: 'complete',
      reason: null,
    },
  }
}

function contextFields(kind, parentRule, parentName) {
  if (kind === 'raceFeature') return { raceName: parentName ?? parentRule.raceName ?? parentRule.name }
  if (kind === 'classFeature') return { className: parentRule.className ?? parentRule.name ?? parentName }
  if (kind === 'subclassFeature') {
    return {
      className: parentRule.className ?? undefined,
      subclassName: parentRule.subclassName ?? parentRule.name ?? parentName,
    }
  }
  if (kind === 'backgroundFeature') return { backgroundName: parentRule.backgroundName ?? parentRule.name ?? parentName }
  return {}
}

function buildTags(kind, parentName) {
  const tags = [kind, 'subrule']
  if (kind === 'raceFeature') tags.push('race')
  if (kind === 'classFeature') tags.push('class')
  if (kind === 'subclassFeature') tags.push('subclass')
  if (kind === 'backgroundFeature') tags.push('background')
  if (parentName) tags.push(slug(parentName))
  return Array.from(new Set(tags))
}

function buildSubRuleId(kind, parentName, title) {
  const prefix = kind === 'raceFeature'
    ? 'race-feature'
    : kind === 'classFeature'
      ? 'class-feature'
      : kind === 'subclassFeature'
        ? 'subclass-feature'
        : kind === 'backgroundFeature'
          ? 'background-feature'
          : kind === 'feat'
            ? 'feat-feature'
            : 'bonfire-subrule'
  return [prefix, parentName ? slug(parentName) : null, slug(title)].filter(Boolean).join('-')
}

function buildParentRuleId(kind, parentName) {
  if (!parentName) return undefined
  const prefix = kind === 'raceFeature'
    ? 'race'
    : kind === 'classFeature'
      ? 'class'
      : kind === 'subclassFeature'
        ? 'subclass'
        : kind === 'backgroundFeature'
          ? 'background'
          : 'bonfire-parent'
  return `${prefix}-${slug(parentName)}`
}

function renderSubRuleHtml({ title, bodyHtml, parentDisplayName }) {
  return [
    '<section class="bonfire-rule">',
    `<h2>${escapeHtml(title)}</h2>`,
    bodyHtml,
    parentDisplayName ? '<hr>' : '',
    parentDisplayName ? `<p><strong>Regra pai:</strong> ${escapeHtml(parentDisplayName)}</p>` : '',
    '</section>',
  ].filter(Boolean).join('')
}

function normalizeDescriptionBodyHtml(descriptionHtml, descriptionText) {
  const html = String(descriptionHtml ?? '').trim()
  if (!html) return `<p>${escapeHtml(descriptionText)}</p>`
  if (/^\s*</.test(html) && /<(p|ul|ol|table|div|blockquote)\b/i.test(html)) return sanitizeHtml(html)
  return `<p>${sanitizeHtml(html)}</p>`
}

function trimLeadingSpacing(value) {
  return String(value ?? '')
    .replace(/^(?:<span>\s*&nbsp;\s*<\/span>|<br\s*\/?>|\s|&nbsp;)+/gi, '')
    .trim()
}

function dedupeSubRules(subRules) {
  const seen = new Map()
  for (const subRule of subRules) {
    const key = `${slug(subRule.name)}::${slug(subRule.parentName ?? '')}::${subRule.kind}`
    const existing = seen.get(key)
    if (!existing || String(subRule.descriptionText ?? '').length > String(existing.descriptionText ?? '').length) {
      seen.set(key, subRule)
    }
  }
  return Array.from(seen.values())
}

function dedupeReview(items) {
  const seen = new Map()
  for (const item of items.filter(Boolean)) {
    const key = `${slug(item.name)}::${slug(item.parentName ?? '')}::${item.kind}::${item.reason ?? ''}`
    if (!seen.has(key)) seen.set(key, item)
  }
  return Array.from(seen.values())
}

function isRejectedTitle(title) {
  const normalized = slug(title).replace(/^-+|-+$/g, '')
  if (!normalized) return true
  if (rejectedTitles.has(normalized)) return true
  if (/^(nivel|level)-?\d+$/.test(normalized)) return true
  if (normalized.length < 3 || normalized.length > 90) return true
  return false
}

function cleanParentName(value) {
  return cleanText(String(value ?? '').replace(/\s*\([^)]*\)\s*$/u, '').trim())
}

function cleanLabel(value) {
  return cleanText(String(value ?? '').replace(/[.:\-–—]\s*$/u, '').trim())
}

function cleanText(value) {
  return decodeEntities(String(value ?? ''))
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanRuleText(value) {
  return decodeEntities(String(value ?? ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

function htmlToText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h[1-6]|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function htmlToRuleText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h[1-6]|ul|ol|table|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sanitizeHtml(html) {
  return String(html ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .trim()
}

function asciiAlias(value) {
  return decodeEntities(String(value ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function slug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
}
