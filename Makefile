.PHONY: cli cli-install test-go desktop desktop-package desktop-install dev-desktop setup-desktop

BIN_DIR := bin
WAILS3 := ./scripts/wails3.sh

cli:
	./scripts/build-commando-cli.sh

cli-install:
	cd backend && go install ./cmd/commando

test-go:
	go test ./backend/... ./apps/desktop/...

desktop:
	cd apps/desktop && ../../$(WAILS3) build

desktop-package:
	test "$$(uname -s)" = "Darwin"
	cd apps/desktop && ../../$(WAILS3) task darwin:package

desktop-install: desktop-package
	mkdir -p "/Applications/Commando.app"
	rsync -a --delete "apps/desktop/bin/Commando.app/" "/Applications/Commando.app/"

dev-desktop:
	cd apps/desktop && ../../$(WAILS3) dev -config ./build/config.yml -port $${WAILS_VITE_PORT:-5189}

setup-desktop:
	./scripts/ensure-desktop-tools.sh
