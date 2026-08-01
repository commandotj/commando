package services

import (
	"bytes"
	"strings"
	"sync/atomic"
	"testing"
)

func TestStreamNDJSON_LargeDoneLine(t *testing.T) {
	large := strings.Repeat("x", 128*1024)
	payload := `{"type":"done","status":"done","result":{"items":[{"relativePath":"` + large + `"}]}}`
	stdout := strings.NewReader(`{"type":"progress","file":"a","done":1,"total":1}` + "\n" + payload + "\n")

	svc := &SyncService{}
	sawDone := &atomic.Bool{}
	var events []map[string]any
	svc.runtime = &Runtime{
		Events: func(_ string, payload any) {
			if p, ok := payload.(map[string]any); ok {
				events = append(events, p)
			}
		},
	}

	if err := svc.streamNDJSON("job-1", stdout, sawDone); err != nil {
		t.Fatalf("streamNDJSON: %v", err)
	}
	if !sawDone.Load() {
		t.Fatal("expected done event for large NDJSON line")
	}
	if len(events) != 2 {
		t.Fatalf("events=%d want 2", len(events))
	}
	if events[1]["type"] != "done" {
		t.Fatalf("last event type=%v", events[1]["type"])
	}
	if events[0]["jobId"] != "job-1" {
		t.Fatalf("jobId=%v", events[0]["jobId"])
	}
}

func TestStreamNDJSON_MultipleLines(t *testing.T) {
	stdout := bytes.NewBufferString(
		"{\"type\":\"progress\",\"done\":1,\"total\":2}\n" +
			"{\"type\":\"done\",\"status\":\"done\"}\n",
	)
	svc := &SyncService{}
	svc.runtime = &Runtime{
		Events: func(_ string, _ any) {},
	}
	sawDone := &atomic.Bool{}
	if err := svc.streamNDJSON("j", stdout, sawDone); err != nil {
		t.Fatalf("streamNDJSON: %v", err)
	}
	if !sawDone.Load() {
		t.Fatal("expected done")
	}
}

func TestSyncProgressToMap_IncludesZeroTotals(t *testing.T) {
	m := syncProgressToMap("job-x", SyncProgressPayload{
		Type:   "progress",
		Action: "index",
		Done:   42,
		Total:  0,
		File:   "left/a.jpg",
	})
	if m["done"] != 42 {
		t.Fatalf("done=%v", m["done"])
	}
	if m["total"] != 0 {
		t.Fatalf("total=%v", m["total"])
	}
	if m["jobId"] != "job-x" {
		t.Fatalf("jobId=%v", m["jobId"])
	}
}

func TestBuildCLIJobError(t *testing.T) {
	msg := buildCLIJobError(nil, nil, "")
	if msg != "sync CLI finished without a done event" {
		t.Fatalf("msg=%q", msg)
	}
}
