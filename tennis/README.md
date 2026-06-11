# Super Toss Tennis 🎾

Jogo de tênis arcade para **mobile**, inspirado no Mario Tennis. Single-file
(`index.html`), HTML5 Canvas, **zero dependências** e zero build step.

## Rodar

Abra `tennis/index.html` num servidor http simples (igual ao shooter):

```bash
python3 -m http.server 8080
# acesse http://localhost:8080/tennis/
```

Funciona direto no navegador do celular. É só tocar na tela.

## Como jogar

| Controle | Ação |
|---|---|
| **Analógico** (canto inferior esquerdo) | Mover o jogador pela quadra |
| **TOP** 🔴 | Topspin — rápido e afunda na quadra |
| **SLICE** 🔵 | Cortada baixa e curta, difícil de devolver |
| **LOB** 🟣 | Bola alta por cima do adversário |
| **Segurar** o botão | Carrega a tacada (barra). Encher tudo = **tacada estrela ⭐** |

No saque, toque em qualquer botão de tacada para lançar.

**Teclado (desktop):** setas para mover · `Z` topspin · `X` slice · `C` lob.

## Recursos

- Quadra pseudo-3D em perspectiva com rede, sombras e física de bola
  (altura, quique, spin) e detecção de rede / bola fora.
- Placar de tênis real (15·30·40·game, deuce/vantagem), games e set.
- 4 personagens com atributos diferentes (velocidade / força / controle).
- 4 níveis de dificuldade da CPU (Fácil → Pro).
- Tacada carregada com barra e tacada estrela turbinada.
- Áudio sintetizado via WebAudio (sem arquivos), partículas e screen shake.

## Estrutura

Tudo num único `index.html`: HTML + CSS + um `<script>` com o motor do jogo
(geometria da quadra, física da bola, IA da CPU, placar, render em canvas e
controles touch).
