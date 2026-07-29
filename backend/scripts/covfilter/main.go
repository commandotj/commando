// Command covfilter recomputes statement coverage from a `go test
// -coverprofile` file, excluding any block exempted by a
// "// coverage:ignore ..." comment. See isIgnored for the exact rule.
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

		startLine, _ := parseLineRange(rangePart)

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

func parseLineRange(rangePart string) (startLine, endLine int) {
	// rangePart looks like "43.10,47.3"
	commaIdx := strings.Index(rangePart, ",")
	startPart := rangePart[:commaIdx]
	endPart := rangePart[commaIdx+1:]

	startDot := strings.Index(startPart, ".")
	startLine, _ = strconv.Atoi(startPart[:startDot])

	endDot := strings.Index(endPart, ".")
	endLine, _ = strconv.Atoi(endPart[:endDot])

	return startLine, endLine
}

func readSourceFile(file string) []string {
	data, err := os.ReadFile(file)
	if err != nil {
		return nil
	}
	return strings.Split(string(data), "\n")
}

// isIgnored reports whether the statement block starting at startLine
// (1-indexed, as reported by `go test -coverprofile`) is exempted by a
// "// coverage:ignore ..." comment, in either of the two shapes used in
// this codebase:
//
//  1. Comment directly above a bare statement:
//
//     // coverage:ignore unreachable — reason
//     return false, nil
//
//  2. Comment as the first line inside a just-opened block:
//
//     if err != nil {
//     // coverage:ignore unreachable — reason
//     return false, err
//     }
//
// Shape (2) is distinguished by the source line at startLine ending in "{"
// (i.e. this profile block is the body of a freshly opened block); shape
// (1) is everything else, checked by scanning backwards through any
// multi-line "//" comment block immediately above startLine.
func isIgnored(lines []string, startLine int) bool {
	if lines == nil || startLine < 1 || startLine > len(lines) {
		return false
	}

	current := strings.TrimSpace(lines[startLine-1])
	if strings.HasSuffix(current, "{") {
		if startLine >= len(lines) {
			return false
		}
		next := strings.TrimSpace(lines[startLine])
		return strings.HasPrefix(next, "// coverage:ignore")
	}

	for i := startLine - 2; i >= 0; i-- {
		line := strings.TrimSpace(lines[i])
		if strings.HasPrefix(line, "// coverage:ignore") {
			return true
		}
		if !strings.HasPrefix(line, "//") {
			return false
		}
	}
	return false
}
