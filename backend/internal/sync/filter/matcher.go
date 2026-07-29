package filter

import "github.com/bmatcuk/doublestar/v4"

// Matcher decides whether a relative path should be included in a sync
// operation, per FilterRules.
type Matcher interface {
	Match(relPath string, isDir bool) bool
}

type matcher struct {
	rules FilterRules
}

// NewMatcher builds a Matcher from rules: a path matches if it satisfies at
// least one include pattern and no exclude pattern. Patterns use doublestar
// glob syntax (*, ?, **) — see RFC-012 §4.5 for why this replaces FFS's
// backslash-suffixed directory-propagation syntax.
func NewMatcher(rules FilterRules) Matcher {
	return &matcher{rules: rules}
}

func (m *matcher) Match(relPath string, isDir bool) bool {
	included := false
	for _, pattern := range m.rules.Include {
		if matches(pattern, relPath) {
			included = true
			break
		}
	}
	if !included {
		return false
	}

	for _, pattern := range m.rules.Exclude {
		if matches(pattern, relPath) {
			return false
		}
	}
	return true
}

func matches(pattern, relPath string) bool {
	ok, _ := doublestar.Match(pattern, relPath)
	return ok
}
