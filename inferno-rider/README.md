# INFERNO RIDER

Hack'n'slash mobile em **um único arquivo** (`index.html`). Canvas 2D puro, sem
bibliotecas, sem build, sem nenhum asset externo — sprites, som, ícones, manifest
e service worker são todos gerados por código em runtime.

Você é **CINZA**, um cavaleiro amaldiçoado que vendeu a alma e atravessa os cinco
círculos do Inferno para resgatá-la. Corpo em chamas, corrente de fogo como arma,
moto espectral como traslado entre as fases.

## Rodar

```bash
python3 -m http.server 8080     # ou: npx serve
```

Abra `http://localhost:8080/inferno-rider/`.

Abrir por `file://` funciona, mas sem service worker nem instalação como PWA —
o navegador bloqueia ambos nesse protocolo.

## Controles

**Mobile (dois polegares, nada cobre a ação)**

| Controle | Ação |
|---|---|
| Metade esquerda | Joystick analógico, nasce onde o dedo toca (dead zone 12%) |
| Deslizar o joystick | Esquiva com i-frames |
| **ATK** | Toque = combo de 3; segurar = golpe pesado carregado |
| **PULO** | Toque = pulo; toque duplo = pulo duplo; segurar no ar = planar |
| **COR** | Corrente: puxa inimigos leves, puxa CINZA até pesados e ganchos |
| **FUR** | Olhar de Penitência, quando a barra enche |

Multitouch real: mover e atacar ao mesmo tempo.

**Desktop:** WASD mover · J atacar · K pular · L corrente · Espaço fúria ·
Shift esquiva · Esc pausa. Gamepad é detectado automaticamente.

## Conteúdo

- **5 círculos**, cada um com paleta e gimmick próprios: Limbo (tutorial),
  Luxúria (vento), Avarícia (ouro derretido e plataformas que afundam),
  Violência (perseguição na moto em auto-scroll), Traição (gelo escorregadio).
- **3 bosses** com três fases cada (mudam em 66% e 33% de vida) e execução por QTE.
- **3 inimigos base**: Condenado, Gárgula e Coloso de Osso — este só abre a guarda
  quando a corrente arranca o escudo.
- **Sistema de Almas**: a postura PUNIR/ABSOLVER (alternável no HUD, e uma escolha
  dramática após cada boss) decide o saldo entre almas/fúria e cura. O acumulado
  define qual dos **2 finais** você recebe.
- Loja de upgrades entre as fases, save em `localStorage`, dois finais.

## Notas técnicas

- Resolução interna fixa 960×540, escalada por CSS mantendo o aspect ratio.
- Loop com acumulador e passo fixo de 1/60s — física determinística.
- Estados: `BOOT → MENU → CUTSCENE → GAMEPLAY → PAUSE/SHOP → GAMEOVER/VICTORY`.
- Pools pré-alocados para partículas (1000), projéteis, orbes e obstáculos:
  nada é alocado por frame durante o combate.
- Áudio 100% sintetizado na Web Audio API (osciladores, ruído, envelopes), com
  trilha procedural própria por círculo.
- **Qualidade adaptativa**: o DPR é limitado a 1.5 no nível máximo (o gargalo é
  taxa de preenchimento, não JS — o jogo faz várias passadas de tela cheia). Se o
  quadro passar de ~20ms por dois segundos, o jogo derruba um degrau sozinho:
  menos partículas → sem iluminação radial → DPR 1.
- O céu de cada fase e os gradientes de chão/perigo são rasterizados uma vez e
  reaproveitados, em vez de reavaliados a cada quadro.

### Service worker

O SW é registrado a partir de um `Blob`, para manter o jogo em um arquivo só.
Alguns navegadores recusam `blob:` como script de service worker; a falha é
engolida de propósito, sem sujar o console. Sem SW o jogo continua rodando
offline: a página não busca nenhum recurso externo, então o cache HTTP do
navegador (e o webapp adicionado à tela de início no iOS) já bastam.

## Depuração

`?debug=1` mostra FPS, contagem de partículas, inimigos e o nível de qualidade
atual no canto inferior esquerdo.
