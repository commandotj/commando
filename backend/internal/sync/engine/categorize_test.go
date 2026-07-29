package engine

import "testing"

const (
	t0 int64 = 1700000000
	t1 int64 = 1700000100
	t2 int64 = 1700000200
	t3 int64 = 1700000300
)

func assertCategorize(t *testing.T, left, right *Entry, mode CompareMode, settings CompareSettings, expected Category) {
	t.Helper()
	cat, _, err := Categorize(left, right, mode, settings)
	if err != nil {
		t.Fatalf("Categorize returned error: %v", err)
	}
	if cat != expected {
		t.Errorf("expected %v, got %v", expected, cat)
	}
}

func TestCategorize_LeftOnly(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	assertCategorize(t, left, nil, TimeAndSize, CompareSettings{}, LeftOnly)
}

func TestCategorize_RightOnly(t *testing.T) {
	right := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	assertCategorize(t, nil, right, TimeAndSize, CompareSettings{}, RightOnly)
}

func TestCategorize_Equal(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	assertCategorize(t, left, right, TimeAndSize, CompareSettings{}, Equal)
}

func TestCategorize_LeftNewer(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t2}
	right := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	assertCategorize(t, left, right, TimeAndSize, CompareSettings{}, LeftNewer)
}

func TestCategorize_RightNewer(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t2}
	assertCategorize(t, left, right, TimeAndSize, CompareSettings{}, RightNewer)
}

func TestCategorize_Conflict(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", Size: 20, ModTimeUnix: t1}
	assertCategorize(t, left, right, TimeAndSize, CompareSettings{}, Conflict)
}

func TestCategorize_TypeMismatch(t *testing.T) {
	left := &Entry{RelativePath: "d", IsDir: true, ModTimeUnix: t1}
	right := &Entry{RelativePath: "d", IsDir: false, Size: 5, ModTimeUnix: t1}
	assertCategorize(t, left, right, TimeAndSize, CompareSettings{}, TypeMismatch)
}

func TestCategorize_ContentEqual(t *testing.T) {
	dir := t.TempDir()
	leftPath := writeTempFile(t, dir, "left.txt", "same-bytes")
	rightPath := writeTempFile(t, dir, "right.txt", "same-bytes")
	left := &Entry{RelativePath: "x.txt", AbsolutePath: leftPath, Size: 10, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", AbsolutePath: rightPath, Size: 10, ModTimeUnix: t2}
	assertCategorize(t, left, right, Content, CompareSettings{}, Equal)
}

func TestCategorize_ContentDifferent(t *testing.T) {
	dir := t.TempDir()
	leftPath := writeTempFile(t, dir, "left.txt", "a")
	rightPath := writeTempFile(t, dir, "right.txt", "b")
	left := &Entry{RelativePath: "x.txt", AbsolutePath: leftPath, Size: 1, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", AbsolutePath: rightPath, Size: 1, ModTimeUnix: t1}
	assertCategorize(t, left, right, Content, CompareSettings{}, DifferentContent)
}

func TestCategorize_SizeOnlyEqual(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t3}
	assertCategorize(t, left, right, SizeOnly, CompareSettings{}, Equal)
}

func TestCategorize_SizeOnlyDifferent(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", Size: 11, ModTimeUnix: t1}
	assertCategorize(t, left, right, SizeOnly, CompareSettings{}, DifferentSize)
}

func TestCategorize_Tolerance2s(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1 + 1}
	assertCategorize(t, left, right, TimeAndSize, CompareSettings{ToleranceSec: 2}, Equal)
}

func TestCategorize_ToleranceExceed(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1}
	right := &Entry{RelativePath: "x.txt", Size: 10, ModTimeUnix: t1 + 3}
	cat, _, err := Categorize(left, right, TimeAndSize, CompareSettings{ToleranceSec: 2})
	if err != nil {
		t.Fatalf("Categorize returned error: %v", err)
	}
	if cat != LeftNewer && cat != RightNewer {
		t.Errorf("expected LeftNewer or RightNewer beyond tolerance, got %v", cat)
	}
}

func TestIsEqual_Content_LeftFileMissing_ReturnsError(t *testing.T) {
	dir := t.TempDir()
	rightPath := writeTempFile(t, dir, "right.txt", "hello")
	a := Entry{AbsolutePath: dir + "/does-not-exist.txt"}
	b := Entry{AbsolutePath: rightPath}

	_, err := IsEqual(a, b, Content, CompareSettings{})
	if err == nil {
		t.Fatal("expected error when left file does not exist")
	}
}

func TestIsEqual_Content_RightFileMissing_ReturnsError(t *testing.T) {
	dir := t.TempDir()
	leftPath := writeTempFile(t, dir, "left.txt", "hello")
	a := Entry{AbsolutePath: leftPath}
	b := Entry{AbsolutePath: dir + "/does-not-exist.txt"}

	_, err := IsEqual(a, b, Content, CompareSettings{})
	if err == nil {
		t.Fatal("expected error when right file does not exist")
	}
}

func TestIsEqual_UnknownMode_ReturnsFalse(t *testing.T) {
	// CompareMode is a plain int, not a closed enum — Go has no exhaustiveness
	// checking, so callers really can pass an out-of-range value. Verified
	// this compiles and runs (CompareMode(99) is not a hypothetical).
	a := Entry{Size: 1}
	b := Entry{Size: 1}

	eq, err := IsEqual(a, b, CompareMode(99), CompareSettings{})
	if err != nil {
		t.Fatalf("expected no error for unknown mode, got %v", err)
	}
	if eq {
		t.Error("expected false for unrecognized CompareMode")
	}
}

func TestCategorize_Error(t *testing.T) {
	left := &Entry{RelativePath: "x.txt", AbsolutePath: "non-existent-left"}
	right := &Entry{RelativePath: "x.txt", AbsolutePath: "non-existent-right"}
	_, _, err := Categorize(left, right, Content, CompareSettings{})
	if err == nil {
		t.Fatal("expected error from Categorize when IsEqual fails")
	}
}

func TestIsEqual_Content_ReadDirectoryError_ReturnsError(t *testing.T) {
	dir := t.TempDir()
	a := Entry{AbsolutePath: dir}
	dummy := writeTempFile(t, dir, "dummy.txt", "hello")
	b := Entry{AbsolutePath: dummy}

	_, err := IsEqual(a, b, Content, CompareSettings{})
	if err == nil {
		t.Fatal("expected error reading from directory")
	}

	_, err = IsEqual(b, a, Content, CompareSettings{})
	if err == nil {
		t.Fatal("expected error reading from directory")
	}
}
