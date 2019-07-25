#!/bin/sh

set -e

cd $( dirname "${BASH_SOURCE[0]}" )

firejail \
    --noprofile \
    --force \
    --private="$( pwd )" \
    --shell=none \
    --nogroups \
    --read-only=server/launch.sh \
    --read-only=server/js \
    --read-only=server/llvm \
    --read-only=server/node_modules \
    --read-only=/usr/local/bin/npm \
    --netfilter=server/clang-format-configurator.net \
    --nosound \
    --caps.drop=all \
    -- npm start
