import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PathBreadcrumb from "../PathBreadcrumb";

describe("PathBreadcrumb", () => {
    it("渲染路径分段", () => {
        const longPath = "/Volumes/One/Users/albert/Documents/Projects";
        render(<PathBreadcrumb path={longPath} />);
        // 检查每个分段是否渲染（可能有多个同名元素）
        expect(screen.getAllByText("Volumes").length).toBeGreaterThan(0);
        expect(screen.getAllByText("One").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
        expect(screen.getAllByText("albert").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Documents").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Projects").length).toBeGreaterThan(0);
    });
    // 点击分段测试如需兼容结构变化建议用 e2e
});
