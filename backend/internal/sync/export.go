package sync

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

// ExportFormat selects how a compare report is written to disk.
type ExportFormat string

const (
	ExportFormatJSON ExportFormat = "json"
	ExportFormatCSV  ExportFormat = "csv"
	ExportFormatText ExportFormat = "text"
)

// ExportReport writes a compare report to w.
func ExportReport(report *CompareReport, format ExportFormat, w io.Writer) error {
	if report == nil {
		return fmt.Errorf("report is nil")
	}
	switch format {
	case ExportFormatJSON:
		enc := json.NewEncoder(w)
		enc.SetIndent("", "  ")
		return enc.Encode(report)
	case ExportFormatCSV:
		return exportReportCSV(report, w)
	case ExportFormatText:
		return exportReportText(report, w)
	default:
		return fmt.Errorf("unsupported export format: %q", format)
	}
}

// ExportReportFile writes a compare report to path.
func ExportReportFile(report *CompareReport, format ExportFormat, path string) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()
	return ExportReport(report, format, file)
}

func exportReportCSV(report *CompareReport, w io.Writer) error {
	writer := csv.NewWriter(w)
	if err := writer.Write([]string{"relativePath", "action", "from", "to", "reason"}); err != nil {
		return err
	}
	for _, item := range report.Items {
		if item.Action == ActionSkip {
			continue
		}
		if err := writer.Write([]string{
			item.RelativePath,
			string(item.Action),
			item.From,
			item.To,
			item.Reason,
		}); err != nil {
			return err
		}
	}
	writer.Flush()
	return writer.Error()
}

func exportReportText(report *CompareReport, w io.Writer) error {
	lines := []string{
		"Commando Sync Compare Report",
		fmt.Sprintf("Generated: %s", report.GeneratedAt),
		fmt.Sprintf("Strategy: %s — %s", report.Strategy.Label, report.Strategy.Description),
		fmt.Sprintf("Left:  %s", report.LeftRoot),
		fmt.Sprintf("Right: %s", report.RightRoot),
		fmt.Sprintf("Summary: %d copy, %d delete, %d conflicts, %d skip",
			report.ToCopy, report.ToDelete, report.Conflicts, report.ToSkip),
		"",
		"Actions:",
	}

	for _, item := range report.Items {
		if item.Action == ActionSkip {
			continue
		}
		line := fmt.Sprintf("[%s] %s", strings.ToUpper(string(item.Action)), item.RelativePath)
		switch item.Action {
		case ActionCopy:
			line += fmt.Sprintf("\n  from: %s\n  to:   %s", item.From, item.To)
		case ActionDelete:
			line += fmt.Sprintf("\n  delete: %s", item.From)
		case ActionConflict:
			line += fmt.Sprintf("\n  left:  %s\n  right: %s", item.From, item.To)
		}
		if item.Reason != "" {
			line += fmt.Sprintf("\n  reason: %s", item.Reason)
		}
		lines = append(lines, line)
	}

	_, err := fmt.Fprintln(w, strings.Join(lines, "\n"))
	return err
}
