// 计算可见和折叠的 breadcrumb 层级索引
// segments: 路径分段数组
// segmentWidths: 每个分段的实际宽度（px）
// containerWidth: 容器可用宽度（px）
// minVisible: 最少可见层级数（如首、末）
export interface BreadcrumbFoldResult {
    visible: number[]; // 可见层级索引
    folded: number[]; // 折叠层级索引
}

export function calculateVisibleBreadcrumbSegments(
    segments: string[],
    segmentWidths: number[],
    containerWidth: number,
    minVisible: number = 2 // 至少首、末可见
): BreadcrumbFoldResult {
    if (segments.length <= minVisible || segmentWidths.length !== segments.length) {
        return { visible: segments.map((_, i) => i), folded: [] };
    }
    // 先保证首、末可见
    const visible = [0, segments.length - 1];
    let usedWidth = segmentWidths[0] + segmentWidths[segments.length - 1];
    // 预留"..."宽度（假设20px）
    const ellipsisWidth = 20;
    usedWidth += ellipsisWidth;
    // 依次尝试插入中间层级
    for (let i = 1; i < segments.length - 1; i++) {
        if (usedWidth + segmentWidths[i] <= containerWidth) {
            visible.splice(visible.length - 1, 0, i); // 插入到末层前
            usedWidth += segmentWidths[i];
        } else {
            break;
        }
    }
    // 折叠剩余未显示的中间层级
    const folded: number[] = [];
    for (let i = 1; i < segments.length - 1; i++) {
        if (!visible.includes(i)) folded.push(i);
    }
    return { visible, folded };
}
