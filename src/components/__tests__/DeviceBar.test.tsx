// 注意：Radix DropdownMenu portal 相关交互（如菜单项点击）在 JSDOM 环境下无法可靠测试，建议用 e2e/集成测试覆盖。
import "@testing-library/jest-dom";
import React from "react";
import {
    render,
    fireEvent,
    screen,
    act,
    waitFor,
} from "@testing-library/react";
import DeviceBar, { DeviceInfo } from "../DeviceBar";

const devices: DeviceInfo[] = [
    {
        device: "disk1",
        description: "Macintosh HD",
        size: 1000000000,
        mountpoints: [{ path: "/" }],
        isSystem: true,
        isRemovable: false,
    },
    {
        device: "disk2",
        description: "External 1",
        size: 500000000,
        mountpoints: [{ path: "/Volumes/One" }],
        isSystem: false,
        isRemovable: true,
    },
    {
        device: "disk3",
        description: "External 2",
        size: 500000000,
        mountpoints: [{ path: "/Volumes/Two" }],
        isSystem: false,
        isRemovable: true,
    },
    {
        device: "disk4",
        description: "External 3",
        size: 500000000,
        mountpoints: [{ path: "/Volumes/Three" }],
        isSystem: false,
        isRemovable: true,
    },
];

describe("DeviceBar", () => {
    beforeEach(() => {
        // 模拟 containerRef.current.offsetWidth
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
            configurable: true,
            get() {
                // 默认宽度足够显示 3 个按钮
                return 300;
            },
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("renders all device buttons and overflow menu", () => {
        render(
            <DeviceBar
                devices={devices}
                onDeviceClick={jest.fn()}
                currentPath="/"
            />
        );
        // 主行按钮（最多 3 个）
        const mainBtns = screen.getAllByRole("button");
        expect(mainBtns.length).toBeGreaterThanOrEqual(3);
        // 溢出菜单按钮存在
        expect(screen.getByText("…")).toBeInTheDocument();
    });

    it("updates overflow menu on window resize", () => {
        render(
            <DeviceBar
                devices={devices}
                onDeviceClick={jest.fn()}
                currentPath="/"
            />
        );
        // 初始主行按钮数量
        const initialBtns = screen.getAllByRole("button");
        expect(initialBtns.length).toBeGreaterThanOrEqual(3);
        // 缩小宽度，模拟只显示 1 个按钮
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
            configurable: true,
            get() {
                return 80; // 只够 1 个按钮
            },
        });
        act(() => {
            window.dispatchEvent(new Event("resize"));
        });
        // 主行按钮应减少到 1
        const afterBtns = screen.getAllByRole("button");
        expect(afterBtns.length).toBe(2); // 1 主按钮 + 1 溢出按钮
    });

    // portal 菜单项交互建议用 e2e/集成测试覆盖
});
