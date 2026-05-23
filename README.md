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
| `index.html` | Jogo inteiro. Inclui HTML, CSS e ~16k linhas de JS num único `<script>`. |
| `sw.js` | Service Worker pra cache offline (Phase 2.5). |
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
