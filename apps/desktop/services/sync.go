package services

import (
	"context"
	"errors"

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

// SyncService exposes compare/plan/execute operations to the Wails UI.
type SyncService struct {
	runtime *Runtime
}

// NewSyncService creates a sync service that runs heavy work in background goroutines.
func NewSyncService(runtime *Runtime) *SyncService {
	return &SyncService{runtime: runtime}
}

// Plan builds a sync plan on a background goroutine.
func (s *SyncService) Plan(req SyncRequest) (SyncJobResult, error) {
	return s.startJob(func(ctx context.Context) (any, error) {
		report, err := sync.BuildReport(req.LeftRoot, req.RightRoot, req.strategyID(), req.Options)
		if err != nil {
			return nil, err
		}
		return report.Plan, nil
	})
}

// Execute runs a sync plan on a background goroutine.
func (s *SyncService) Execute(plan sync.Plan, opts sync.Options) (SyncJobResult, error) {
	return s.startJob(func(ctx context.Context) (any, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		return sync.Execute(&plan, opts)
	})
}

// Compare builds a strategy-aware report on a background goroutine.
func (s *SyncService) Compare(req SyncRequest) (SyncJobResult, error) {
	req.Options.DryRun = true
	return s.startJob(func(ctx context.Context) (any, error) {
		return sync.BuildReport(req.LeftRoot, req.RightRoot, req.strategyID(), req.Options)
	})
}

// ExportReport writes a compare report to disk.
func (s *SyncService) ExportReport(req ExportReportRequest) (ExportReportResult, error) {
	if req.FilePath == "" {
		return ExportReportResult{}, errors.New("file path is required")
	}
	format := req.Format
	if format == "" {
		format = sync.ExportFormatJSON
	}
	if err := sync.ExportReportFile(&req.Report, format, req.FilePath); err != nil {
		return ExportReportResult{}, err
	}
	return ExportReportResult{FilePath: req.FilePath}, nil
}

// ListStrategies returns built-in sync strategies from the Go module.
func (s *SyncService) ListStrategies() []sync.Strategy {
	return sync.ListStrategies()
}

func (req SyncRequest) strategyID() sync.StrategyID {
	if req.StrategyID != "" {
		return req.StrategyID
	}
	switch req.Direction {
	case sync.DirectionRightToLeft:
		if req.Options.DeleteExtraneous {
			return sync.StrategyMirrorLeft
		}
		return sync.StrategyUpdateLeft
	case sync.DirectionBidirectional:
		return sync.StrategyTwoWay
	default:
		if req.Options.DeleteExtraneous {
			return sync.StrategyMirrorRight
		}
		return sync.StrategyUpdateRight
	}
}

// CancelSync cancels a running sync job.
func (s *SyncService) CancelSync(jobID string) (map[string]any, error) {
	cancelled := s.runtime.Tasks.Cancel(jobID)
	return map[string]any{"cancelled": cancelled, "jobId": jobID}, nil
}

func (s *SyncService) startJob(fn func(ctx context.Context) (any, error)) (SyncJobResult, error) {
	jobID := uuid.NewString()
	emit := s.runtime.Events

	err := s.runtime.Tasks.Start(jobID, func(ctx context.Context) error {
		emit(EventSyncProgress, map[string]any{
			"jobId":  jobID,
			"type":   "progress",
			"status": "running",
		})

		result, runErr := fn(ctx)
		status := "done"
		if runErr != nil {
			if errors.Is(runErr, context.Canceled) {
				status = "canceled"
			} else {
				status = "error"
			}
		}

		emit(EventSyncProgress, map[string]any{
			"jobId":  jobID,
			"type":   "done",
			"status": status,
			"result": result,
			"error":  errorString(runErr),
		})
		return runErr
	})
	if err != nil {
		return SyncJobResult{}, err
	}

	return SyncJobResult{JobID: jobID}, nil
}
