package filter

import "testing"

func TestValidate_ValidPatterns(t *testing.T) {
	rules := FilterRules{
		Include: []string{"**", "*.go"},
		Exclude: []string{"vendor/**", "*.test"},
	}
	if err := rules.Validate(); err != nil {
		t.Fatalf("expected valid patterns, got: %v", err)
	}
}

func TestValidate_InvalidInclude(t *testing.T) {
	rules := FilterRules{
		Include: []string{"[bad"},
	}
	err := rules.Validate()
	if err == nil {
		t.Fatal("expected error for invalid include pattern")
	}
}

func TestValidate_InvalidExclude(t *testing.T) {
	rules := FilterRules{
		Include: []string{"**"},
		Exclude: []string{"[bad"},
	}
	err := rules.Validate()
	if err == nil {
		t.Fatal("expected error for invalid exclude pattern")
	}
}

func TestValidate_DefaultRulesValid(t *testing.T) {
	if err := DefaultRules().Validate(); err != nil {
		t.Fatalf("DefaultRules should always be valid, got: %v", err)
	}
}
