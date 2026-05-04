import type {
  BonfireBackgroundRule,
  BonfireClassRule,
  BonfireFeatRule,
  BonfireRaceRule,
  BonfireSpellOverrideRule,
  BonfireSubclassRule,
  BonfireWeaponRule,
} from './bonfireTypes'

const playersUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/jogadores-category'
const clericUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/a/clerigo-article'
const fighterUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/a/guerreiro-article'
const humanoidsUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/humanoides-category'
const equipmentUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/jogadores-category'
const spellsUrl = 'https://5e.tools/spells.html'

export const bonfireClassSeeds: BonfireClassRule[] = [
  {
    id: 'clerigo',
    name: 'Clérigo',
    aliases: ['Clerigo', 'Cleric'],
    hitDie: 'd8',
    primaryAbility: ['wis'],
    savingThrows: ['wis', 'cha'],
    proficiencies: {
      armor: ['Armaduras Leves', 'Armaduras Médias', 'Escudos'],
      weapons: ['Armas Simples'],
      tools: [],
      skills: ['História', 'Intuição', 'Medicina', 'Persuasão', 'Religião'],
    },
    spellcasting: { ability: 'wis', prepared: true, progression: 'full' },
    featuresByLevel: {
      '1': [
        {
          id: 'clerigo-conjuracao',
          name: 'Conjuração',
          aliases: ['Conjuracao', 'Spellcasting'],
          level: 1,
          kind: 'spellcasting',
          description: 'Sabedoria é a habilidade de conjuração de Clérigo. Seed resumido; revisar texto completo na fonte da mesa.',
          sourceUrl: clericUrl,
        },
        {
          id: 'clerigo-ordem-sagrada',
          name: 'Ordem Sagrada',
          aliases: ['Ordem Sagrada'],
          level: 1,
          kind: 'classFeature',
          description: 'Escolha ligada ao ofício sagrado do Clérigo.',
          sourceUrl: clericUrl,
        },
        {
          id: 'clerigo-ritos-sacros',
          name: 'Ritos Sacros',
          aliases: ['Ritos Sacros'],
          level: 1,
          kind: 'classFeature',
          description: 'Ritos e leitura espiritual de locais sagrados ou profanados.',
          sourceUrl: clericUrl,
        },
      ],
      '2': [
        {
          id: 'clerigo-canalizar-divindade',
          name: 'Canalizar Divindade',
          aliases: ['Canalizar Divindade', 'Channel Divinity'],
          level: 2,
          kind: 'resource',
          description: 'Recurso sagrado do Clérigo. No nível 5 tem 2 usos; recuperar parcialmente em descanso curto e totalmente em descanso longo requer revisão no Foundry.',
          uses: { max: 2, recovery: 'sr-lr' },
          activation: 'action',
          sourceUrl: clericUrl,
        },
      ],
      '5': [
        {
          id: 'clerigo-autoridade-sagrada',
          name: 'Autoridade Sagrada',
          aliases: ['Autoridade Sagrada'],
          level: 5,
          kind: 'classFeature',
          description: 'A autoridade do Clérigo se aprofunda no quinto nível.',
          sourceUrl: clericUrl,
        },
      ],
    },
    sourceUrl: clericUrl,
  },
  {
    id: 'guerreiro',
    name: 'Guerreiro',
    aliases: ['Fighter'],
    hitDie: 'd10',
    primaryAbility: ['str', 'dex'],
    savingThrows: ['str', 'con'],
    proficiencies: {
      armor: ['Todas as Armaduras', 'Escudos'],
      weapons: ['Armas Simples', 'Armas Marciais'],
      tools: [],
      skills: ['Acrobacia', 'Adestrar Animais', 'Atletismo', 'História', 'Intuição', 'Intimidação', 'Percepção', 'Sobrevivência'],
    },
    featuresByLevel: {
      '1': [
        { id: 'guerreiro-disciplina-marcial', name: 'Disciplina Marcial', aliases: ['Martial Discipline'], level: 1, kind: 'classFeature', description: 'Fundação marcial do Guerreiro.', sourceUrl: fighterUrl },
        { id: 'guerreiro-retomar-folego', name: 'Retomar Fôlego', aliases: ['Retomar Folego', 'Second Wind'], level: 1, kind: 'resource', description: 'Recurso de cura do Guerreiro.', uses: { max: 2, recovery: 'lr' }, activation: 'bonus', sourceUrl: fighterUrl },
      ],
      '2': [
        { id: 'guerreiro-fundamentos-batalha', name: 'Fundamentos de Batalha', aliases: ['Fundamentos de Batalha'], level: 2, kind: 'classFeature', description: 'Base para manobras e técnicas de combate.', sourceUrl: fighterUrl },
        { id: 'guerreiro-surto-acao', name: 'Surto de Ação', aliases: ['Surto de Acao', 'Action Surge'], level: 2, kind: 'resource', description: 'Recurso para agir além do normal.', uses: { max: 1, recovery: 'sr-lr' }, activation: 'special', sourceUrl: fighterUrl },
      ],
      '5': [{ id: 'guerreiro-mente-tatica', name: 'Mente Tática', aliases: ['Mente Tatica'], level: 5, kind: 'classFeature', description: 'Leitura tática aprimorada.', sourceUrl: fighterUrl }],
      '6': [{ id: 'guerreiro-corpo-instinto', name: 'Guerreiro do Corpo e do Instinto', aliases: ['Guerreiro do Corpo e do Instinto'], level: 6, kind: 'classFeature', description: 'Treinamento físico e instintivo avançado.', sourceUrl: fighterUrl }],
    },
    sourceUrl: fighterUrl,
  },
]

export const bonfireSubclassSeeds: BonfireSubclassRule[] = [
  {
    id: 'clerigo-do-caos',
    name: 'Clérigo do Caos',
    className: 'Clérigo',
    aliases: ['Clerigo do Caos', 'Caos'],
    featuresByLevel: {
      '3': [
        { id: 'clerigo-do-caos-marker', name: 'Clérigo do Caos', aliases: ['Clerigo do Caos'], level: 3, kind: 'subclassFeature', description: 'Marcador de subclasse do Domínio do Caos.', sourceUrl: clericUrl },
        { id: 'clerigo-caos-mao-lingua-contrassenso', name: 'Mão e Língua do Contrassenso', aliases: ['Mao e Lingua do Contrassenso'], level: 3, kind: 'subclassFeature', description: 'Feature resumida do Clérigo do Caos.', sourceUrl: clericUrl },
        { id: 'clerigo-caos-mente-estilhacada', name: 'Mente Estilhaçada', aliases: ['Mente Estilhacada'], level: 3, kind: 'subclassFeature', description: 'Feature resumida do Clérigo do Caos.', sourceUrl: clericUrl },
      ],
    },
    sourceUrl: clericUrl,
  },
  {
    id: 'campeao',
    name: 'Campeão',
    className: 'Guerreiro',
    aliases: ['Campeao', 'Champion'],
    featuresByLevel: {
      '3': [{ id: 'guerreiro-campeao-marker', name: 'Campeão', aliases: ['Campeao'], level: 3, kind: 'subclassFeature', description: 'Marcador de subclasse Campeão.', sourceUrl: fighterUrl }],
    },
    sourceUrl: fighterUrl,
  },
]

export const bonfireRaceSeeds: BonfireRaceRule[] = [
  {
    id: 'folken-limalumes',
    name: 'Folken Limalumes',
    aliases: ['Folken Limalumes'],
    speed: 25,
    size: 'sm',
    features: [
      { id: 'folken-sorte-incontrolavel', name: 'Sorte Incontrolável', aliases: ['Sorte Incontrolavel'], kind: 'raceFeature', description: 'Traço racial de sorte anômala.', sourceUrl: humanoidsUrl },
      { id: 'folken-mente-genial', name: 'Mente Genial', aliases: ['Mente Genial'], kind: 'raceFeature', description: 'Traço mental dos Folken.', sourceUrl: humanoidsUrl },
      { id: 'folken-agilidade-pequeninos', name: 'Agilidade dos Pequeninos', aliases: ['Agilidade dos Pequeninos'], kind: 'raceFeature', description: 'Agilidade racial de criatura pequena.', sourceUrl: humanoidsUrl },
      { id: 'folken-fala-silenciosa', name: 'Fala Silenciosa', aliases: ['Fala Silenciosa'], kind: 'raceFeature', description: 'Comunicação silenciosa racial.', sourceUrl: humanoidsUrl },
      { id: 'folken-dedos-leves', name: 'Dedos Leves', aliases: ['Dedos Leves'], kind: 'raceFeature', description: 'Destreza manual dos Folken.', sourceUrl: humanoidsUrl },
      { id: 'folken-escapista', name: 'Escapista', aliases: ['Escapista'], kind: 'raceFeature', description: 'Facilidade para escapar de problemas.', sourceUrl: humanoidsUrl },
    ],
    sourceUrl: humanoidsUrl,
  },
  {
    id: 'humano-goruun',
    name: 'Humano Goruun',
    aliases: ['Humano Goruun', 'Goruun'],
    speed: 30,
    size: 'med',
    features: [
      { id: 'humano-habilidoso', name: 'Habilidoso', kind: 'raceFeature', description: 'Traço humano de versatilidade.', sourceUrl: humanoidsUrl },
      { id: 'humano-poliglota', name: 'Poliglota', kind: 'raceFeature', description: 'Traço de idiomas adicionais.', sourceUrl: humanoidsUrl },
      { id: 'humano-jeitinho-humano', name: 'Jeitinho Humano', kind: 'raceFeature', description: 'Traço humano homebrew.', sourceUrl: humanoidsUrl },
      { id: 'goruun-legado-implacavel', name: 'Legado Implacável', aliases: ['Legado Implacavel'], kind: 'resource', description: 'Recurso racial Goruun.', uses: { max: 1, recovery: 'lr' }, activation: 'reaction', sourceUrl: humanoidsUrl },
      { id: 'goruun-ameaca-latente', name: 'Ameaça Latente', aliases: ['Ameaca Latente'], kind: 'raceFeature', description: 'Traço racial Goruun.', sourceUrl: humanoidsUrl },
      { id: 'goruun-visao-escuro', name: 'Visão no Escuro', aliases: ['Visao no Escuro', 'Darkvision'], kind: 'raceFeature', description: 'Sentido especial; confirmar alcance na ficha.', sourceUrl: humanoidsUrl },
      { id: 'goruun-sangue-orquico', name: 'Sangue Órquico', aliases: ['Sangue Orquico'], kind: 'raceFeature', description: 'Herança órquica Goruun.', sourceUrl: humanoidsUrl },
      { id: 'goruun-supersticao-tribal', name: 'Superstição Tribal', aliases: ['Supersticao Tribal'], kind: 'resource', description: 'Recurso racial com usos por proficiência.', uses: { max: 3, recovery: 'lr' }, activation: 'reaction', sourceUrl: humanoidsUrl },
      { id: 'goruun-sobrevivente-calejado', name: 'Sobrevivente Calejado', kind: 'raceFeature', description: 'Traço de resistência e sobrevivência.', sourceUrl: humanoidsUrl },
    ],
    sourceUrl: humanoidsUrl,
  },
]

export const bonfireBackgroundSeeds: BonfireBackgroundRule[] = [
  { id: 'espiao', name: 'Espião', aliases: ['Espiao', 'Spy'], features: [{ id: 'background-espiao-dedos-leves', name: 'Dedos Leves', kind: 'backgroundFeature', description: 'Treinamento de infiltração e pequenos furtos.', sourceUrl: playersUrl }], proficiencies: ['Enganação', 'Furtividade'], startingGold: 0, sourceUrl: playersUrl },
  { id: 'soldado', name: 'Soldado', aliases: ['Soldier'], features: [{ id: 'background-soldado', name: 'Soldado', kind: 'backgroundFeature', description: 'Antecedente militar.', sourceUrl: playersUrl }], proficiencies: ['Atletismo', 'Intimidação'], sourceUrl: playersUrl },
  { id: 'ex-soldado', name: 'Ex-Soldado', aliases: ['Ex Soldado'], features: [{ id: 'background-ex-soldado', name: 'Ex-Soldado', kind: 'backgroundFeature', description: 'Antecedente militar anterior.', sourceUrl: playersUrl }], proficiencies: ['Atletismo', 'Intimidação'], sourceUrl: playersUrl },
]

export const bonfireFeatSeeds: BonfireFeatRule[] = [
  { id: 'marca-anomala', name: 'Marca Anômala', aliases: ['Marca Anomala'], category: 'general', prerequisites: [], effects: ['Talento homebrew com seed resumido.'], sourceUrl: playersUrl },
  { id: 'raizes-profundas', name: 'Raízes Profundas', aliases: ['Raizes profundas', 'Raízes profundas'], category: 'general', prerequisites: [], effects: ['Talento homebrew com seed resumido.'], sourceUrl: playersUrl },
  { id: 'robusto', name: 'Robusto', aliases: ['Tough'], category: 'general', prerequisites: [], effects: ['Talento de resistência física.'], sourceUrl: playersUrl },
  { id: 'mestre-ambidestria', name: 'Mestre da Ambidestria', aliases: ['Mestre da Ambidestria'], category: 'general', prerequisites: [], effects: ['Talento ligado a combate com duas armas.'], sourceUrl: playersUrl },
  { id: 'resiliente', name: 'Resiliente', aliases: ['Resiliente (Sabedoria)', 'Resilient'], category: 'general', prerequisites: [], effects: ['Talento de resiliência; confirmar atributo escolhido.'], sourceUrl: playersUrl },
  { id: 'two-weapon-fighting', name: 'Two-Weapon Fighting', aliases: ['Luta com Duas Armas'], category: 'general', prerequisites: [], effects: ['Estilo/talento de combate com duas armas.'], sourceUrl: playersUrl },
  { id: 'arremesso-rapido', name: 'Arremesso Rápido', aliases: ['Arremesso Rapido'], category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
  { id: 'ataque-distrativo', name: 'Ataque Distrativo', aliases: ['Ataque Distrativo'], category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
  { id: 'ataque-de-manobra', name: 'Ataque de Manobra', aliases: ['Ataque de Manobra'], category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
  { id: 'ataque-preparado', name: 'Ataque Preparado', aliases: ['Ataque Preparado'], category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
  { id: 'ataque-preciso', name: 'Ataque Preciso', aliases: ['Ataque Preciso'], category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
]

export const bonfireWeaponSeeds: BonfireWeaponRule[] = [
  { id: 'scale-mail', name: 'Scale Mail', aliases: ['Brunea'], category: 'armor', properties: ['medium armor'], masteryOptions: [], price: '50 gp', weight: '45 lb', sourceUrl: equipmentUrl },
  { id: 'shield', name: 'Shield', aliases: ['Escudo'], category: 'shield', properties: ['shield'], masteryOptions: [], price: '10 gp', weight: '6 lb', sourceUrl: equipmentUrl },
  { id: 'potion-of-healing', name: 'Potion of Healing', aliases: ['Poção de Cura', 'Pocao de Cura'], category: 'consumable', properties: ['healing'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'shortbow', name: 'Shortbow', aliases: ['Arco Curto'], category: 'simple', damage: '1d6', damageType: 'piercing', properties: ['ammunition', 'two-handed'], masteryOptions: ['vex'], sourceUrl: equipmentUrl },
  { id: 'shortsword', name: 'Shortsword', aliases: ['Espada Curta'], category: 'martial', damage: '1d6', damageType: 'slashing', properties: ['finesse', 'light'], masteryOptions: ['vex'], sourceUrl: equipmentUrl },
  { id: 'handaxe', name: 'Handaxe', aliases: ['Machado de Mão', 'Machado de Mao', 'Machado de...'], category: 'simple', damage: '1d6', damageType: 'slashing', properties: ['light', 'thrown'], masteryOptions: ['vex'], sourceUrl: equipmentUrl },
  { id: 'explorers-pack', name: "Explorer's Pack", aliases: ['Explorer Pack', 'Pacote de Explorador'], category: 'equipment', properties: ['pack'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'holy-symbol', name: 'Holy Symbol', aliases: ['Símbolo Sagrado', 'Simbolo Sagrado'], category: 'focus', properties: ['spellcasting focus'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'agua-benta', name: 'Água Benta', aliases: ['Agua Benta', 'Holy Water'], category: 'consumable', properties: ['holy water'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'carpenters-tools', name: "Carpenter's Tools", aliases: ['Carpenter Tools'], category: 'equipment', properties: ['tool'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'cartographers-tools', name: "Cartographer's Tools", aliases: ['Cartographer Tools'], category: 'equipment', properties: ['tool'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'cooks-utensils', name: "Cook's Utensils", aliases: ['Cook Utensils'], category: 'equipment', properties: ['tool'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'smiths-tools', name: "Smith's Tools", aliases: ['Smith Tools'], category: 'equipment', properties: ['tool'], masteryOptions: [], sourceUrl: equipmentUrl },
]

export const bonfireSpellOverrideSeeds: BonfireSpellOverrideRule[] = [
  { id: 'silvery-barbs', spellName: 'Silvery Barbs', status: 'nerf', description: 'Magia ajustada/nerfada para a mesa.', foundryNotes: 'Revisar texto antes de importar.', sourceUrl: spellsUrl },
  { id: 'wish', spellName: 'Wish', status: 'adjusted', description: 'Magia com ajuste de campanha.', foundryNotes: 'Revisar limitações Bonfire.', sourceUrl: spellsUrl },
  { id: 'simulacrum', spellName: 'Simulacrum', status: 'limited', description: 'Uso limitado.', foundryNotes: 'Revisar antes de liberar.', sourceUrl: spellsUrl },
  { id: 'clone', spellName: 'Clone', status: 'limited', description: 'Uso limitado.', foundryNotes: 'Revisar antes de liberar.', sourceUrl: spellsUrl },
  { id: 'planar-binding', spellName: 'Planar Binding', status: 'limited', description: 'Uso limitado.', foundryNotes: 'Revisar antes de liberar.', sourceUrl: spellsUrl },
  { id: 'planar-ally', spellName: 'Planar Ally', status: 'rework', description: 'Magia reworkada.', foundryNotes: 'Usar notas Bonfire.', sourceUrl: spellsUrl },
  { id: 'create-spelljammer-realm', spellName: 'Create Spelljammer Realm', status: 'banned', description: 'Magia vetada.', foundryNotes: 'Não importar como disponível.', sourceUrl: spellsUrl },
  { id: 'dream-of-the-blue-veil', spellName: 'Dream of the Blue Veil', status: 'banned', description: 'Magia vetada.', foundryNotes: 'Não importar como disponível.', sourceUrl: spellsUrl },
]
