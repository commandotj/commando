package engine

import (
	"bytes"
	"context"
	"io"
	"os"
	"sync"

	"golang.org/x/sync/errgroup"
)

var bufPool = sync.Pool{
	New: func() any {
		b := make([]byte, 64*1024)
		return &b
	},
}

type ComparePair struct {
	A, B Entry
}

func ParallelCompare(ctx context.Context, pairs []ComparePair, mode CompareMode, settings CompareSettings) []bool {
	if len(pairs) == 0 {
		return nil
	}
	parallelism := settings.Parallelism
	if parallelism <= 0 {
		parallelism = 1
	}

	g, _ := errgroup.WithContext(ctx)
	g.SetLimit(parallelism)

	results := make([]bool, len(pairs))
	for i, p := range pairs {
		i, p := i, p
		g.Go(func() error {
			switch mode {
			case Content:
				results[i] = contentEqualBuf(p.A.AbsolutePath, p.B.AbsolutePath)
			case TimeAndSize:
				if p.A.Size != p.B.Size {
					return nil
				}
				diff := p.A.ModTimeUnix - p.B.ModTimeUnix
				if diff < 0 {
					diff = -diff
				}
				results[i] = diff <= settings.ToleranceSec
			case SizeOnly:
				results[i] = p.A.Size == p.B.Size
			}
			return nil
		})
	}
	_ = g.Wait()
	return results
}

func contentEqualBuf(pathA, pathB string) bool {
	fa, err := os.Open(pathA)
	if err != nil {
		return false
	}
	defer fa.Close()

	fb, err := os.Open(pathB)
	if err != nil {
		return false
	}
	defer fb.Close()

	bufA := *(bufPool.Get().(*[]byte))
	bufB := *(bufPool.Get().(*[]byte))
	defer bufPool.Put(&bufA)
	defer bufPool.Put(&bufB)

	for {
		na, errA := fa.Read(bufA)
		nb, errB := fb.Read(bufB)
		// coverage:ignore Read error requires disk/NFS failure — untestable
		if errA != nil && errA != io.EOF {
			// coverage:ignore Read error requires disk/NFS failure — untestable
			return false
		}
		// coverage:ignore same empirical basis as errA above
		if errB != nil && errB != io.EOF {
			// coverage:ignore same empirical basis as errA above
			return false
		}
		if na != nb || !bytes.Equal(bufA[:na], bufB[:nb]) {
			return false
		}
		if errA == io.EOF && errB == io.EOF {
			return true
		}
	}
}
