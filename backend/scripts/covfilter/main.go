// Command covfilter recomputes statement coverage from a `go test
// -coverprofile` file, excluding any covered-block whose source line falls
// inside a `// coverage:ignore ...` comment span.
//
// A block is ignored if the immediately preceding non-blank source line
// (relative to the block's start line) is a "// coverage:ignore" comment,
// or is itself part of a multi-line comment that starts with one.
//
// Usage: covfilter <profile.out> <package-dir-relative-to-module-root>
package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

// modulePath is the Go module's import path prefix, resolved once via
// `go list`, so profile entries (which are always import-path-qualified)
// can be mapped back to real files on disk.
func modulePath() string {
	// GOWORK=off: this repo has a root go.work spanning multiple modules
	// (backend + apps/desktop). Plain "go list -m" inside a workspace lists
	// every module in the workspace, one per line, which is not what we
	// want here. Disabling workspace mode resolves just the single module
	// covfilter is actually being run against.
	cmd := exec.Command("go", "list", "-m")
	cmd.Env = append(os.Environ(), "GOWORK=off")
	out, err := cmd.Output()
	if err != nil {
		fmt.Fprintln(os.Stderr, "covfilter: go list -m failed:", err)
		os.Exit(1)
	}
	return strings.TrimSpace(string(out))
}

func toDiskPath(importQualifiedFile, modPath string) string {
	rel := strings.TrimPrefix(importQualifiedFile, modPath+"/")
	return rel
}

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: covfilter <profile.out> <package-dir>")
		os.Exit(2)
	}
	profilePath := os.Args[1]
	pkgDir := os.Args[2]
	modPath := modulePath()

	sourceLines := make(map[string][]string) // file -> lines (0-indexed)

	profile, err := os.Open(profilePath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer profile.Close()

	var totalStmts, coveredStmts int64

	scanner := bufio.NewScanner(profile)
	scanner.Scan() // skip "mode: atomic" header
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		// Format: file:startLine.startCol,endLine.endCol numStmt count
		fields := strings.Fields(line)
		if len(fields) != 3 {
			continue
		}
		filePart := fields[0]
		numStmt, _ := strconv.ParseInt(fields[1], 10, 64)
		count, _ := strconv.ParseInt(fields[2], 10, 64)

		colonIdx := strings.LastIndex(filePart, ":")
		importFile := filePart[:colonIdx]
		rangePart := filePart[colonIdx+1:]

		startLine := parseStartLine(rangePart)

		diskFile := toDiskPath(importFile, modPath)
		lines, ok := sourceLines[diskFile]
		if !ok {
			lines = readSourceFile(diskFile)
			sourceLines[diskFile] = lines
		}

		if isIgnored(lines, startLine) {
			continue
		}

		totalStmts += numStmt
		if count > 0 {
			coveredStmts += numStmt
		}
	}

	_ = pkgDir // reserved: multi-package profiles could filter by dir here

	if totalStmts == 0 {
		fmt.Println("0.0")
		return
	}
	pct := float64(coveredStmts) / float64(totalStmts) * 100
	fmt.Printf("%.1f\n", pct)
}

func parseStartLine(rangePart string) int {
	// rangePart looks like "43.10,47.3"
	commaIdx := strings.Index(rangePart, ",")
	startPart := rangePart[:commaIdx]
	dotIdx := strings.Index(startPart, ".")
	n, _ := strconv.Atoi(startPart[:dotIdx])
	return n
}

func readSourceFile(file string) []string {
	data, err := os.ReadFile(file)
	if err != nil {
		return nil
	}
	return strings.Split(string(data), "\n")
}

// isIgnored reports whether the statement block starting at startLine
// (1-indexed, as reported by `go test -coverprofile`) opens onto a
// "// coverage:ignore" comment on the very next source line — i.e. the
// first line inside the block, right after the "if err != nil {" line
// itself.
func isIgnored(lines []string, startLine int) bool {
	if lines == nil || startLine < 1 || startLine >= len(lines) {
		return false
	}
	next := strings.TrimSpace(lines[startLine])
	return strings.HasPrefix(next, "// coverage:ignore")
}
