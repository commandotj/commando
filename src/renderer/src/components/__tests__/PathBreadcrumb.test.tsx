import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import PathBreadcrumb from "../PathBreadcrumb";

describe("PathBreadcrumb", () => {
    it("渲染路径分段", () => {
        const longPath = "/Volumes/One/Users/albert/Documents/Projects";
        render(<PathBreadcrumb path={longPath} />);
        // 检查每个分段是否渲染
        expect(screen.getByText("/"));
        expect(screen.getByText("Volumes"));
        expect(screen.getByText("One"));
        expect(screen.getByText("Users"));
        expect(screen.getByText("albert"));
        expect(screen.getByText("Documents"));
        expect(screen.getByText("Projects"));
    });

    it("点击分段触发回调", () => {
        const longPath = "/Volumes/One/Users/albert/Documents/Projects";
        const handleClick = jest.fn();
        render(<PathBreadcrumb path={longPath} onClick={handleClick} />);
        fireEvent.click(screen.getByText("Users"));
        // 断言回调被调用，参数为分段索引和文本
        expect(handleClick).toHaveBeenCalledWith(3, "Users");
    });
});
