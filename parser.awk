#!/usr/bin/awk -f
#
# Usage:
#   ./awk_parser.awk ./ClangFormatStyleOptions.rst > Test
# or:
#   awk -f ./awk_parser.awk ./ClangFormatStyleOptions.h > ./Test.h

BEGIN {

}

/^\*\*BasedOnStyle\*\*/ {
    in_range = 1
}

in_range && /START_FORMAT_STYLE_OPTIONS/ {
    in_range = 0
}

in_range && /\*\s``(\w+)``/ {
    match($2, /[A-Za-z]+/,out)
    printf("%s,",out[0])
}

END {

}
