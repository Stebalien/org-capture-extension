sources := $(wildcard *.svg *.png *.js *.css *.json *.html)

export WEB_EXT_IGNORE_FILES := $(filter-out $(sources),$(wildcard *))
export WEB_EXT_ARTIFACTS_DIR := build

build: $(sources)
	web-ext build --ignore-files $(WEB_EXT_IGNORE_FILES)

sign: $(sources)
	web-ext sign --ignore-files $(WEB_EXT_IGNORE_FILES)

.PHONY: build sign
