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

function cleanText(value) {
  return decodeEntities(String(value ?? '')).replace(/\s+/g, ' ').trim()
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

function slug(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function htmlToText(html) {
  return decodeEntities(String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|tr|h[1-6]|td|th|ul|ol|table|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeHtml(html) {
  return String(html ?? '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .trim()
}

function cleanFeatureName(value) {
  return cleanText(value)
    .replace(/^\s*(?:•|-)\s*/, '')
    .replace(/^\s*\d+\s*[.)]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.:]\s*$/, '')
    .trim()
}

function extractHeadings(html) {
  const headings = []
  const regex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  let match
  while ((match = regex.exec(String(html ?? '')))) {
    headings.push({
      level: Number(match[1]),
      text: htmlToText(match[2]),
      start: match.index,
      end: regex.lastIndex,
    })
  }
  return headings
}

function sectionHtml(html, heading, headings) {
  if (!heading) return ''
  const next = headings.find((candidate) => candidate.start > heading.start && candidate.level <= heading.level)
  return String(html ?? '').slice(heading.end, next?.start ?? Math.min(String(html ?? '').length, heading.end + 6000))
}

function findParentHeading(heading, headings) {
  const previous = headings
    .filter((candidate) => candidate.start < heading.start && candidate.level < heading.level)
    .sort((left, right) => right.start - left.start)
  return previous[0] ?? null
}

function extractLeadingStrongCandidate(innerHtml) {
  const html = String(innerHtml ?? '').trim()
  if (!html) return null
  const match = html.match(/^\s*(?:<div\b[^>]*>\s*)*<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>\s*([:.\-–—]?)\s*([\s\S]*)$/i)
  if (!match) return null
  return {
    rawTitle: cleanFeatureName(match[1]),
    descriptionHtml: String(match[3] ?? '').trim(),
  }
}

function shortPreview(text) {
  const normalized = cleanText(text)
  if (!normalized) return ''
  return normalized.length > 180 ? `${normalized.slice(0, 177)}...` : normalized
}

function hasMechanicalSignals(text) {
  return /\b(vantagem|desvantagem|teste(?:s)? de resist[eê]ncia|a[cç][aã]o|a[cç][aã]o b[oô]nus|rea[cç][aã]o|descanso|magia|dano|deslocamento|profici[eê]ncia|cd\b|pontos? de vida|uma vez|enquanto|uso)\b/i.test(text)
}

function isGenericHeading(name) {
  return /^(descri[cç][aã]o|caracter[ií]sticas?|talentos?|regras?|informa[cç][oõ]es|sum[aá]rio|conte[uú]do)$/i.test(cleanText(name))
}

function looksLikePreview(html, text) {
  return /role="listbox"|toggle menu|create your account|gift a membership|worldanvil podcast|related articles|back to top|navigation|search/i.test(String(html ?? ''))
    || (cleanText(text).length < 110 && !hasMechanicalSignals(text))
}

function inferContextFields(rule) {
  return {
    className: rule.className ?? null,
    raceName: rule.raceName ?? null,
    subclassName: rule.subclassName ?? null,
    backgroundName: rule.backgroundName ?? null,
    parentName: rule.parentName ?? null,
  }
}

function buildContextCorpus(candidate) {
  return [
    candidate.heading,
    candidate.parentHeading,
    candidate.nearestArticleTitle,
    candidate.pageTitle,
    candidate.pageH1,
    candidate.sourceUrl,
    candidate.sourceFile,
  ].filter(Boolean).join(' | ')
}

function contextMismatch(rule, candidate) {
  const corpus = slug(buildContextCorpus(candidate))
  const contexts = inferContextFields(rule)
  const values = [contexts.className, contexts.raceName, contexts.subclassName, contexts.backgroundName, contexts.parentName]
    .filter(Boolean)
    .map((value) => slug(value))
  if (!values.length) return false
  const hasPositive = values.some((value) => corpus.includes(value))
  if (hasPositive) return false
  return candidate.headingLevel !== 'article'
}

export function scoreBonfireSectionCandidate(rule, candidate) {
  const reasons = []
  let score = 0
  const ruleName = slug(rule.name)
  const headingName = slug(candidate.heading)
  const contextCorpus = buildContextCorpus(candidate)
  const contextSlug = slug(contextCorpus)
  const rulePreview = cleanText(rule.shortDescription ?? '')
  const candidateText = cleanText(candidate.text ?? '')

  if (headingName === ruleName) {
    score += candidate.headingLevel === 'strong' ? 80 : 100
    reasons.push(candidate.headingLevel === 'strong' ? 'strong-name-exact' : 'heading-name-exact')
  }

  if (rule.parentName && [candidate.parentHeading, candidate.nearestArticleTitle, candidate.pageTitle, candidate.pageH1].filter(Boolean).some((value) => slug(value) === slug(rule.parentName) || slug(value).includes(slug(rule.parentName)))) {
    score += 60
    reasons.push('parent-context-match')
  }

  const contextualValue = rule.className ?? rule.raceName ?? rule.subclassName ?? rule.backgroundName
  if (contextualValue && contextSlug.includes(slug(contextualValue))) {
    score += 50
    reasons.push('entity-context-match')
  }

  if (rule.sourceUrl && candidate.sourceUrl && slug(rule.sourceUrl) === slug(candidate.sourceUrl)) {
    score += 40
    reasons.push('source-url-match')
  } else if (rule.sourceFile && candidate.sourceFile && slug(rule.sourceFile).includes(slug(candidate.sourceFile))) {
    score += 40
    reasons.push('source-file-slug-match')
  }

  score += 30
  reasons.push('same-article')

  if (candidateText.length >= 80 || hasMechanicalSignals(candidateText)) {
    score += 25
    reasons.push('sufficient-body')
  }

  if (hasMechanicalSignals(candidateText)) {
    score += 20
    reasons.push('mechanical-terms')
  }

  if (candidate.immediateBody) {
    score += 15
    reasons.push('immediate-body-after-title')
  }

  if (isGenericHeading(candidate.heading)) {
    score -= 100
    reasons.push('generic-heading')
  }

  if (looksLikePreview(candidate.descriptionHtml, candidateText)) {
    score -= 80
    reasons.push('preview-or-card-like')
  }

  if (contextMismatch(rule, candidate)) {
    score -= 60
    reasons.push('context-mismatch')
  }

  if (candidateText.length < 50 && !hasMechanicalSignals(candidateText)) {
    score -= 50
    reasons.push('body-too-short')
  }

  if (!candidateText || slug(candidateText) === headingName) {
    score -= 30
    reasons.push('no-body-beyond-title')
  }

  if (rulePreview && rulePreview === candidateText) {
    score -= 25
    reasons.push('matches-preview')
  }

  return {
    ...candidate,
    score,
    reasons,
  }
}

export function selectBonfireSectionCandidate(rule, candidates) {
  const scored = candidates.map((candidate) => scoreBonfireSectionCandidate(rule, candidate))
    .sort((left, right) => right.score - left.score || right.textLength - left.textLength)

  if (!scored.length) {
    return { selectedCandidate: null, scoredCandidates: [] }
  }

  const [first, second] = scored
  const scoreGap = first.score - (second?.score ?? -Infinity)
  const selectedCandidate = first.score >= 140
    && scoreGap >= 40
    && ['article-body', 'section-body', 'inline-bold-subrule', 'table-rule-body'].includes(first.descriptionSource)
    && !looksLikePreview(first.descriptionHtml, first.text)
      ? first
      : null

  return { selectedCandidate, scoredCandidates: scored }
}

export function extractSectionBodyCandidates({ html, pageTitle, pageH1, sourceUrl, sourceFile, rule }) {
  const article = sanitizeHtml(html)
  const headings = extractHeadings(article)
  const candidates = []

  if (slug(pageTitle) === slug(rule.name) || slug(pageH1) === slug(rule.name)) {
    const bodyHtml = sanitizeHtml(article.slice((headings.find((heading) => heading.level === 1)?.end) ?? 0, ((headings.find((heading) => heading.level === 1)?.end) ?? 0) + 6000))
    const text = cleanRuleText(htmlToText(bodyHtml))
    candidates.push({
      heading: pageTitle || pageH1 || rule.name,
      headingLevel: 'article',
      parentHeading: null,
      nearestArticleTitle: pageTitle || pageH1 || '',
      pageTitle,
      pageH1,
      sourceUrl,
      sourceFile,
      descriptionSource: 'article-body',
      descriptionHtml: bodyHtml,
      text,
      textPreview: shortPreview(text),
      textLength: text.length,
      immediateBody: true,
    })
  }

  for (const heading of headings) {
    const bodyHtml = sanitizeHtml(sectionHtml(article, heading, headings))
    const text = cleanText(htmlToText(bodyHtml))
    const parentHeading = findParentHeading(heading, headings)
    candidates.push({
      heading: cleanFeatureName(heading.text),
      headingLevel: `h${heading.level}`,
      parentHeading: parentHeading ? cleanFeatureName(parentHeading.text) : null,
      nearestArticleTitle: pageTitle || pageH1 || '',
      pageTitle,
      pageH1,
      sourceUrl,
      sourceFile,
      descriptionSource: 'section-body',
      descriptionHtml: bodyHtml,
      text,
      textPreview: shortPreview(text),
      textLength: text.length,
      immediateBody: true,
    })
  }

  for (const match of String(article).matchAll(/<(p|li|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const candidate = extractLeadingStrongCandidate(match[2])
    if (!candidate) continue
    const beforeHtml = String(article).slice(0, match.index)
    const parentHeading = extractHeadings(beforeHtml).sort((left, right) => right.start - left.start)[0] ?? null
    const text = cleanRuleText(htmlToText(candidate.descriptionHtml))
    candidates.push({
      heading: cleanFeatureName(candidate.rawTitle),
      headingLevel: 'strong',
      parentHeading: parentHeading ? cleanFeatureName(parentHeading.text) : null,
      nearestArticleTitle: pageTitle || pageH1 || '',
      pageTitle,
      pageH1,
      sourceUrl,
      sourceFile,
      descriptionSource: 'inline-bold-subrule',
      descriptionHtml: sanitizeHtml(candidate.descriptionHtml),
      text,
      textPreview: shortPreview(text),
      textLength: text.length,
      immediateBody: true,
    })
  }

  for (const row of String(article).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => cell[1])
    if (cells.length < 2) continue
    const heading = cleanFeatureName(htmlToText(cells[0]))
    const descriptionHtml = sanitizeHtml(cells.slice(1).join(' '))
    const text = cleanRuleText(htmlToText(descriptionHtml))
    candidates.push({
      heading,
      headingLevel: 'table',
      parentHeading: null,
      nearestArticleTitle: pageTitle || pageH1 || '',
      pageTitle,
      pageH1,
      sourceUrl,
      sourceFile,
      descriptionSource: 'table-rule-body',
      descriptionHtml,
      text,
      textPreview: shortPreview(text),
      textLength: text.length,
      immediateBody: true,
    })
  }

  return candidates.filter((candidate) => candidate.heading)
}
