#!/bin/bash
set -e

clang_versions="4.0.0 3.9.1 3.9.0 3.8.1 3.8.0 3.7.0 3.6.2 3.6.1 3.6.0 3.5.2 3.5.0"

clang_other_versions="
3.4.2,http://llvm.org/releases/3.4.2/cfe-3.4.2.src.tar.gz,http://llvm.org/releases/3.4.2/clang+llvm-3.4.2-x86_64-linux-gnu-ubuntu-14.04.xz
3.4.1,http://llvm.org/releases/3.4.1/cfe-3.4.1.src.tar.gz,http://llvm.org/releases/3.4.1/clang+llvm-3.4.1-x86_64-unknown-ubuntu12.04.tar.xz
3.4,http://llvm.org/releases/3.4/clang-3.4.src.tar.gz,http://llvm.org/releases/3.4/clang+llvm-3.4-x86_64-unknown-ubuntu12.04.tar.xz
"

function tar_flags {
	echo "xv$(echo "$1" | sed '
		/\.xz$/c\J
		/\.gz$/c\z
	')"
}

function generate_source_url {
	echo "http://llvm.org/releases/$1/cfe-$1.src.tar.xz"
}

function generate_binary_url {
	echo "http://llvm.org/releases/$1/clang+llvm-$1-x86_64-linux-gnu-ubuntu-14.04.tar.xz"
}


cd "$( dirname "${BASH_SOURCE[0]}" )"
this_dir=$(pwd)

cd client
bower install
cd ..

cd server/js
npm install
cd ../..

cd server/llvm

for normal_version in $clang_versions
do
	# shellcheck disable=SC2086
	clang_other_versions="$clang_other_versions$normal_version,$(generate_source_url $normal_version),$(generate_binary_url $normal_version)
"
done

for tuple in $clang_other_versions
do
	IFS=","
	# shellcheck disable=SC2086
	set $tuple
	version=$1
	source_url=$2
	binary_url=$3
	if [ ! -d "$version.src" ]
	then
		echo "Downloading $version.src"
		mkdir "$version.src"
		wget "$source_url" --quiet -O - | tar "$(tar_flags "$source_url")" --strip-components=1 -C "$version.src" --occurrence=1 --wildcards '*/docs/ClangFormatStyleOptions.rst'
	fi

	if [ ! -d "$version" ]
	then
		echo "Downloading $version"
		mkdir "$version"
		wget "$binary_url" --quiet -O - | tar "$(tar_flags "$binary_url")" --strip-components=1 -C "$version" --occurrence=1 --wildcards '*bin/clang-format'
	fi
done


while true
do
	read -rp "Do you wish to compile HEAD of the clang git tree (Yn)?" yn
	case $yn in
		[Nn]* ) exit;;
		[Yy]* ) break;;
		'' ) break;;
	esac
done

temp_dir=$(mktemp -d)
git clone http://llvm.org/git/llvm.git "$temp_dir"
cd "$temp_dir/tools"
git clone http://llvm.org/git/clang.git clang
cd ..
mkdir build
cd build
cmake -G "Unix Makefiles" ..
make clang-format -j "$(grep -c "^processor" /proc/cpuinfo)"
cd "$this_dir/server/llvm"

mkdir -p HEAD/bin
cp "$temp_dir/build/bin/clang-format" HEAD/bin

mkdir -p HEAD.src/docs
cp "$temp_dir/tools/clang/docs/ClangFormatStyleOptions.rst" HEAD.src/docs

rm -rf "$temp_dir"
