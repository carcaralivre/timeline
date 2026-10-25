#!/bin/sh
# Gera docs/index.html (GitHub Pages) a partir de artifact/tempo.html,
# envolvendo-o no mesmo esqueleto HTML que o artefato recebe ao ser publicado.
set -e
cd "$(dirname "$0")/.."
mkdir -p docs
{
  printf '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<style>:root{color-scheme:light}body{margin:0}img{max-width:100%%}[hidden]{display:none!important}</style>\n</head>\n<body>\n'
  cat artifact/tempo.html
  printf '\n</body>\n</html>\n'
} > docs/index.html
echo "docs/index.html gerado ($(wc -c < docs/index.html | tr -d ' ') bytes)"
