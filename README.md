# Ludo React · Android

Jogo mobile offline em React 19, TypeScript, Vite e Capacitor 8. Migrado do protótipo Godot para uma única stack de interface; regras reimplementadas como funções puras e testáveis, com CPU, 2–4 jogadores locais, salvamento automático, tabuleiro SVG, animações por casa e variante opcional de acumular dados com 6.

## Executar

```bash
npm install
npm test
npm run dev
npm run build
```

## APK Android

Em **Actions > React Ludo / Android APK**, execute **Run workflow**; após sucesso, baixe o artifact `ludo-android-debug`, descompacte e instale o APK. A compilação também roda em push e PR. Build de depuração para testes, não assinado para publicação na Play Store. Requer npm/Node 22, Android SDK e JDK 21 para compilar localmente: `npm install && npm run build && npx cap add android && npx cap sync android && cd android && ./gradlew assembleDebug`.

## Regras implementadas

- Quatro peças por jogador, entrada com 6 e rolagem extra ao tirar 6.
- Três 6 consecutivos perdem o turno; jogadas já executadas permanecem.
- 52 casas externas, oito casas seguras e cinco casas na reta final; chegada exata na posição 57.
- Captura em casa não segura, devolvendo o adversário à base; aliados podem compartilhar casas, sem bloqueios.
- Vence quem terminar as quatro peças. Captura e chegada não concedem bônus na variante clássica escolhida.
- **Acumular 6** é variante opcional: ao tirar 6, joga novamente antes de mover; após resultado diferente de 6, consome a fila de dados em ordem. O terceiro 6 cancela a fila.

As regras secundárias do Ludo variam entre edições. A configuração acima é a variante digital documentada neste projeto, não uma alegação de regras universais. Referências: https://www.mastersofgames.com/rules/ludo-rules-instructions-guide.htm e https://ludo-helpdesk.dynamicnext.com/support/solutions/articles/4000222082-rules-specials .

## Limites atuais

Sem multiplayer online, matchmaking, monetização, ranking online nem validação manual em dispositivos reais. A interface utiliza áudio gerado localmente e fontes do sistema quando offline; nenhuma lógica do jogo exige conexão. Não confundir APK de depuração com app pronto para publicar.
