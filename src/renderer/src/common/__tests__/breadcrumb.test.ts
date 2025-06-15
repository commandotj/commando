import { calculateVisibleBreadcrumbSegments } from '../breadcrumb';

describe('calculateVisibleBreadcrumbSegments', () => {
    it('全部可见（宽度充足）', () => {
        const segments = ['a', 'b', 'c'];
        const widths = [30, 30, 30];
        const res = calculateVisibleBreadcrumbSegments(segments, widths, 200);
        expect(res.visible).toEqual([0, 1, 2]);
        expect(res.folded).toEqual([]);
    });

    it('只显示首末，其他折叠', () => {
        const segments = ['a', 'b', 'c', 'd', 'e'];
        const widths = [40, 40, 40, 40, 40];
        // 容器只能放下首末+...，其余都折叠
        const res = calculateVisibleBreadcrumbSegments(segments, widths, 120);
        expect(res.visible).toEqual([0, 4]);
        expect(res.folded).toEqual([1, 2, 3]);
    });

    it('部分中间层级可见', () => {
        const segments = ['a', 'b', 'c', 'd', 'e'];
        const widths = [30, 30, 30, 30, 30];
        // 容器能放下首末+一个中间
        const res = calculateVisibleBreadcrumbSegments(segments, widths, 120);
        // 先插入1，再插入2（如果能放下），否则只插入1
        expect(res.visible).toEqual([0, 1, 4]);
        expect(res.folded).toEqual([2, 3]);
    });

    it('极端：只有一个层级', () => {
        const segments = ['root'];
        const widths = [50];
        const res = calculateVisibleBreadcrumbSegments(segments, widths, 40);
        expect(res.visible).toEqual([0]);
        expect(res.folded).toEqual([]);
    });

    it('宽度数组与层级数不符，全部可见', () => {
        const segments = ['a', 'b', 'c'];
        const widths = [30, 30];
        const res = calculateVisibleBreadcrumbSegments(segments, widths, 100);
        expect(res.visible).toEqual([0, 1, 2]);
        expect(res.folded).toEqual([]);
    });

    it('全部折叠，只有首末', () => {
        const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
        const widths = [20, 20, 20, 20, 20, 20, 20];
        // 容器只能放下首末+...，其余都折叠
        const res = calculateVisibleBreadcrumbSegments(segments, widths, 70);
        expect(res.visible).toEqual([0, 6]);
        expect(res.folded).toEqual([1, 2, 3, 4, 5]);
    });
});
