# Ludo React · Android

Jogo offline em React 19, TypeScript, Vite e Capacitor 8, com CPU, 2–4 jogadores locais, salvamento automático, tabuleiro SVG e variante opcional de acumular dados com 6.

## Executar

```bash
npm install
npm test
npm run dev
npm run build
```

## APK Android

No GitHub, abra **Actions > React Ludo / Android APK**. Depois de uma execução bem-sucedida, baixe o artifact `ludo-android-debug`, descompacte-o e instale o APK. O workflow é executado também para pull requests. É um APK de teste, não um arquivo de distribuição da Play Store. Compilação local: Node 22, JDK 21 e Android SDK; `npm install && npm run build && npx cap add android && npx cap sync android && cd android && ./gradlew assembleDebug`.

## Regras desta edição

- Quatro peões por jogador; um 6 libera peões da base e concede outra rolagem.
- **Capturar um peão adversário concede outra rolagem**; a captura só acontece ao parar em casa não protegida.
- **Levar um peão ao centro concede outra rolagem**, exceto ao vencer com o quarto peão: nesse caso a partida termina e é possível começar uma revanche.
- Cada jogada concede no máximo uma rolagem extra, mesmo que o 6 também provoque captura.
- **Movimento automático:** quando há exatamente uma peça com movimento legal, a interface seleciona e move essa peça; se há mais de uma escolha, o jogador decide. Serve também para CPU e não aplica jogadas ilegais.
- Três 6 consecutivos encerram a vez e descartam eventual fila de dados; jogadas já realizadas permanecem.
- Percurso externo de 52 casas, oito casas seguras, cinco na reta final e chegada exata na posição 57.
- Peões aliados podem compartilhar casas sem formar barreiras nesta edição.
- Vence quem completar os quatro peões.
- **Variante acumular 6:** ao obter um 6, lance novamente antes de mover. Ao obter um resultado não 6, processe a fila pela ordem; captura ou chegada concede uma rolagem extra antes de continuar a fila restante.

Regras secundárias variam entre edições do Ludo; esta é a configuração escolhida para o jogo. Referências: https://www.mastersofgames.com/rules/ludo-rules-instructions-guide.htm e https://ludo-helpdesk.dynamicnext.com/support/solutions/articles/4000222082-rules-specials .

## Tabuleiro e movimento

Tabuleiro refeito em SVG com bases em relevo, peões numerados, casas seguras com estrelas, acabamento responsivo e cores corretas nas quatro regiões do centro. Os movimentos interpolam a posição do peão em cada quadro usando `requestAnimationFrame`, no ritmo de atualização do navegador. **60 FPS é a meta; a taxa real depende do dispositivo e precisa ser medida em celulares reais.** Opção de reduzir animações disponível nas configurações e respeitada quando o sistema solicita movimento reduzido.

## Testes e limites

`npm test` inclui regressões de captura com rolagem extra, chegada, movimento automático, casas protegidas e dados acumulados. Testes unitários e compilação no GitHub não substituem testes de interação e desempenho em aparelhos reais. Ainda sem multiplayer online, matchmaking, monetização ou publicação na Play Store.
