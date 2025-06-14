import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PathBreadcrumb from "../PathBreadcrumb";

describe("PathBreadcrumb", () => {
    it("renders each part of the path as a breadcrumb", () => {
        render(<PathBreadcrumb path="/Users/albert.li/Desktop" />);
        expect(screen.getByText("Users")).toBeInTheDocument();
        expect(screen.getByText("albert.li")).toBeInTheDocument();
        expect(screen.getByText("Desktop")).toBeInTheDocument();
    });

    it("calls onClick with correct index and part when a breadcrumb is clicked", () => {
        const handleClick = jest.fn();
        render(
            <PathBreadcrumb
                path="/Users/albert.li/Desktop"
                onClick={handleClick}
            />
        );
        fireEvent.click(screen.getByText("albert.li"));
        expect(handleClick).toHaveBeenCalledWith(1, "albert.li");
        fireEvent.click(screen.getByText("Desktop"));
        expect(handleClick).toHaveBeenCalledWith(2, "Desktop");
    });

    it("shows ellipsis and dropdown when path is long", () => {
        const longPath = "/a/b/c/d/e/f/g";
        render(<PathBreadcrumb path={longPath} maxVisibleItems={5} />);
        // 首层、...、倒数第二、末层
        expect(screen.getByText("a")).toBeInTheDocument();
        expect(screen.getByText("f")).toBeInTheDocument();
        expect(screen.getByText("g")).toBeInTheDocument();
        expect(screen.getByText("..."));
    });

    it("dropdown shows hidden segments and triggers onClick", () => {
        const longPath = "/a/b/c/d/e/f/g";
        const handleClick = jest.fn();
        render(
            <PathBreadcrumb
                path={longPath}
                maxVisibleItems={5}
                onClick={handleClick}
            />
        );
        // 打开下拉菜单
        fireEvent.click(screen.getByText("..."));
        // 被折叠的部分 b/c/d/e
        expect(screen.getByText("b")).toBeInTheDocument();
        expect(screen.getByText("c")).toBeInTheDocument();
        expect(screen.getByText("d")).toBeInTheDocument();
        expect(screen.getByText("e")).toBeInTheDocument();
        // 点击折叠项
        fireEvent.click(screen.getByText("c"));
        expect(handleClick).toHaveBeenCalledWith(2, "c");
    });

    it("shows tooltip for each segment and for ellipsis", () => {
        const longPath = "/a/b/c/d/e/f/g";
        render(<PathBreadcrumb path={longPath} maxVisibleItems={5} />);
        // 检查 title 属性
        expect(screen.getByText("a").getAttribute("title")).toBe("a");
        expect(screen.getByText("f").getAttribute("title")).toBe("f");
        expect(screen.getByText("g").getAttribute("title")).toBe("g");
        expect(screen.getByText("...").getAttribute("title")).toBe("b/c/d/e");
    });

    it("breadcrumb nav has full path as title", () => {
        const path = "/a/b/c";
        render(<PathBreadcrumb path={path} />);
        expect(screen.getByLabelText("Breadcrumb").getAttribute("title")).toBe(
            "a/b/c"
        );
    });
});
