# Rafa Paoli's Shooter — Ultimate V3

Space-shooter em HTML5 Canvas. Single-file (`index.html`), zero build step,
zero dependências (exceto PeerJS via CDN, só pro modo Online).

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
| `tennis/` | **Tênis Star ⭐** — jogo de tênis arcade mobile (veja abaixo). |
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

## Tênis Star ⭐ (`tennis/`)

Jogo de tênis arcade pra mobile, inspirado nos clássicos estilo
Mario Tennis. Independente do shooter: `tennis/index.html` +
`tennis/game.js`, canvas puro, zero dependências, zero build.

Acessa em `http://localhost:8080/tennis/` (ou `/tennis/` no GitHub Pages).

- **4 personagens** com arquétipos diferentes — RAFA (equilibrado),
  LUMA (velocista), BRUTUS (potência) e ZIZI (malandra) — com stats de
  velocidade, força e alcance.
- **Golpes**: normal, top spin, lob e deixadinha (botões on-screen);
  a mira segue a direção em que você está correndo na hora da batida.
- **Golpe especial ⭐** — encha o medidor acertando bolas e dispare um
  smash com rastro de arco-íris e screen shake.
- **Placar de verdade**: 15/30/40, vantagem, games — primeiro a 3 games
  leva a partida.
- **3 dificuldades** de IA, com tempo de reação e erro de leitura que
  escalam (no difícil ela antecipa, cruza a bola e castiga quem fica
  na rede com lob).
- **Controles**: arrasta pra correr (analógico virtual flutuante),
  toque pra sacar. No desktop: setas/WASD + `Z` top spin, `X` lob,
  `C` deixadinha, `V` especial, espaço saca.
- Áudio 100% sintetizado via Web Audio, vibração háptica nos golpes.

## Créditos

- Game design, código e arte: **Rafael (rafaelpaolishotte)**
- Phase 1-4 refactor pass: Claude (Anthropic)
- PeerJS (modo Online)
