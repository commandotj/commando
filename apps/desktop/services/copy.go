package services

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/systembugtj/commando/internal/copy"
)

type CopyBatchResult = copy.BatchResult

// CopyService handles file copy operations for the Wails UI.
type CopyService struct {
	runtime *Runtime
}

// NewCopyService creates a copy service that runs work off the Wails binding thread.
func NewCopyService(runtime *Runtime) *CopyService {
	return &CopyService{runtime: runtime}
}

// CopyBatch starts a background copy and returns immediately with a batch ID.
func (c *CopyService) CopyBatch(sources []string, destination string) (CopyBatchResult, error) {
	if len(sources) == 0 {
		return CopyBatchResult{}, errors.New("no sources provided")
	}

	batchID := uuid.NewString()
	emit := c.runtime.Events

	err := c.runtime.Tasks.Start(batchID, func(ctx context.Context) error {
		_, runErr := copy.BatchWithOptions(sources, destination, copy.Options{
			Context: ctx,
			OnProgress: func(progress copy.Progress) {
				emit(EventCopyBatchProgress, map[string]any{
					"taskId": batchID,
					"type":   "progress",
					"current": progress.ProcessedFiles,
					"total":   progress.TotalFiles,
					"file":    progress.CurrentFile,
					"status":  "running",
					"fileProgress": map[string]any{
						"copied": progress.FileCopied,
						"total":  progress.FileTotal,
					},
				})
			},
		})

		status := "done"
		if runErr != nil {
			if errors.Is(runErr, context.Canceled) {
				status = "canceled"
			} else {
				status = "error"
			}
		}

		emit(EventCopyBatchProgress, map[string]any{
			"taskId": batchID,
			"type":   "done",
			"status": status,
			"error":  errorString(runErr),
		})
		return runErr
	})
	if err != nil {
		return CopyBatchResult{}, err
	}

	return CopyBatchResult{BatchID: batchID}, nil
}

// CancelCopyBatch cancels a running batch by ID.
func (c *CopyService) CancelCopyBatch(batchID string) (map[string]any, error) {
	cancelled := c.runtime.Tasks.Cancel(batchID)
	return map[string]any{"cancelled": cancelled, "taskId": batchID}, nil
}

// GetCopyQueueStatus reports how many copy tasks are active.
func (c *CopyService) GetCopyQueueStatus() (map[string]any, error) {
	return map[string]any{"queueSize": c.runtime.Tasks.ActiveCount()}, nil
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
