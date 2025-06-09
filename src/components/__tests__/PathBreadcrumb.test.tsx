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
});
