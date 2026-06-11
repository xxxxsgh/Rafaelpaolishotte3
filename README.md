# Rafa Paoli's Shooter — Ultimate V3

Space-shooter em HTML5 Canvas. Single-file (`index.html`), zero build step,
zero dependências (exceto PeerJS via CDN, só pro modo Online).

## 🪐 Sequência: Shooter 2 — Queda em Vermilion

A continuação oficial está em **`shooter2.html`** (acessível pelo botão
"SHOOTER 2" no menu principal). Após destruir Genesis Omega no primeiro
jogo, a explosão abre uma fenda dimensional e a nave do piloto cai em
**Vermilion-7**, um planeta fora de todas as cartas estelares.

Diferente do original (nave, scroll vertical), o 2 é um **shooter
top-down de visão de cima**: você anda a pé pelo planeta com WASD, mira
com o mouse e explora um mundo aberto de 3600×3600.

- **Missão**: recuperar os 4 fragmentos da nave nos extremos do planeta,
  cada um guardado por um boss (Rainha do Enxame, Colosso Basáltico,
  Apex, Hidra Ácida), reparar a nave e enfrentar o boss final —
  **Eco de Genesis** (3 fases). Boss opcional: **Verme Colossal**.
- **4 personagens jogáveis** do primeiro jogo: Marcelo, Felipe,
  Takeshi e Titan, cada um com bônus próprios.
- **Combate**: 4 armas com recarga ativa (estilo Gears), tiro carregado
  perfurante, melee com execução, dash com i-frames e afterimage,
  8 tipos de inimigos + variantes corrompidas, mini-chefes nomeados.
- **Mundo aberto 4800×4800**: 2 cidades em ruínas, 3 NPCs com diálogos
  e sidequests, 9 logs da expedição Caliburn, eventos dinâmicos
  (tempestade de Genesis, carga de suprimentos, ninho desperto),
  ciclo dia/noite e terreno que se corrompe conforme o progresso.
- **Corrupção como recurso**: inimigos corrompidos dropam estilhaços
  de Genesis que compram upgrades proibidos com maldições — 3+ pactos
  travam o final bom (**2 finais**).
- **Progressão**: sucata como moeda, oficina com 7 melhorias e arsenal,
  habilidade ativa (Q) ganha de cada guardião derrotado, combo
  multiplicador, New Game+ e desafio diário com seed da data.
- **Mundo vivo**: ~95 rochas sólidas que bloqueiam movimento e balas
  (cover real), IA anti-kiting (mira com interceptação, investidas,
  spawn direcional), regiões com identidade (pântano lento ao sul,
  névoa cega ao leste, ninhos destrutíveis ao norte, oeste rochoso)
  e ondas pontuais de pressão.
- **Meta-progressão**: 3 personagens destrancáveis ao derrotar seus
  rivais, 10 conquistas, estatísticas acumuladas, auto-save da run a
  cada 10s com botão CONTINUAR, e Modo Horda infinito pós-zerar.
- **Áudio**: música procedural via WebAudio com 3 estados (exploração,
  combate, boss) + SFX sintetizados.
- **Acessível**: controles mobile twin-stick com aim assist, suporte a
  gamepad, menu de opções (volume, tremor de tela, números de dano,
  modo desempenho sem glow) e tutorial jogado nos primeiros segundos.
- **Extras**: minimapa, seta de objetivo, cinemática de queda, intro
  narrativa, números de dano, hit-stop, slow-motion na morte de boss,
  vibração no Android, high score em LocalStorage (key `rps2_save_v1`).
  Single-file, zero dependências.

## Rodar local

Não precisa de bundler. Abre num servidor http simples:

```bash
# Python 3
python3 -m http.server 8080
# ou Node
npx serve -p 8080
```

Acessa `http://localhost:8080/`.

> ⚠️ Abrir direto via `file://` quebra o Service Worker (PWA) e o
> PeerJS. Sempre serve por HTTP/HTTPS.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | HTML + CSS + 15 `<script src="js/NN.js">` tags em ordem. |
| `js/01-bootstrap.js` | Constants, audio synth, DPR setup, Object.defineProperty trick. |
| `js/02-util.js` | Utilities, high scores, settings, touch controls, leaderboard. |
| `js/03-fx-bullets.js` | Background, particles, FloatingText, bullets, ally robot. |
| `js/04-player.js` | Player class (todos os personagens). |
| `js/05-enemies-boss.js` | Inimigos (Enemy, UFO, Tank, etc), XP orb, PowerUp, Boss. |
| `js/06-menu-ui.js` | Persistence, menu nav, skill tree, boss rush, stats, daily. |
| `js/07-online.js` | PeerJS + reconnect/ping (Phase 3.7). |
| `js/08-hud-lifecycle.js` | HUD, Survivor/Infinite UI, boss intro, phase loading, lifecycle, spawnEnemy, Phase 3 CONFIG/Input/save + Phase 1 FEEL helpers. |
| `js/09-combat.js` | Damage/death, timer updates, collision passes. |
| `js/10-input-openworld.js` | Spawn trigger, gamepad, keyboard, Open World galaxy. |
| `js/11-gameloop-init.js` | Main game loop (`gameTick`), resize, bgLoop, init, adaptive monitor. |
| `js/12-expansion-systems.js` | RPG, advanced combat, epic bosses, economy, missions, AI, VFX, achievements, ship customization, navigation. |
| `js/13-expansion-modes.js` | Multiplayer simulation, challenges, narrative. |
| `js/14-expansion-extras.js` | Crafting, daily rewards, faction reputation, extended skill tree, sound system, perf monitor, easter eggs, leaderboard, weapons, boss loot, synergy. |
| `js/15-expansion-tail.js` | Final content + boost + gap-filler. |
| `sw.js` | Service Worker (cacheia todos os 15 chunks). |
| `preview/` | Demos standalone (testáveis isolados — usados pra QA mobile). |
| `README.md` / `CHANGELOG.md` | Documentação. |

O JS dentro de `index.html` está organizado por seções marcadas com
`// SECTION N — ...`. Phase 1-4 adicionam blocos identificados como
`// ─── Phase X.Y ...`.

## Controles

### Teclado
- `← → / A D` — mover
- `Espaço / ↑` — atirar
- `A` — habilidade do personagem
- `P / Esc` — pausa

### Toque (mobile)
- Botões on-screen (esquerda/direita/atirar/habilidade).
- Toggle de auto-fire nas settings.

### Gamepad
- Stick analógico: mover
- Botão 0: atirar
- Botão 1: habilidade
- Botão 9 (Start): pausa

### Debug
- `?debug=1` na URL: mostra o painel de FPS / partículas / entidades.
- `F3`: toggle do painel manualmente.

## Modos

- **Campaign** — fases progressivas, boss a cada fase.
- **Infinite** — waves crescendo até morrer.
- **Survivor** — sobreviva o máximo, XP / level-ups in-run.
- **Boss Rush** — sequência de bosses.
- **PvP Local** — 2 jogadores no mesmo dispositivo.
- **Open World** — galáxia explorável com setores, quests, facções.
- **Online (PeerJS)** — 2 jogadores em rede via código de 6 chars.
- **Daily Challenge** — seed do dia, modifier aleatório.

## Saves

LocalStorage, key `rafaPaoliV2`. Versionado (`SAVE_VERSION = 3`) com
migração automática. Export/Import via console:

```js
exportSave();   // baixa JSON
importSave();   // file picker, valida + migra + recarrega
```

## Engine (Phase 1+ highlights)

- **Fixed timestep 60 Hz** com accumulator (Glenn Fiedler). FPS de
  render desacoplado da simulação — 30Hz, 60Hz, 120Hz, todos rodam a
  mesma velocidade.
- **Hitstop + slow-motion** via `State.hitstopUntil` / `State.timeScale`.
- **Scheduled events queue** — substitui `setTimeout` no game loop;
  eventos pausam junto com o jogo.
- **Trauma-based screen shake** (`shake = trauma² × 16px`).
- **DPR retina** — backing store em devicePixelRatio (cap 2×), mas
  `CANVAS.width / .height` continuam expondo CSS-px pra compatibilidade
  com o código de gameplay (truque via `Object.defineProperty`).
- **Adaptive quality** — degrada partículas/shake automaticamente sob
  FPS baixo sustentado.

## Créditos

- Game design, código e arte: **Rafael (rafaelpaolishotte)**
- Phase 1-4 refactor pass: Claude (Anthropic)
- PeerJS (modo Online)
