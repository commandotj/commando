package sync

import (
	"fmt"
	"html"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// GenerateSessionLog writes an HTML session report for the given plan and
// result to {leftRoot}/.commando/reports/{planID}.html.
func GenerateSessionLog(plan *Plan, result *ExecuteResult) error {
	dir := filepath.Join(plan.LeftRoot, ".commando", "reports")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	path := filepath.Join(dir, plan.ID+".html")
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	now := time.Now().UTC().Format(time.RFC3339)
	duration := now // placeholder — actual duration would need a timer

	var b strings.Builder
	b.WriteString(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sync Report</title>
<style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#1a1a1a;background:#fafafa}
h1{font-size:1.5rem;border-bottom:2px solid #e2e8f0;padding-bottom:.5rem}
table{width:100%;border-collapse:collapse;margin:1rem 0}
th,td{padding:.5rem .75rem;text-align:left;border-bottom:1px solid #e2e8f0;font-size:.875rem}
th{background:#f1f5f9;font-weight:600}
.copy{color:#2563eb}.delete{color:#dc2626}.skip{color:#94a3b8}.conflict{color:#d97706}
.summary{display:flex;gap:1.5rem;margin:1rem 0}
.summary span{font-weight:700}
</style></head><body>`)
	fmt.Fprintf(&b, `<h1>Sync Report</h1>
<p>Plan: %s | Started: %s | Duration: %s</p>
<div class="summary"><span>✓ Copied: %d</span><span>✗ Deleted: %d</span><span>− Skipped: %d</span></div>`,
		plan.ID, now, duration, result.Copied, result.Deleted, result.Skipped)

	if len(result.Errors) > 0 {
		b.WriteString("<h2>Errors</h2><ul>")
		for _, e := range result.Errors {
			fmt.Fprintf(&b, "<li>%s</li>", html.EscapeString(e))
		}
		b.WriteString("</ul>")
	}

	b.WriteString("<h2>Files</h2><table><tr><th>Path</th><th>Action</th><th>Reason</th></tr>")
	for _, item := range plan.Items {
		cls := string(item.Action)
		fmt.Fprintf(&b, `<tr><td>%s</td><td class="%s">%s</td><td>%s</td></tr>`,
			html.EscapeString(item.RelativePath), cls, item.Action, html.EscapeString(item.Reason))
	}
	b.WriteString("</table></body></html>")

	_, err = f.WriteString(b.String())
	return err
}
