.PHONY: test
test: 
	clang test.cpp -std=c++11 -lstdc++ -Wall -Wextra -Winit-self -Wunused-parameter -Wmissing-prototypes -Wmissing-declarations -Wshorten-64-to-32 -Wnull-dereference -Wzero-as-null-pointer-constant -Wold-style-cast -o test && ./test

indent:
	clang-format -i -style="{BasedOnStyle: Google, IndentWidth: 8, UseTab: Always, AllowShortIfStatementsOnASingleLine: false, ColumnLimit: 0, ContinuationIndentWidth: 8, SpaceAfterCStyleCast: true, IndentCaseLabels: false, AllowShortBlocksOnASingleLine: false, AllowShortFunctionsOnASingleLine: false, SortIncludes: false}" pmtiles.hpp test.cpp
