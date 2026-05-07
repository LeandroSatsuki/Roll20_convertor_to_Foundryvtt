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
const druidUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/jogadores-category'
const fighterUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/a/guerreiro-article'
const humanoidsUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/humanoides-category'
const equipmentUrl = 'https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/jogadores-category'
const spellsUrl = 'https://5e.tools/spells.html'

export const bonfireClassSeeds: BonfireClassRule[] = [
  {
    id: 'clerigo',
    name: 'Clérigo',
    aliases: ['Clerigo', 'Cleric'],
    description:
      'Clérigos canalizam poder divino por meio da fé, dos ritos e da autoridade sagrada. São conjuradores completos, usam Sabedoria como atributo principal e sustentam o grupo com magia, proteção e milagres.',
    shortDescription: 'Classe divina focada em Sabedoria, suporte, cura e milagres.',
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
          description:
            'Você prepara e conjura magias clericais usando Sabedoria. O item exportado representa a progressão mágica principal da classe e serve de ponte entre a ficha Bonfire e o sistema de magias do Foundry.',
          sourceUrl: clericUrl,
        },
        {
          id: 'clerigo-ordem-sagrada',
          name: 'Ordem Sagrada',
          aliases: ['Ordem Sagrada'],
          level: 1,
          kind: 'classFeature',
          description:
            'A Ordem Sagrada define como o Clérigo expressa sua devoção em campo, moldando o papel da classe entre combate, zelo religioso e autoridade espiritual.',
          sourceUrl: clericUrl,
        },
        {
          id: 'clerigo-ritos-sacros',
          name: 'Ritos Sacros',
          aliases: ['Ritos Sacros'],
          level: 1,
          kind: 'classFeature',
          description:
            'Ritos Sacros permite reconhecer, oficiar e interpretar sinais ligados ao sagrado ou ao profano, dando ao Clérigo ferramentas litúrgicas e narrativas além do combate.',
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
          description:
            'Canalizar Divindade condensa a autoridade divina do Clérigo em usos limitados que alimentam milagres e efeitos de domínio. No nível 5 o conversor já configura 2 usos para a ficha.',
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
          description:
            'No quinto nível, a Autoridade Sagrada reforça a presença espiritual do Clérigo e amplia o peso de seus ritos, ordens e milagres na mesa.',
          sourceUrl: clericUrl,
        },
      ],
    },
    sourceUrl: clericUrl,
  },
  {
    id: 'druida',
    name: 'Druida',
    aliases: ['Druid'],
    description:
      'Druidas canalizam magia natural por meio de Sabedoria, preservando ciclos, ambientes e forcas primordiais. Sao conjuradores completos com foco em suporte, controle, cura e adaptacao ao terreno.',
    shortDescription: 'Classe de magia natural, conjuracao completa e Sabedoria.',
    hitDie: 'd8',
    primaryAbility: ['wis'],
    savingThrows: ['int', 'wis'],
    proficiencies: {
      armor: ['Armaduras Leves', 'Armaduras Medias', 'Escudos'],
      weapons: ['Armas Simples'],
      tools: ['Kit de Herbalismo'],
      skills: ['Arcanismo', 'Adestrar Animais', 'Intuicao', 'Medicina', 'Natureza', 'Percepcao', 'Religiao', 'Sobrevivencia'],
    },
    spellcasting: { ability: 'wis', prepared: true, progression: 'full' },
    featuresByLevel: {
      '1': [
        {
          id: 'druida-conjuracao',
          name: 'Conjuracao',
          aliases: ['Conjuração', 'Spellcasting'],
          level: 1,
          kind: 'spellcasting',
          description: 'Voce prepara e conjura magias druidicas usando Sabedoria. O conversor usa esta regra para configurar habilidade de conjuracao e progressao completa.',
          sourceUrl: druidUrl,
        },
      ],
    },
    sourceUrl: druidUrl,
  },
  {
    id: 'guerreiro',
    name: 'Guerreiro',
    aliases: ['Fighter'],
    description:
      'Guerreiros são especialistas marciais cuja força vem de treinamento, disciplina e versatilidade em combate. A classe sustenta a linha de frente com armaduras, armas variadas e recursos de explosão tática.',
    shortDescription: 'Classe marcial versátil focada em armas, armaduras e presença em combate.',
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
        {
          id: 'guerreiro-disciplina-marcial',
          name: 'Disciplina Marcial',
          aliases: ['Martial Discipline'],
          level: 1,
          kind: 'classFeature',
          description: 'A base do Guerreiro é a disciplina marcial: treino sólido, domínio técnico e leitura prática do combate.',
          sourceUrl: fighterUrl,
        },
        {
          id: 'guerreiro-retomar-folego',
          name: 'Retomar Fôlego',
          aliases: ['Retomar Folego', 'Second Wind'],
          level: 1,
          kind: 'resource',
          description: 'Retomar Fôlego concentra recuperação física imediata em um recurso curto e confiável de sobrevivência marcial.',
          uses: { max: 2, recovery: 'lr' },
          activation: 'bonus',
          sourceUrl: fighterUrl,
        },
      ],
      '2': [
        {
          id: 'guerreiro-fundamentos-batalha',
          name: 'Fundamentos de Batalha',
          aliases: ['Fundamentos de Batalha'],
          level: 2,
          kind: 'classFeature',
          description: 'Fundamentos de Batalha representa o repertório técnico que sustenta manobras e decisões eficientes no campo.',
          sourceUrl: fighterUrl,
        },
        {
          id: 'guerreiro-surto-acao',
          name: 'Surto de Ação',
          aliases: ['Surto de Acao', 'Action Surge'],
          level: 2,
          kind: 'resource',
          description: 'Surto de Ação permite ultrapassar o ritmo normal do turno e pressionar o inimigo em momentos decisivos.',
          uses: { max: 1, recovery: 'sr-lr' },
          activation: 'special',
          sourceUrl: fighterUrl,
        },
      ],
      '5': [{ id: 'guerreiro-mente-tatica', name: 'Mente Tática', aliases: ['Mente Tatica'], level: 5, kind: 'classFeature', description: 'Mente Tática reforça leitura de combate, tempo de resposta e avaliação de risco.', sourceUrl: fighterUrl }],
      '6': [{ id: 'guerreiro-corpo-instinto', name: 'Guerreiro do Corpo e do Instinto', aliases: ['Guerreiro do Corpo e do Instinto'], level: 6, kind: 'classFeature', description: 'Treinamento avançado que une resistência física, reflexo e confiança instintiva.', sourceUrl: fighterUrl }],
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
    description: 'Subclasse clerical voltada ao caos, ao contrassenso e a milagres imprevisíveis que desestabilizam a realidade ao redor.',
    shortDescription: 'Domínio clerical de efeitos caóticos e milagres imprevisíveis.',
    featuresByLevel: {
      '3': [
        { id: 'clerigo-do-caos-marker', name: 'Clérigo do Caos', aliases: ['Clerigo do Caos'], level: 3, kind: 'subclassFeature', description: 'Marco de subclasse do domínio do Caos, ligado a milagres que desafiam ordem e previsibilidade.', sourceUrl: clericUrl },
        { id: 'clerigo-caos-mao-lingua-contrassenso', name: 'Mão e Língua do Contrassenso', aliases: ['Mao e Lingua do Contrassenso'], level: 3, kind: 'subclassFeature', description: 'Expressa o lado social e distorcivo do Caos, embaralhando certezas, mensagens e expectativas.', sourceUrl: clericUrl },
        { id: 'clerigo-caos-mente-estilhacada', name: 'Mente Estilhaçada', aliases: ['Mente Estilhacada'], level: 3, kind: 'subclassFeature', description: 'Milagre de caos mental que pressiona percepção, foco e segurança emocional do alvo.', sourceUrl: clericUrl },
      ],
    },
    sourceUrl: clericUrl,
  },
  {
    id: 'campeao',
    name: 'Campeão',
    className: 'Guerreiro',
    aliases: ['Campeao', 'Champion'],
    description: 'Subclasse marcial direta, centrada em excelência física, precisão e consistência no campo de batalha.',
    shortDescription: 'Subclasse do Guerreiro focada em desempenho marcial puro.',
    featuresByLevel: {
      '3': [{ id: 'guerreiro-campeao-marker', name: 'Campeão', aliases: ['Campeao'], level: 3, kind: 'subclassFeature', description: 'Marco da subclasse Campeão, dedicado a desempenho físico e superioridade marcial estável.', sourceUrl: fighterUrl }],
    },
    sourceUrl: fighterUrl,
  },
]

export const bonfireRaceSeeds: BonfireRaceRule[] = [
  {
    id: 'elfo-da-lua',
    name: 'Elfo da Lua',
    aliases: ['Moon Elf', 'Elfa da Lua'],
    description:
      'Elfos da Lua preservam graca, curiosidade e afinidade magica herdadas de uma linhagem ligada ao ceu noturno, a exploracao e a sensibilidade arcana.',
    shortDescription: 'Linhagem elfica de afinidade magica, mobilidade e percepcao refinada.',
    speed: 35,
    size: 'med',
    features: [
      {
        id: 'elfo-da-lua-afinidade-lunar',
        name: 'Afinidade Lunar',
        aliases: ['Afinidade Lunar'],
        kind: 'raceFeature',
        description: 'A linhagem da Lua favorece sensibilidade mistica, leitura de pressagios e uma relacao natural com magia e noite.',
        sourceUrl: humanoidsUrl,
      },
    ],
    sourceUrl: humanoidsUrl,
  },
  {
    id: 'folken-limalumes',
    name: 'Folken Limalumes',
    aliases: ['Folken Limalumes'],
    description:
      'Folken Limalumes são pequenos humanoides de brilho estranho e sorte anômala. Misturam agilidade, esperteza e truques sutis para sobreviver, fugir e surpreender.',
    shortDescription: 'Povo pequeno, furtivo e marcado por brilho e sorte incomuns.',
    speed: 25,
    size: 'sm',
    features: [
      { id: 'folken-sorte-incontrolavel', name: 'Sorte Incontrolável', aliases: ['Sorte Incontrolavel'], kind: 'raceFeature', description: 'A sorte dos Limalumes parece dobrar o acaso a seu favor em momentos críticos, mesmo quando nem eles entendem o motivo.', sourceUrl: humanoidsUrl },
      { id: 'folken-mente-genial', name: 'Mente Genial', aliases: ['Mente Genial'], kind: 'raceFeature', description: 'Os Folken Limalumes demonstram raciocínio vivo, imaginação rápida e capacidade de conectar ideias improváveis.', sourceUrl: humanoidsUrl },
      { id: 'folken-agilidade-pequeninos', name: 'Agilidade dos Pequeninos', aliases: ['Agilidade dos Pequeninos'], kind: 'raceFeature', description: 'Seu porte reduzido e reflexos leves favorecem deslocamento, reposicionamento e fuga em espaços apertados.', sourceUrl: humanoidsUrl },
      { id: 'folken-fala-silenciosa', name: 'Fala Silenciosa', aliases: ['Fala Silenciosa'], kind: 'raceFeature', description: 'Limalumes compartilham sinais, intenções e comunicação discreta com uma naturalidade que passa despercebida aos outros.', sourceUrl: humanoidsUrl },
      { id: 'folken-dedos-leves', name: 'Dedos Leves', aliases: ['Dedos Leves'], kind: 'raceFeature', description: 'A destreza fina da linhagem favorece manipulação delicada, furtos rápidos e improviso manual sob pressão.', sourceUrl: humanoidsUrl },
      { id: 'folken-escapista', name: 'Escapista', aliases: ['Escapista'], kind: 'raceFeature', description: 'Quando a situação aperta, o Folken encontra brechas, desvios e saídas que outros não perceberiam a tempo.', sourceUrl: humanoidsUrl },
    ],
    sourceUrl: humanoidsUrl,
  },
  {
    id: 'humano-goruun',
    name: 'Humano Goruun',
    aliases: ['Humano Goruun', 'Goruun'],
    description:
      'Humanos Goruun carregam uma herança agressiva e obstinada, equilibrando sobrevivência dura, intimidação e resistência herdada de seu povo.',
    shortDescription: 'Humanoide resistente com herança agressiva e tribal.',
    speed: 30,
    size: 'med',
    features: [
      { id: 'humano-habilidoso', name: 'Habilidoso', kind: 'raceFeature', description: 'Versatilidade humana aplicada a aprendizagem rápida e adaptação prática.', sourceUrl: humanoidsUrl },
      { id: 'humano-poliglota', name: 'Poliglota', kind: 'raceFeature', description: 'Talento para idiomas, contato entre povos e negociação cultural.', sourceUrl: humanoidsUrl },
      { id: 'humano-jeitinho-humano', name: 'Jeitinho Humano', kind: 'raceFeature', description: 'Capacidade humana de improvisar soluções sociais, logísticas ou pragmáticas em terreno incerto.', sourceUrl: humanoidsUrl },
      { id: 'goruun-legado-implacavel', name: 'Legado Implacável', aliases: ['Legado Implacavel'], kind: 'resource', description: 'Herança de dureza e reação feroz que pode ser acionada em momentos decisivos.', uses: { max: 1, recovery: 'lr' }, activation: 'reaction', sourceUrl: humanoidsUrl },
      { id: 'goruun-ameaca-latente', name: 'Ameaça Latente', aliases: ['Ameaca Latente'], kind: 'raceFeature', description: 'A presença Goruun comunica perigo mesmo antes de qualquer ataque começar.', sourceUrl: humanoidsUrl },
      { id: 'goruun-visao-escuro', name: 'Visão no Escuro', aliases: ['Visao no Escuro', 'Darkvision'], kind: 'raceFeature', description: 'Percepção ajustada a ambientes sombrios, útil para vigília, caça e travessia noturna.', sourceUrl: humanoidsUrl },
      { id: 'goruun-sangue-orquico', name: 'Sangue Órquico', aliases: ['Sangue Orquico'], kind: 'raceFeature', description: 'A herança órquica amplifica tenacidade, presença física e resposta agressiva ao perigo.', sourceUrl: humanoidsUrl },
      { id: 'goruun-supersticao-tribal', name: 'Superstição Tribal', aliases: ['Supersticao Tribal'], kind: 'resource', description: 'Práticas supersticiosas de proteção e resposta herdadas da tradição tribal.', uses: { max: 3, recovery: 'lr' }, activation: 'reaction', sourceUrl: humanoidsUrl },
      { id: 'goruun-sobrevivente-calejado', name: 'Sobrevivente Calejado', kind: 'raceFeature', description: 'A vida dura deixa marcas, mas também endurece corpo, hábitos e leitura de ameaça.', sourceUrl: humanoidsUrl },
    ],
    sourceUrl: humanoidsUrl,
  },
]

export const bonfireBackgroundSeeds: BonfireBackgroundRule[] = [
  {
    id: 'estudante-de-arqueomancia',
    name: 'Estudante de Arqueomancia',
    aliases: ['Archaeomancy Student', 'Estudante de Arqueomancia'],
    description:
      'Estudantes de Arqueomancia combinam pesquisa arcana, investigacao de ruinas e leitura de vestigios magicos para decifrar saberes perdidos.',
    shortDescription: 'Antecedente academico focado em ruinas, magia antiga e investigacao.',
    features: [
      {
        id: 'background-estudante-arqueomancia',
        name: 'Estudante de Arqueomancia',
        kind: 'backgroundFeature',
        description: 'Treinamento em teoria magica, catalogacao de achados e interpretacao de sinais deixados por civilizacoes arcanas.',
        sourceUrl: playersUrl,
      },
    ],
    proficiencies: ['Arcanismo', 'Investigacao'],
    sourceUrl: playersUrl,
  },
  {
    id: 'espiao',
    name: 'Espião',
    aliases: ['Espiao', 'Spy'],
    description: 'Espiões vivem de infiltração, disfarces, coleta de informação e golpes rápidos. O antecedente favorece sutileza, leitura social e acesso a redes clandestinas.',
    shortDescription: 'Antecedente de infiltração, sigilo e coleta de informação.',
    features: [{ id: 'background-espiao-dedos-leves', name: 'Dedos Leves', kind: 'backgroundFeature', description: 'Treinamento de infiltração, pequenos furtos e uso cuidadoso das mãos em situações de risco.', sourceUrl: playersUrl }],
    proficiencies: ['Enganação', 'Furtividade'],
    startingGold: 0,
    sourceUrl: playersUrl,
  },
  {
    id: 'soldado',
    name: 'Soldado',
    aliases: ['Soldier'],
    description: 'Soldados foram moldados por campanha, obediência e vida marcial. Carregam disciplina, contatos militares e experiência de agir sob pressão.',
    shortDescription: 'Antecedente militar de campanha e disciplina.',
    features: [{ id: 'background-soldado', name: 'Soldado', kind: 'backgroundFeature', description: 'Experiência formal com hierarquia, campo de batalha e rotinas militares.', sourceUrl: playersUrl }],
    proficiencies: ['Atletismo', 'Intimidação'],
    sourceUrl: playersUrl,
  },
  {
    id: 'ex-soldado',
    name: 'Ex-Soldado',
    aliases: ['Ex Soldado'],
    description: 'Ex-soldados deixaram o serviço, mas mantêm reflexos, traumas, contatos e hábitos de uma vida de guerra.',
    shortDescription: 'Antecedente militar de quem já deixou a tropa.',
    features: [{ id: 'background-ex-soldado', name: 'Ex-Soldado', kind: 'backgroundFeature', description: 'Vivência militar anterior que ainda orienta postura, memória de campanha e redes antigas.', sourceUrl: playersUrl }],
    proficiencies: ['Atletismo', 'Intimidação'],
    sourceUrl: playersUrl,
  },
]

export const bonfireFeatSeeds: BonfireFeatRule[] = [
  { id: 'marca-anomala', name: 'Marca Anômala', aliases: ['Marca Anomala'], description: 'Marca Anômala representa uma alteração extraordinária que concede capacidades fora do padrão comum da personagem.', shortDescription: 'Talento ligado a uma marca extraordinária e seus efeitos.', category: 'general', prerequisites: [], effects: ['Talento homebrew com seed resumido.'], sourceUrl: playersUrl },
  { id: 'raizes-profundas', name: 'Raízes Profundas', aliases: ['Raizes profundas', 'Raízes profundas'], description: 'Raízes Profundas reforça estabilidade, ligação com origem e resistência a tentativas de deslocamento ou quebra de postura.', shortDescription: 'Talento de estabilidade, firmeza e ligação com a origem.', category: 'general', prerequisites: [], effects: ['Talento homebrew com seed resumido.'], sourceUrl: playersUrl },
  { id: 'robusto', name: 'Robusto', aliases: ['Tough'], description: 'Talento de resiliência física e maior fôlego para suportar atrito prolongado.', category: 'general', prerequisites: [], effects: ['Talento de resistência física.'], sourceUrl: playersUrl },
  { id: 'mestre-ambidestria', name: 'Mestre da Ambidestria', aliases: ['Mestre da Ambidestria'], description: 'Talento que amplia domínio prático sobre combate com duas armas, alternância de mãos e pressão constante.', category: 'general', prerequisites: [], effects: ['Talento ligado a combate com duas armas.'], sourceUrl: playersUrl },
  { id: 'resiliente', name: 'Resiliente', aliases: ['Resiliente (Sabedoria)', 'Resilient'], description: 'Talento de resistência focado em fortalecer testes e salvaguardas do atributo escolhido.', category: 'general', prerequisites: [], effects: ['Talento de resiliência; confirmar atributo escolhido.'], sourceUrl: playersUrl },
  { id: 'two-weapon-fighting', name: 'Two-Weapon Fighting', aliases: ['Luta com Duas Armas'], description: 'Estilo ou talento de combate que melhora consistência e agressividade ao empunhar duas armas.', category: 'general', prerequisites: [], effects: ['Estilo/talento de combate com duas armas.'], sourceUrl: playersUrl },
  { id: 'arremesso-rapido', name: 'Arremesso Rápido', aliases: ['Arremesso Rapido'], description: 'Manobra que privilegia rapidez e pressão com ataques de arremesso.', category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
  { id: 'ataque-distrativo', name: 'Ataque Distrativo', aliases: ['Ataque Distrativo'], description: 'Manobra que abre guarda, chama atenção e favorece aliados com pressão tática.', category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
  { id: 'ataque-de-manobra', name: 'Ataque de Manobra', aliases: ['Ataque de Manobra'], description: 'Manobra que combina deslocamento, reposicionamento e leitura de oportunidade.', category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
  { id: 'ataque-preparado', name: 'Ataque Preparado', aliases: ['Ataque Preparado'], description: 'Manobra que privilegia disciplina, timing e resposta antecipada no combate.', category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
  { id: 'ataque-preciso', name: 'Ataque Preciso', aliases: ['Ataque Preciso'], description: 'Manobra que foca precisão, acerto limpo e confirmação de uma janela ofensiva.', category: 'extra', prerequisites: [], effects: ['Manobra de combate.'], activation: 'special', sourceUrl: fighterUrl },
]

export const bonfireWeaponSeeds: BonfireWeaponRule[] = [
  { id: 'scale-mail', name: 'Scale Mail', aliases: ['Brunea'], description: 'Armadura media de escamas sobre base reforcada, oferecendo boa protecao com alguma perda de discricao.', shortDescription: 'Armadura media com protecao consistente e alguma desvantagem furtiva.', category: 'armor', properties: ['medium armor'], masteryOptions: [], price: '50 gp', weight: '45 lb', sourceUrl: equipmentUrl },
  { id: 'shield', name: 'Shield', aliases: ['Escudo'], description: 'Escudo de uso defensivo que amplia cobertura e estabilidade na linha de frente.', shortDescription: 'Escudo que melhora a defesa corpo a corpo e a sobrevivencia.', category: 'shield', properties: ['shield'], masteryOptions: [], price: '10 gp', weight: '6 lb', sourceUrl: equipmentUrl },
  { id: 'potion-of-healing', name: 'Potion of Healing', aliases: ['Poção de Cura', 'Pocao de Cura'], description: 'Poção de cura padrão, consumida para restaurar vitalidade de forma imediata.', shortDescription: 'Consumivel de cura imediata.', category: 'consumable', properties: ['healing'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'shortbow', name: 'Shortbow', aliases: ['Arco Curto'], description: 'Arco curto leve e versátil, adequado para ataques à distância rápidos e repetidos.', shortDescription: 'Arma de disparo leve com bom alcance tático.', category: 'simple', damage: '1d6', damageType: 'piercing', properties: ['ammunition', 'two-handed'], masteryOptions: ['vex'], sourceUrl: equipmentUrl },
  { id: 'shortsword', name: 'Shortsword', aliases: ['Espada Curta'], description: 'Lâmina curta de uso rápido, popular entre duelistas e combatentes móveis.', shortDescription: 'Arma leve e ágil para combate próximo.', category: 'martial', damage: '1d6', damageType: 'slashing', properties: ['finesse', 'light'], masteryOptions: ['vex'], sourceUrl: equipmentUrl },
  { id: 'handaxe', name: 'Handaxe', aliases: ['Machado de Mão', 'Machado de Mao', 'Machado de...'], description: 'Machado de mão simples, útil em curta distância e arremesso oportuno.', shortDescription: 'Arma leve que pode ser usada ou arremessada.', category: 'simple', damage: '1d6', damageType: 'slashing', properties: ['light', 'thrown'], masteryOptions: ['vex'], sourceUrl: equipmentUrl },
  { id: 'explorers-pack', name: "Explorer's Pack", aliases: ['Explorer Pack', 'Pacote de Explorador'], description: 'Conjunto de suprimentos de jornada pensado para deslocamento, acampamento e exploração básica.', shortDescription: 'Pacote utilitario de viagem e exploracao.', category: 'equipment', properties: ['pack'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'holy-symbol', name: 'Holy Symbol', aliases: ['Símbolo Sagrado', 'Simbolo Sagrado'], description: 'Foco devocional usado por conjuradores divinos para canalizar fé e formalizar ritos.', shortDescription: 'Foco sagrado para magia divina.', category: 'focus', properties: ['spellcasting focus'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'agua-benta', name: 'Água Benta', aliases: ['Agua Benta', 'Holy Water'], description: 'Água consagrada para uso ritual ou ofensivo contra forças profanas e criaturas apropriadas.', shortDescription: 'Consumivel sagrado contra criaturas vulneraveis ao divino.', category: 'consumable', properties: ['holy water'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'carpenters-tools', name: "Carpenter's Tools", aliases: ['Carpenter Tools'], description: 'Ferramentas de carpintaria para reparos, construção simples e trabalhos em madeira.', category: 'equipment', properties: ['tool'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'cartographers-tools', name: "Cartographer's Tools", aliases: ['Cartographer Tools'], description: 'Ferramentas para mapas, traçado de rotas e registro de territórios.', category: 'equipment', properties: ['tool'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'cooks-utensils', name: "Cook's Utensils", aliases: ['Cook Utensils'], description: 'Utensílios de cozinha para preparo de alimento, conservação e rotina de acampamento.', category: 'equipment', properties: ['tool'], masteryOptions: [], sourceUrl: equipmentUrl },
  { id: 'smiths-tools', name: "Smith's Tools", aliases: ['Smith Tools'], description: 'Ferramentas de ferraria para manutenção, ajuste e pequeno reparo metálico.', category: 'equipment', properties: ['tool'], masteryOptions: [], sourceUrl: equipmentUrl },
]

export const bonfireSpellOverrideSeeds: BonfireSpellOverrideRule[] = [
  { id: 'guidance', spellName: 'Guidance', status: 'allowed', baseDescription: 'Truque divino que oferece um reforço breve de orientação, aumentando a chance de sucesso em uma tarefa importante.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'thaumaturgy', spellName: 'Thaumaturgy', status: 'allowed', baseDescription: 'Truque de manifestação divina com pequenos efeitos sensoriais, voz, tremor e sinais simbólicos.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'sacred-flame', spellName: 'Sacred Flame', status: 'allowed', baseDescription: 'Chama sagrada que desce sobre o alvo como punição divina, exigindo resistência em vez de ataque.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'mind-sliver', spellName: 'Mind Sliver', aliases: ['Mind Sliver (Taumaturgo)'], status: 'allowed', baseDescription: 'Ataque psíquico breve que fere a mente do alvo e fragiliza sua próxima resistência.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'minor-illusion', spellName: 'Ilusão Menor', status: 'allowed', baseDescription: 'Truque de ilusão simples para criar som ou imagem estática, ideal para enganar, distrair ou preparar uma fuga.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'healing-word', spellName: 'Healing Word', status: 'allowed', baseDescription: 'Cura breve à distância por meio de palavra investida de poder divino.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'bane', spellName: 'Bane', status: 'allowed', baseDescription: 'Magia de enfraquecimento que reduz a consistência ofensiva e defensiva de inimigos escolhidos.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'guiding-bolt', spellName: 'Guiding Bolt', status: 'allowed', baseDescription: 'Rajada radiante que fere o alvo e o deixa exposto ao próximo ataque bem-sucedido.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'command', spellName: 'Command', status: 'allowed', baseDescription: 'Ordem mágica de uma palavra que força o alvo a obedecer uma instrução simples e imediata.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'protection-from-evil-and-good', spellName: 'Protection from Evil and Good', aliases: ['Protetion from Evil and Good'], status: 'allowed', baseDescription: 'Proteção espiritual contra certos tipos de criatura, prejudicando sua influência e aproximação.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'silvery-barbs', spellName: 'Silvery Barbs', status: 'nerf', baseDescription: 'Resposta mágica rápida que desestabiliza o sucesso de um inimigo e fortalece um aliado com vantagem subsequente.', description: 'No Bonfire, Silvery Barbs sofre ajuste para reduzir abuso reativo e explosão de controle fora de curva. Revise o texto da mesa antes de usar integralmente a versão padrão.', shortDescription: 'Silvery Barbs possui ajuste Bonfire.', foundryNotes: 'Revisar texto antes de importar.', sourceUrl: spellsUrl },
  { id: 'dissonant-whispers', spellName: 'Dissonant Whispers', status: 'allowed', baseDescription: 'Sussurros psíquicos dolorosos que ferem a mente e podem forçar fuga imediata do alvo.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'phantasmal-force', spellName: 'Força Fantasma', status: 'allowed', baseDescription: 'Ilusão sustentada que convence o alvo de uma ameaça falsa, permitindo dano e controle narrativo por meio da mente.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'tashas-hideous-laughter', spellName: 'Risada Histérica de Tasha', status: 'allowed', baseDescription: 'Encantamento que derruba o alvo em crise de riso incapacitante enquanto durar o efeito.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'nathairs-mischief', spellName: 'Travessura de Nathair', status: 'allowed', baseDescription: 'Área de caos feérico com efeitos aleatórios que atrapalham movimento, foco e posicionamento.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'hold-person', spellName: 'Hold Person', status: 'allowed', baseDescription: 'Paralisa um humanoide ao prender corpo e vontade sob comando arcano ou divino.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'augury', spellName: 'Augury', aliases: ['Algury'], status: 'allowed', baseDescription: 'Divinação breve para avaliar se um curso de ação tende a trazer bons ou maus presságios no futuro imediato.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'bestow-curse', spellName: 'Conceder Maldição', status: 'allowed', baseDescription: 'Maldição poderosa que enfraquece o alvo com um efeito persistente moldado pela escolha do conjurador.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'dispel-magic', spellName: 'Dispel Magic', status: 'allowed', baseDescription: 'Desfaz efeitos mágicos ativos ao quebrar ou enfraquecer a sustentação de um encantamento.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'remove-curse', spellName: 'Remove Curse', status: 'allowed', baseDescription: 'Ritual ou magia de purificação capaz de encerrar maldições em criaturas, itens ou influências persistentes.', foundryNotes: 'Magia liberada sem ajuste Bonfire.', sourceUrl: spellsUrl },
  { id: 'wish', spellName: 'Wish', status: 'adjusted', description: 'Magia com ajuste de campanha.', foundryNotes: 'Revisar limitações Bonfire.', sourceUrl: spellsUrl },
  { id: 'simulacrum', spellName: 'Simulacrum', status: 'limited', description: 'Uso limitado.', foundryNotes: 'Revisar antes de liberar.', sourceUrl: spellsUrl },
  { id: 'clone', spellName: 'Clone', status: 'limited', description: 'Uso limitado.', foundryNotes: 'Revisar antes de liberar.', sourceUrl: spellsUrl },
  { id: 'planar-binding', spellName: 'Planar Binding', status: 'limited', description: 'Uso limitado.', foundryNotes: 'Revisar antes de liberar.', sourceUrl: spellsUrl },
  { id: 'planar-ally', spellName: 'Planar Ally', status: 'rework', description: 'Magia reworkada.', foundryNotes: 'Usar notas Bonfire.', sourceUrl: spellsUrl },
  { id: 'create-spelljammer-realm', spellName: 'Create Spelljammer Realm', status: 'banned', description: 'Magia vetada.', foundryNotes: 'Não importar como disponível.', sourceUrl: spellsUrl },
  { id: 'dream-of-the-blue-veil', spellName: 'Dream of the Blue Veil', status: 'banned', description: 'Magia vetada.', foundryNotes: 'Não importar como disponível.', sourceUrl: spellsUrl },
]
