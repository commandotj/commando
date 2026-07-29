package filter

import "testing"

func TestFilter_IncludeStar(t *testing.T) {
	m := NewMatcher(FilterRules{Include: []string{"**"}})

	if !m.Match("any/x.txt", false) {
		t.Error("expected any/x.txt to match include **")
	}
}

func TestFilter_ExcludeSubfolder(t *testing.T) {
	m := NewMatcher(FilterRules{Include: []string{"**"}, Exclude: []string{"temp/**"}})

	if m.Match("temp/x", false) {
		t.Error("expected temp/x to be excluded by temp/**")
	}
}

func TestFilter_ExcludeSubfolderKeepsChildren(t *testing.T) {
	m := NewMatcher(FilterRules{Include: []string{"**"}, Exclude: []string{"temp/**"}})

	if m.Match("temp/sub/x", false) {
		t.Error("expected temp/sub/x (nested) to be excluded by temp/** recursively")
	}
}

func TestFilter_IncludeSubfolderOnly(t *testing.T) {
	m := NewMatcher(FilterRules{Include: []string{"data/**"}})

	if !m.Match("data/x", false) {
		t.Error("expected data/x to match include data/**")
	}
	if m.Match("other/x", false) {
		t.Error("expected other/x to not match include data/**")
	}
}

func TestFilter_DefaultExcludesRecycleBin(t *testing.T) {
	m := NewMatcher(DefaultRules())

	if m.Match("$Recycle.Bin/x", false) {
		t.Error("expected $Recycle.Bin/x to be excluded by default rules")
	}
}

func TestFilter_ExcludeOverridesInclude(t *testing.T) {
	// FLT-08: a path matched by both Include and Exclude must be excluded.
	m := NewMatcher(FilterRules{Include: []string{"**"}, Exclude: []string{"**/*.tmp"}})

	if m.Match("data/x.tmp", false) {
		t.Error("expected data/x.tmp to be excluded even though ** also includes it")
	}
	if !m.Match("data/x.txt", false) {
		t.Error("expected data/x.txt to still be included")
	}
}
