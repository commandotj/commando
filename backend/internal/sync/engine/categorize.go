package engine

// Category classifies a relative path's state across both sync sides.
type Category int

const (
	LeftOnly Category = iota
	RightOnly
	Equal
	LeftNewer
	RightNewer
	Conflict
	TypeMismatch
	DifferentContent
	DifferentSize
)

// Categorize classifies a relative path given its (possibly nil) entry on
// each side. left and right are nil when the path does not exist on that
// side. Returns an error when the comparison itself fails (e.g. I/O error
// during Content mode) — callers MUST check the error before using Category.
func Categorize(left, right *Entry, mode CompareMode, settings CompareSettings) (Category, string, error) {
	if right == nil {
		return LeftOnly, "left-only", nil
	}
	if left == nil {
		return RightOnly, "right-only", nil
	}
	if left.IsDir != right.IsDir {
		return TypeMismatch, "type-mismatch", nil
	}

	eq, err := IsEqual(*left, *right, mode, settings)
	if err != nil {
		return Equal, "", err // fail-closed: comparison error means no valid Category
	}
	if eq {
		return Equal, "equal", nil
	}

	switch mode {
	case Content:
		return DifferentContent, "different-content", nil
	case SizeOnly:
		return DifferentSize, "different-size", nil
	}

	if left.Size != right.Size {
		return Conflict, "conflict", nil
	}

	if left.ModTimeUnix > right.ModTimeUnix {
		return LeftNewer, "left-newer", nil
	}
	return RightNewer, "right-newer", nil
}
