# Ludo React · Android

Jogo offline em React 19, TypeScript, Vite e Capacitor 8, com CPU, 2–4 jogadores locais, salvamento automático e opção de acumular dados com 6.

## Instalação

A versão V4 disponibiliza um APK **direto, sem ZIP**, em `https://github.com/SayvaBR/Jogo-ludo/releases/tag/v0.4.0-test` quando a execução de CI no branch principal estiver concluída. É um APK de teste, não de publicação na Play Store. Caso o Android rejeite a atualização de um APK de depuração anterior, remova a instalação antiga e instale novamente.

Para executar localmente: `npm install && npm test && npm run build`. Para gerar o Android: `npx cap add android && npx cap sync android && cd android && ./gradlew assembleDebug` (Node 22, JDK 21 e Android SDK).

## Interface e tabuleiro V4

- Telas de menu e partida implementadas diretamente no jogo, usando as imagens enviadas como referências de linguagem visual (azul-escuro, cartões táteis, cores brilhantes, menos textos, áreas de toque grandes).
- Miniatura do **tabuleiro jogável real** no menu, apenas decorativa; nenhuma imagem estática substitui o tabuleiro em partida.
- Tabuleiro SVG 15×15, quatro bases nas posições clássicas, 52 casas externas, oito casas protegidas, quatro corredores e chegada ao centro. Saídas de cada cor vinculadas ao percurso real, sem nomes ou números sobre o tabuleiro ou sobre os peões.
- Peões esculpidos com gradientes SVG leves, iluminação de seleção, empilhamento com deslocamentos e movimentação por `requestAnimationFrame` em cada salto.
- Dado tridimensional composto por seis faces reais em CSS `preserve-3d`, animação de rotação e salto por transformações na camada de composição; a face final reflete um único resultado sorteado antes da animação. Sons sintetizados no Web Audio com contexto reutilizado: lançamento, batidas, movimento, captura, chegada e vitória.
- Os controles de acessibilidade de movimento reduzido do próprio sistema continuam sendo respeitados, mas o jogo não adiciona um seletor para desativar as animações.

**Desempenho:** 60 FPS é a meta de projeto; compilação e testes automáticos não permitem comprovar FPS sustentados em todos os aparelhos. Medir em Android real para confirmar.

## Regras

- Quatro peões por jogador; precisa obter 6 para sair da base. O 6 concede outra rolagem.
- Capturar adversário em casa não protegida dá nova rolagem. Chegar ao centro também dá nova rolagem, salvo a chegada que encerra a partida.
- Se exatamente uma peça puder andar, o jogo a move automaticamente. Três 6 consecutivos encerram a vez.
- 52 casas externas, cinco na reta final, chegada exata na posição 57. Peões aliados podem compartilhar casas sem formar barreiras nesta edição.
- Vence quem chegar com os quatro peões. Variante opcional acumular 6: pode rolar antes de andar; uma captura ou chegada preserva a fila restante.
- Dado justo: cada face tem 1/6 de probabilidade teórica, gerado por `crypto.getRandomValues` com amostragem por rejeição. Repetições são possíveis e naturais.

As partidas salvas antes da versão 3 não são retomadas porque o percurso foi corrigido. O salvamento atual mantém a versão 3 e é compatível com esta atualização visual V4.

## Validação e limites

`npm test` inclui regras de captura e rolagem extra, chegada, movimento automático, casas protegidas, dados acumulados, sorteio e conexão dos quatro percursos. A CI valida testes, TypeScript, compilação web e APK. Ainda são necessários testes visuais, de toque e de FPS em celulares reais antes de considerar o produto final. Sem multiplayer online ou publicação na Play Store.
