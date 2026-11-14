# Estrelário Noturno

Caderno noturno/editorial interativo em português brasileiro, feito com HTML, CSS e JavaScript vanilla.

## Rodar localmente

Como o projeto é estático, qualquer servidor HTTP simples pode executá-lo:

```bash
python3 -m http.server 3000
```

Depois, abra `http://localhost:3000`.

## Publicação

O repositório contém um workflow em `.github/workflows/pages.yml`. A cada push na branch `main`, o GitHub Actions envia os arquivos para o GitHub Pages.

No GitHub, abra **Settings → Pages** e selecione **GitHub Actions** como fonte caso essa opção ainda não esteja ativada. Depois da primeira execução concluída, o endereço costuma ser:

`https://domm239.github.io/ssdw/`

As notas, o perfil, as imagens adicionadas aos posts, as solicitações de seguidores e a moderação continuam sendo recursos locais do navegador (`localStorage`). Este projeto ainda não possui autenticação, banco de dados ou múltiplas contas reais.
