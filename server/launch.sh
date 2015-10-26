#!/bin/sh

set -e

cd $( dirname "${BASH_SOURCE[0]}" )

if [ ! -e ./node ]
then
	ln $( which node )
fi

firejail \
	--private=$( pwd ) \
	--private-bin=true \
	--shell=none \
	--ipc-namespace \
	--nogroups \
	--read-only=launch.sh \
	--read-only=js \
	--read-only=llvm \
	--read-only=node \
	--nosound \
	--caps.drop=all \
	-- ~/node js/server.js
