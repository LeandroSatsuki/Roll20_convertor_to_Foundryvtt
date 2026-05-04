export const characterSheetAnchorGroups = [
  { label: 'NOME DO PERSONAGEM', aliases: ['NOME DO PERSONAGEM', 'PERSONAGEM', 'CHARACTER NAME'] },
  { label: 'CLASSE', aliases: ['CLASSE', 'CLASSE(S) & NIVEL(EIS)', 'CLASSE(S) & NÍVEL(EIS)', 'CLASSE(S) & NÃ\x8dVEL(EIS)', 'CLASSE & NIVEL', 'CLASS & LEVEL', 'CLASSES & LEVELS'] },
  { label: 'RAÇA', aliases: ['RAÇA', 'RACA', 'RAÃ\x87A', 'RACE'] },
  { label: 'ANTECEDENTE', aliases: ['ANTECEDENTE', 'BACKGROUND'] },
  { label: 'FORÇA', aliases: ['FORÇA', 'FORCA', 'FORÃ\x87A', 'STRENGTH'] },
  { label: 'DESTREZA', aliases: ['DESTREZA', 'DEXTERITY'] },
  { label: 'CONSTITUIÇÃO', aliases: ['CONSTITUIÇÃO', 'CONSTITUICAO', 'CONSTITUIÃ\x87Ã\x83O', 'CONSTITUTION'] },
  { label: 'PERÍCIAS', aliases: ['PERÍCIAS', 'PERICIAS', 'PERÃ\x8dCIAS', 'SKILLS'] },
  { label: 'CARACTERÍSTICAS', aliases: ['CARACTERÍSTICAS', 'CARACTERISTICAS', 'CARACTERÃ\x8dSTICAS', 'CARACTERÍSTICAS DE CLASSE E RAÇA', 'CARACTERISTICAS DE CLASSE E RACA', 'CARACTERÃ\x8dSTICAS DE CLASSE E RAÃ\x87A'] },
  { label: 'MOCHILA', aliases: ['MOCHILA', 'MOCHILA & EQUIPAMENTO'] },
  { label: 'EQUIPAMENTO', aliases: ['EQUIPAMENTO', 'MOCHILA & EQUIPAMENTO'] },
  { label: 'PONTOS DE VIDA', aliases: ['PONTOS DE VIDA', 'PV', 'PV MÁXIMO', 'PV MAXIMO', 'PV MÃ\x81XIMO', 'HIT POINTS'] },
  { label: 'SABEDORIA PASSIVA', aliases: ['SABEDORIA PASSIVA', 'PERCEPÇÃO PASSIVA', 'PERCEPCAO PASSIVA', 'PERCEPÃ\x87Ã\x83O PASSIVA', 'PASSIVE PERCEPTION'] },
]

export const bonfireSheetAnchors = characterSheetAnchorGroups.flatMap((group) => group.aliases)

export const sectionAnchorAliases: Record<string, string[]> = {
  features: ['CARACTERÍSTICAS DE CLASSE E RAÇA', 'CARACTERISTICAS DE CLASSE E RACA', 'CARACTERÃ\x8dSTICAS DE CLASSE E RAÃ\x87A'],
  generalFeats: ['TALENTOS GERAIS'],
  racialFeats: ['TALENTOS DE RAÇA', 'TALENTOS DE RACA', 'TALENTOS DE RAÃ\x87A'],
  extraFeats: ['TALENTOS EXTRAS'],
  equipment: ['MOCHILA & EQUIPAMENTO', 'EQUIPAMENTO', 'MOCHILA'],
  languagesTools: ['IDIOMAS E FERRAMENTAS', 'IDIOMAS'],
  skills: ['PERÍCIAS', 'PERICIAS', 'PERÃ\x8dCIAS'],
}
