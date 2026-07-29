package engine

import (
	"bytes"
	"io"
	"os"
)

// IsEqual reports whether a and b are considered the same file under mode.
func IsEqual(a, b Entry, mode CompareMode, settings CompareSettings) (bool, error) {
	switch mode {
	case TimeAndSize:
		if a.Size != b.Size {
			return false, nil
		}
		diff := a.ModTimeUnix - b.ModTimeUnix
		if diff < 0 {
			diff = -diff
		}
		return diff <= settings.ToleranceSec, nil
	case SizeOnly:
		return a.Size == b.Size, nil
	case Content:
		return contentEqual(a.AbsolutePath, b.AbsolutePath)
	}
	// coverage:ignore unreachable — CompareMode only has the three values
	// handled above; this default only exists to satisfy Go's requirement
	// that all paths return a value.
	return false, nil
}

func contentEqual(pathA, pathB string) (bool, error) {
	fa, err := os.Open(pathA)
	if err != nil {
		return false, err
	}
	defer fa.Close()

	fb, err := os.Open(pathB)
	if err != nil {
		return false, err
	}
	defer fb.Close()

	const chunkSize = 64 * 1024
	bufA := make([]byte, chunkSize)
	bufB := make([]byte, chunkSize)
	for {
		na, errA := fa.Read(bufA)
		nb, errB := fb.Read(bufB)
		if na != nb || !bytes.Equal(bufA[:na], bufB[:nb]) {
			return false, nil
		}
		if errA == io.EOF && errB == io.EOF {
			return true, nil
		}
		if errA != nil && errA != io.EOF {
			// coverage:ignore unreachable in practice — os.File.Read only
			// returns non-EOF errors on genuine I/O failure (disk error,
			// revoked permissions mid-read), not reproducible without
			// simulating hardware/OS failure.
			return false, errA
		}
		if errB != nil && errB != io.EOF {
			// coverage:ignore unreachable in practice — same as errA above.
			return false, errB
		}
	}
}
