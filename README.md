# clang-format-configurator
Interactively create a clang-format configuration while watching how the changes affect your code.

## Requirements
All requirements should be available through your package manager:
* node
* firejail (assuming you want to sandbox the process)

## Installation
The setup script will install the various npm and bower dependencies and then download the clang-format binaries and documentation from the [official releases] (http://llvm.org/releases/download.html).
If you want to disable some versions, or add new ones, alter the `clang_versions` variable at the top of `setup.sh`
```
chmod u+x setup.sh
./setup.sh
```

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
