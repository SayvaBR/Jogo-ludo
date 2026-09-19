# Ludo Nativo · Godot 4.6.3

Jogo Android criado em Godot 4/GDScript, sem dependências de terceiros. Este repositório contém um motor de regras separado da interface, tabuleiro vetorial, partidas locais de 2–4 jogadores, modo contra CPU, salvamento automático, variante de acumular 6 e pipeline de compilação de APK.

## Regras documentadas
Usamos uma variante digital explícita: quatro peões por jogador; um 6 libera peão na casa inicial e concede outra jogada; três 6 consecutivos encerram a vez; oito casas seguras (quatro saídas e quatro estrelas); pousar sobre adversários em casa não segura captura; entrada na reta final após completar o percurso; chegada com dado exato; vence quem levar quatro peões ao centro. Peões aliados podem compartilhar casas, sem formar bloqueio; captura/chegada não concedem dado extra. Regras tradicionais variam por edição.

Fontes: https://www.mastersofgames.com/rules/ludo-rules-instructions-guide.htm ; https://www.gamevelvet.com/ludo-online/rules ; https://docs.godotengine.org/en/4.6/tutorials/export/exporting_for_android.html

## Abrir
Instale Godot 4.6.3 Standard, abra `project.godot`, execute o projeto. Para obter o APK: GitHub Actions > Testes e APK Android > Run workflow; após sucesso, baixe artifact `ludo-android-debug` (ZIP contendo o APK). O APK é de teste, não um lançamento na Google Play.

## Testes locais
`godot --headless --editor --path . --import --quit`
`godot --headless --path . --script tests/rules_test.gd`

## Status
Código inicial implementado. Testes e compilação dependem de CI verde, e a validação manual em aparelhos reais ainda é necessária. Online, áudio, monetização e assinatura de produção não estão implementados. Nunca adicione keystores de produção ao repositório.
