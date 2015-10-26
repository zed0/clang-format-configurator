# clang-format-configurator
Interactively create a clang-format configuration while watching how the changes affect your code.
## Installation
```
cd client
bower install
cd ../server/js
npm install
cd ../llvm
mkdir 3.7.0
wget http://llvm.org/releases/3.7.0/clang+llvm-3.7.0-x86_64-linux-gnu-ubuntu-14.04.tar.xz
tar xvf clang+llvm-3.7.0-x86_64-linux-gnu-ubuntu-14.04.tar.xz --strip-components=1 -C 3.7.0.src
mkdir 3.7.0.src
wget http://llvm.org/releases/3.7.0/cfe-3.7.0.src.tar.xz
tar xvf cfe-3.7.0.src.tar.xz --strip-components=1 -C 3.7.0.src
```

## Requirements
All requirements should be available through your package manager:
* node
* firejail (assuming you want to sandbox the process)
## Usage
With firejail:
```
server/launch.sh
```

Without firejail:
```
cd server && js/server.js
```

## History
Version 0.0.1
## Credits
Author: Ben Falconer
## License
MIT
