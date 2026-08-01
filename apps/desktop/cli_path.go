package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// materializeEmbeddedCLI writes the embedded CLI to a stable cache path.
func materializeEmbeddedCLI() (string, error) {
	if len(cliBinary) == 0 {
		return "", fmt.Errorf("no embedded CLI")
	}
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	cacheDir = filepath.Join(cacheDir, "commando", "cli")
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return "", err
	}
	sum := sha256.Sum256(cliBinary)
	path := filepath.Join(cacheDir, "commando-"+hex.EncodeToString(sum[:8]))
	if st, err := os.Stat(path); err == nil && !st.IsDir() && st.Size() == int64(len(cliBinary)) {
		return path, nil
	}
	if err := os.WriteFile(path, cliBinary, 0o755); err != nil {
		return "", err
	}
	return path, nil
}

func resolveCLIPath() (string, error) {
	if path, err := materializeEmbeddedCLI(); err == nil {
		return path, nil
	}

	home, _ := os.UserHomeDir()
	_ = os.Setenv("PATH", os.Getenv("PATH")+":"+filepath.Join(home, "go", "bin"))

	if path, err := exec.LookPath("commando"); err == nil {
		return path, nil
	}

	candidates := []string{
		"commando",
		filepath.Join("..", "..", "bin", "commando"),
	}
	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(
			[]string{filepath.Join(dir, "commando")},
			candidates...,
		)
	}
	for _, candidate := range candidates {
		abs, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		st, err := os.Stat(abs)
		if err != nil || st.IsDir() {
			continue
		}
		return abs, nil
	}

	return "", fmt.Errorf("commando CLI not found; run: make cli")
}
