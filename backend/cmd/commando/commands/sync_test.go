package commands_test

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// buildCLI compiles the commando binary once per test run and returns its path.
func buildCLI(t *testing.T) string {
	t.Helper()
	bin := filepath.Join(t.TempDir(), "commando")
	cmd := exec.Command("go", "build", "-o", bin, "github.com/commandotj/commando/cmd/commando")
	cmd.Dir = repoRoot(t)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("build CLI failed: %v\n%s", err, out)
	}
	return bin
}

func repoRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	// cmd/commando/commands -> backend
	return filepath.Join(dir, "..", "..", "..")
}

func TestPlanCmd_ProgressFlag_EmitsNDJSONLines(t *testing.T) {
	bin := buildCLI(t)
	left := t.TempDir()
	right := t.TempDir()
	if err := os.WriteFile(filepath.Join(left, "a.txt"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command(bin, "sync", "plan", "--left", left, "--right", right, "--direction", "l2r", "--progress")
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	if err := cmd.Run(); err != nil {
		t.Fatalf("plan --progress failed: %v", err)
	}

	lines := strings.Split(strings.TrimSpace(stdout.String()), "\n")
	if len(lines) < 2 {
		t.Fatalf("expected at least 2 NDJSON lines (progress + done), got %d: %q", len(lines), stdout.String())
	}

	for i, line := range lines {
		var payload map[string]any
		if err := json.Unmarshal([]byte(line), &payload); err != nil {
			t.Fatalf("line %d not valid JSON: %v\nline: %s", i, err, line)
		}
	}

	var last map[string]any
	if err := json.Unmarshal([]byte(lines[len(lines)-1]), &last); err != nil {
		t.Fatal(err)
	}
	if last["type"] != "done" {
		t.Errorf("expected last line type=done, got %v", last["type"])
	}
}

func TestPlanCmd_NoProgressFlag_UnchangedOutput(t *testing.T) {
	bin := buildCLI(t)
	left := t.TempDir()
	right := t.TempDir()
	if err := os.WriteFile(filepath.Join(left, "a.txt"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	cmd := exec.Command(bin, "sync", "plan", "--left", left, "--right", right, "--direction", "l2r")
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	if err := cmd.Run(); err != nil {
		t.Fatalf("plan failed: %v", err)
	}

	var plan map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &plan); err != nil {
		t.Fatalf("expected single JSON object without --progress, got: %v\noutput: %s", err, stdout.String())
	}
	if _, ok := plan["items"]; !ok {
		t.Errorf("expected plan JSON to have items field, got: %v", plan)
	}
}
