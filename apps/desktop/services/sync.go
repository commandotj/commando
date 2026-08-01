package services

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"strings"
	gosync "sync"
	"sync/atomic"

	"github.com/google/uuid"
	"github.com/systembug/commando/internal/sync"
	"github.com/systembug/commando/internal/sync/filter"
)

type SyncRequest struct {
	LeftRoot   string            `json:"leftRoot"`
	RightRoot  string            `json:"rightRoot"`
	StrategyID sync.StrategyID   `json:"strategyId"`
	Direction  sync.Direction    `json:"direction"`
	Options    sync.Options      `json:"options"`
}

type ExportReportRequest struct {
	Report   sync.CompareReport `json:"report"`
	FilePath string             `json:"filePath"`
	Format   sync.ExportFormat  `json:"format"`
}

type ExportReportResult struct {
	FilePath string `json:"filePath"`
}

type SyncJobResult struct {
	JobID string `json:"jobId"`
}

type SyncService struct {
	runtime    *Runtime
	cliPath    string
	appCtx     context.Context
	jobCancels gosync.Map
}

func NewSyncService(runtime *Runtime, cliPath string, appCtx context.Context) *SyncService {
	return &SyncService{runtime: runtime, cliPath: cliPath, appCtx: appCtx}
}

type SyncProgressPayload struct {
	JobID  string `json:"jobId,omitempty"`
	Type   string `json:"type,omitempty"`
	Status string `json:"status,omitempty"`
	Result any    `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
	File   string `json:"file,omitempty"`
	Action string `json:"action,omitempty"`
	Done   int    `json:"done,omitempty"`
	Total  int    `json:"total,omitempty"`
}

func (s *SyncService) Plan(req SyncRequest) (SyncJobResult, error) {
	return s.Compare(req)
}

func (s *SyncService) Execute(plan sync.Plan, opts sync.Options) (SyncJobResult, error) {
	jobID := uuid.NewString()
	ctx, cancel := context.WithCancel(s.appCtx)
	s.jobCancels.Store(jobID, cancel)
	emit := s.runtime.Events

	go func() {
		args := []string{"sync", "run",
			"--left", plan.LeftRoot,
			"--right", plan.RightRoot,
			"--direction", string(plan.Direction),
		}
		if opts.DryRun {
			args = append(args, "--dry-run")
		}
		args = appendFilterArgs(args, opts.Filter)
		if opts.DeleteExtraneous {
			args = append(args, "--delete-extraneous")
		}
		if opts.ErrorMode != "" {
			args = append(args, "--error-mode", opts.ErrorMode)
		}
		if opts.DeleteMethod != "" {
			args = append(args, "--delete-method", opts.DeleteMethod)
		}
		if opts.VersionDir != "" {
			args = append(args, "--version-dir", opts.VersionDir)
		}
		if opts.VerifyCopies {
			args = append(args, "--verify")
		}
		if opts.Resume {
			args = append(args, "--resume")
		}
		if opts.Reset {
			args = append(args, "--reset")
		}
		args = append(args, "--progress")
		s.runCLIJob(jobID, ctx, args, emit)
	}()

	return SyncJobResult{JobID: jobID}, nil
}

func (s *SyncService) Compare(req SyncRequest) (SyncJobResult, error) {
	strategy, err := sync.ResolveStrategy(req.strategyID())
	if err != nil { return SyncJobResult{}, err }
	jobID := uuid.NewString()
	ctx, cancel := context.WithCancel(s.appCtx)
	s.jobCancels.Store(jobID, cancel)
	emit := s.runtime.Events
	go func() {
		args := []string{
			"sync", "plan",
			"--left", req.LeftRoot,
			"--right", req.RightRoot,
			"--direction", string(strategy.Direction),
			"--progress",
		}
		args = appendFilterArgs(args, req.Options.Filter)
		s.runCLIJob(jobID, ctx, args, emit)
	}()
	return SyncJobResult{JobID: jobID}, nil
}

func appendFilterArgs(args []string, rules filter.FilterRules) []string {
	if len(rules.Include) > 0 {
		args = append(args, "--include", strings.Join(rules.Include, ","))
	}
	if len(rules.Exclude) > 0 {
		args = append(args, "--exclude", strings.Join(rules.Exclude, ","))
	}
	return args
}

func (s *SyncService) runCLIJob(jobID string, ctx context.Context, args []string, emit EventEmitter) {
	defer s.jobCancels.Delete(jobID)

	cmd := exec.CommandContext(ctx, s.cliPath, args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		emit(EventSyncProgress, map[string]any{
			"jobId": jobID, "type": "done", "status": "error",
			"error": fmt.Sprintf("stdout pipe: %v", err),
		})
		return
	}
	var stderrBuf bytes.Buffer
	cmd.Stderr = &stderrBuf

	if err := cmd.Start(); err != nil {
		emit(EventSyncProgress, map[string]any{
			"jobId": jobID, "type": "done", "status": "error",
			"error": fmt.Sprintf("start CLI: %v", err),
		})
		return
	}

	sawDone := &atomic.Bool{}
	var wg gosync.WaitGroup
	wg.Add(1)
	var scanErr error
	go func() {
		defer wg.Done()
		scanErr = s.streamNDJSON(jobID, stdout, sawDone)
	}()

	waitErr := cmd.Wait()
	wg.Wait()

	if sawDone.Load() {
		return
	}

	status := "error"
	if errors.Is(waitErr, context.Canceled) || ctx.Err() == context.Canceled {
		status = "canceled"
	}
	emit(EventSyncProgress, map[string]any{
		"jobId": jobID, "type": "done", "status": status,
		"error": buildCLIJobError(waitErr, scanErr, stderrBuf.String()),
	})
}

func buildCLIJobError(waitErr, scanErr error, stderr string) string {
	var parts []string
	if waitErr != nil {
		parts = append(parts, waitErr.Error())
	}
	if scanErr != nil {
		parts = append(parts, fmt.Sprintf("stdout read: %v", scanErr))
	}
	if stderr = strings.TrimSpace(stderr); stderr != "" {
		parts = append(parts, stderr)
	}
	if len(parts) == 0 {
		return "sync CLI finished without a done event"
	}
	return strings.Join(parts, "; ")
}

func (s *SyncService) streamNDJSON(jobID string, r io.Reader, sawDone *atomic.Bool) error {
	scanner := bufio.NewScanner(r)
	// Plan done lines can exceed the default 64KB scanner token limit.
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 16*1024*1024)
	for scanner.Scan() {
		var p SyncProgressPayload
		if json.Unmarshal(scanner.Bytes(), &p) != nil {
			continue
		}
		if p.Type == "done" {
			sawDone.Store(true)
		}
		// Wails events must use map[string]any with camelCase keys (same as CopyService).
		s.runtime.Events(EventSyncProgress, syncProgressToMap(jobID, p))
	}
	return scanner.Err()
}

func syncProgressToMap(jobID string, p SyncProgressPayload) map[string]any {
	m := map[string]any{
		"jobId": jobID,
		"type":  p.Type,
	}
	if p.Status != "" {
		m["status"] = p.Status
	}
	if p.Result != nil {
		m["result"] = p.Result
	}
	if p.Error != "" {
		m["error"] = p.Error
	}
	if p.File != "" {
		m["file"] = p.File
	}
	if p.Action != "" {
		m["action"] = p.Action
	}
	if p.Type == "progress" {
		m["done"] = p.Done
		m["total"] = p.Total
	}
	return m
}

func (s *SyncService) ExportReport(req ExportReportRequest) (ExportReportResult, error) {
	if req.FilePath == "" { return ExportReportResult{}, errors.New("file path is required") }
	format := req.Format
	if format == "" { format = sync.ExportFormatJSON }
	if err := sync.ExportReportFile(&req.Report, format, req.FilePath); err != nil { return ExportReportResult{}, err }
	return ExportReportResult{FilePath: req.FilePath}, nil
}

func (s *SyncService) ListStrategies() []sync.Strategy { return sync.ListStrategies() }

func (req SyncRequest) strategyID() sync.StrategyID {
	if req.StrategyID != "" { return req.StrategyID }
	switch req.Direction {
	case sync.DirectionRightToLeft:
		if req.Options.DeleteExtraneous { return sync.StrategyMirrorLeft }
		return sync.StrategyUpdateLeft
	case sync.DirectionBidirectional:
		return sync.StrategyTwoWay
	default:
		if req.Options.DeleteExtraneous { return sync.StrategyMirrorRight }
		return sync.StrategyUpdateRight
	}
}

func (s *SyncService) CancelSync(jobID string) (map[string]any, error) {
	if cancel, ok := s.jobCancels.Load(jobID); ok {
		cancel.(context.CancelFunc)()
		return map[string]any{"cancelled": true, "jobId": jobID}, nil
	}
	cancelled := s.runtime.Tasks.Cancel(jobID)
	return map[string]any{"cancelled": cancelled, "jobId": jobID}, nil
}

func (s *SyncService) startJob(fn func(ctx context.Context) (any, error)) (SyncJobResult, error) {
	jobID := uuid.NewString()
	emit := s.runtime.Events
	err := s.runtime.Tasks.Start(jobID, func(ctx context.Context) error {
		emit(EventSyncProgress, map[string]any{"jobId": jobID, "type": "progress", "status": "running"})
		result, runErr := fn(ctx)
		status := "done"
		if runErr != nil {
			if errors.Is(runErr, context.Canceled) { status = "canceled" } else { status = "error" }
		}
		emit(EventSyncProgress, map[string]any{"jobId": jobID, "type": "done", "status": status, "result": result, "error": errorString(runErr)})
		return runErr
	})
	if err != nil { return SyncJobResult{}, err }
	return SyncJobResult{JobID: jobID}, nil
}
