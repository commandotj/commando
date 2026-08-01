package services

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRunCLIJob_WaitsForStdoutBeforeDoneCheck(t *testing.T) {
	if os.Getenv("GOOS") == "windows" {
		t.Skip("shell script helper")
	}

	script := filepath.Join(t.TempDir(), "slow-done.sh")
	content := `#!/bin/sh
printf '%s\n' '{"type":"progress","done":1,"total":1}'
sleep 0.05
printf '%s\n' '{"type":"done","status":"done","result":{"ok":true}}'
`
	if err := os.WriteFile(script, []byte(content), 0o755); err != nil {
		t.Fatal(err)
	}

	svc := &SyncService{cliPath: script, appCtx: context.Background()}
	jobID := "race-test"
	ctx := context.Background()
	svc.jobCancels.Store(jobID, func() {})

	var sawDone atomic.Bool
	var lastPayload any
	svc.runtime = &Runtime{
		Events: func(_ string, payload any) {
			if m, ok := payload.(SyncProgressPayload); ok && m.Type == "done" {
				sawDone.Store(true)
				lastPayload = m
			}
			if m, ok := payload.(map[string]any); ok && m["type"] == "done" {
				sawDone.Store(true)
				lastPayload = m
			}
		},
	}

	done := make(chan struct{})
	go func() {
		svc.runCLIJob(jobID, ctx, []string{}, svc.runtime.Events)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("runCLIJob timed out")
	}

	if !sawDone.Load() {
		t.Fatal("expected done event")
	}
	if m, ok := lastPayload.(SyncProgressPayload); ok {
		if m.Status == "error" {
			t.Fatalf("unexpected error done: %+v", m)
		}
	}
	if m, ok := lastPayload.(map[string]any); ok {
		if m["status"] == "error" {
			t.Fatalf("unexpected error done: %+v", m)
		}
	}
}

func TestBuildCLIJobError_IncludesWaitAndStderr(t *testing.T) {
	waitErr := exec.ErrNotFound
	msg := buildCLIJobError(waitErr, nil, "permission denied")
	if !strings.Contains(msg, "not found") || !strings.Contains(msg, "permission denied") {
		t.Fatalf("msg=%q", msg)
	}
}
