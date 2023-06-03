WEBEXT = web-ext --artifacts-dir build --ignore-files Makefile README.org

build: *.svg *.xpi *.png *.js *.css *.json *.html
	$(WEBEXT) build

sign: *.svg *.xpi *.png *.js *.css *.json *.html
	$(WEBEXT) sign
