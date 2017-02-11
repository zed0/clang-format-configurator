#!/bin/sh

set -e

cd $( dirname "${BASH_SOURCE[0]}" )

firejail \
	--noprofile \
	--force \
	--private=$( pwd ) \
	--private-bin=true \
	--shell=none \
	--nogroups \
	--read-only=launch.sh \
	--read-only=js \
	--read-only=llvm \
	--read-only=/usr/local/bin/node \
	--read-only=privkey.pem \
	--read-only=fullchain.pem \
	--netfilter=clang-format-configurator.net \
	--nosound \
	--caps.drop=all \
	-- /usr/local/bin/node js/server.js
