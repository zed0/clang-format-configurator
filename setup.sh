#!/bin/bash
set -e

clang_versions="3.7.0 3.6.2 3.6.1 3.6.0 3.5.2 3.5.0"

function generate_source_url {
	echo "http://llvm.org/releases/$1/cfe-$1.src.tar.xz"
}

function generate_binary_url {
	echo "http://llvm.org/releases/$1/clang+llvm-$1-x86_64-linux-gnu-ubuntu-14.04.tar.xz"
}

cd $( dirname "${BASH_SOURCE[0]}" )

cd client
bower install
cd ..

cd server/js
npm install
cd ..

cd server/llvm
for version in $clang_versions
do
	source_url=$(generate_source_url $version)
	mkdir $version.src
	wget $source_url --quiet -O - | tar xvJ --strip-components=1 -C $version.src --occurrence=1 --wildcards '*/docs/ClangFormatStyleOptions.rst'

	binary_url=$(generate_binary_url $version)
	mkdir $version
	wget $binary_url --quiet -O - | tar xvJ --strip-components=1 -C $version --occurrence=1 --wildcards '*bin/clang-format'
done
