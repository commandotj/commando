.PHONY: cli cli-install test-go desktop dev-desktop setup-desktop

BIN_DIR := bin
WAILS3 := ./scripts/wails3.sh

cli:
	cd backend && go build -o ../$(BIN_DIR)/commando ./cmd/commando

cli-install:
	cd backend && go install ./cmd/commando

test-go:
	go test ./backend/... ./apps/desktop/...

desktop:
	cd apps/desktop && ../../$(WAILS3) build

dev-desktop:
	cd apps/desktop && ../../$(WAILS3) dev -config ./build/config.yml -port $${WAILS_VITE_PORT:-5189}

setup-desktop:
	./scripts/ensure-desktop-tools.sh
