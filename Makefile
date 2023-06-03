sources := $(wildcard *.svg *.png *.js *.css *.json *.html)

export WEB_EXT_IGNORE_FILES := $(filter-out $(sources),$(wildcard *))
export WEB_EXT_ARTIFACTS_DIR := build

build: build/addon.xpi

build/addon.xpi: $(sources)
	mkdir -p build
	zip $@ $^

build-webext: $(sources)
	web-ext build --ignore-files $(WEB_EXT_IGNORE_FILES)

sign-webext: $(sources)
	web-ext sign --channel=unlisted --ignore-files $(WEB_EXT_IGNORE_FILES)

.PHONY: build build-webext sign-webext
