package sync_test

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/commandotj/commando/internal/sync"
)

func TestBuildReport_MirrorRightDeletesExtraneousOnRight(t *testing.T) {
	left := t.TempDir()
	right := t.TempDir()

	rightOnly := filepath.Join(right, "orphan.txt")
	if err := os.WriteFile(rightOnly, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	report, err := sync.BuildReport(left, right, sync.StrategyMirrorRight, sync.Options{})
	if err != nil {
		t.Fatal(err)
	}

	if report.ToDelete != 1 {
		t.Fatalf("expected 1 delete, got %d", report.ToDelete)
	}
	if report.Items[0].Action != sync.ActionDelete {
		t.Fatalf("expected delete action, got %s", report.Items[0].Action)
	}
	if report.Items[0].From != rightOnly {
		t.Fatalf("expected delete from %s, got %s", rightOnly, report.Items[0].From)
	}
}

func TestExportReportText_IncludesFromTo(t *testing.T) {
	report := &sync.CompareReport{
		Strategy: sync.Strategy{
			ID:          sync.StrategyUpdateRight,
			Label:       "Update → Right",
			Description: "copy newer files",
		},
		LeftRoot:    "/left",
		RightRoot:   "/right",
		GeneratedAt: "2026-01-01T00:00:00Z",
		Items: []sync.ReportItem{
			{
				RelativePath: "a.txt",
				Action:       sync.ActionCopy,
				From:         "/left/a.txt",
				To:           "/right/a.txt",
				Reason:       "missing on right",
			},
		},
		ToCopy: 1,
	}

	var buf bytes.Buffer
	if err := sync.ExportReport(report, sync.ExportFormatText, &buf); err != nil {
		t.Fatal(err)
	}

	out := buf.String()
	if !strings.Contains(out, "from: /left/a.txt") {
		t.Fatalf("expected from path in export: %s", out)
	}
	if !strings.Contains(out, "to:   /right/a.txt") {
		t.Fatalf("expected to path in export: %s", out)
	}
}

func TestResolveStrategy_UnknownID(t *testing.T) {
	_, err := sync.ResolveStrategy("nope")
	if err == nil {
		t.Fatal("expected error for unknown strategy")
	}
}
