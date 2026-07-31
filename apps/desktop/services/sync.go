package services

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os/exec"
	gosync "sync"
	"sync/atomic"

	"github.com/google/uuid"
	"github.com/commandotj/commando/internal/sync"
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
	return s.startJob(func(ctx context.Context) (any, error) {
		report, err := sync.BuildReport(req.LeftRoot, req.RightRoot, req.strategyID(), req.Options)
		if err != nil {
			return nil, err
		}
		return report.Plan, nil
	})
}

func (s *SyncService) Execute(plan sync.Plan, opts sync.Options) (SyncJobResult, error) {
	jobID := uuid.NewString()
	emit := s.runtime.Events
	err := s.runtime.Tasks.Start(jobID, func(ctx context.Context) error {
		emit(EventSyncProgress, map[string]any{"jobId": jobID, "type": "progress", "status": "running"})
		result, runErr := sync.Execute(ctx, &plan, opts,
			func(rel string, act sync.Action, done, total int, itemErr error) {
				p := map[string]any{"jobId": jobID, "type": "progress", "file": rel, "action": string(act), "done": done, "total": total}
				if itemErr != nil { p["error"] = itemErr.Error() }
				emit(EventSyncProgress, p)
			})
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

func (s *SyncService) Compare(req SyncRequest) (SyncJobResult, error) {
	strategy, err := sync.ResolveStrategy(req.strategyID())
	if err != nil { return SyncJobResult{}, err }
	jobID := uuid.NewString()
	ctx, cancel := context.WithCancel(s.appCtx)
	s.jobCancels.Store(jobID, cancel)
	emit := s.runtime.Events
	go func() {
		defer s.jobCancels.Delete(jobID)
		args := []string{"sync", "plan", "--left", req.LeftRoot, "--right", req.RightRoot, "--direction", string(strategy.Direction), "--progress"}
		cmd := exec.CommandContext(ctx, s.cliPath, args...)
		stdout, _ := cmd.StdoutPipe()
		if err := cmd.Start(); err != nil {
			emit(EventSyncProgress, map[string]any{"jobId": jobID, "type": "done", "status": "error", "error": fmt.Sprintf("failed: %v", err)})
			return
		}
		sawDone := &atomic.Bool{}
		go s.streamNDJSON(jobID, stdout, sawDone)
		cmd.Wait()
		if !sawDone.Load() {
			st := "error"
			if ctx.Err() == context.Canceled { st = "canceled" }
			emit(EventSyncProgress, map[string]any{"jobId": jobID, "type": "done", "status": st})
		}
	}()
	return SyncJobResult{JobID: jobID}, nil
}

func (s *SyncService) streamNDJSON(jobID string, r io.Reader, sawDone *atomic.Bool) {
	scanner := bufio.NewScanner(r)
	for scanner.Scan() {
		var p SyncProgressPayload
		if json.Unmarshal(scanner.Bytes(), &p) != nil { continue }
		p.JobID = jobID
		if p.Type == "done" { sawDone.Store(true) }
		s.runtime.Events(EventSyncProgress, p)
	}
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
