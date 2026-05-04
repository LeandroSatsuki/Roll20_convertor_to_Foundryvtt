# Unresolved Rules Workflow

Quando uma regra nao e encontrada ou fica ambigua, o app cria uma entrada na fila de revisao.

A fila guarda:

- nome bruto da ficha;
- secao onde apareceu;
- personagem, classe e raca;
- candidatos encontrados;
- motivo da incerteza;
- tipo sugerido.

Na UI, o usuario pode aceitar uma resolucao, escolher outro candidato, marcar como generico ou ignorar. No MVP web, o navegador nao grava direto em `data/bonfire`, entao o app permite baixar `user-overrides.local.json`.

Para incorporar um override no repositorio, revise o JSON baixado e converta a escolha em seed local ou alias novo.
