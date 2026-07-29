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
// side.
func Categorize(left, right *Entry, mode CompareMode, settings CompareSettings) (Category, string) {
	if right == nil {
		return LeftOnly, "left-only"
	}
	if left == nil {
		return RightOnly, "right-only"
	}
	if left.IsDir != right.IsDir {
		return TypeMismatch, "type-mismatch"
	}

	eq, _ := IsEqual(*left, *right, mode, settings)
	if eq {
		return Equal, "equal"
	}

	switch mode {
	case Content:
		return DifferentContent, "different-content"
	case SizeOnly:
		return DifferentSize, "different-size"
	}

	if left.Size != right.Size {
		return Conflict, "conflict"
	}

	if left.ModTimeUnix > right.ModTimeUnix {
		return LeftNewer, "left-newer"
	}
	return RightNewer, "right-newer"
}
