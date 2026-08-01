import React from "react";
import { render, screen } from "@testing-library/react";
import CompareProgressModal from "../CompareProgressModal";

jest.mock("../../../hooks/useI18n", () => ({
    useI18n: () => ({
        t: (key: string, vars?: Record<string, unknown>) => {
            if (key === "sync.plan.ofItems" && vars) {
                return `${vars.done} of ${vars.total} items`;
            }
            if (key === "sync.plan.filesScanned") {
                return "files scanned";
            }
            if (key === "sync.plan.stepIndex") {
                return "Index";
            }
            if (key === "sync.plan.stepAnalyze") {
                return "Compare";
            }
            return key;
        },
    }),
}));

describe("CompareProgressModal", () => {
    it("shows ring percent and step labels during analyze", () => {
        render(
            <CompareProgressModal
                open
                progressFile="folder/file.heic"
                progressAction="copy"
                progressDone={309}
                progressTotal={3065}
                onCancel={jest.fn()}
            />
        );
        expect(screen.getByText("10%")).toBeInTheDocument();
        expect(screen.getByText("309 of 3,065 items")).toBeInTheDocument();
        expect(screen.getByText("file.heic")).toBeInTheDocument();
        expect(screen.getByText("Compare")).toBeInTheDocument();
    });

    it("shows scanned count during indexing", () => {
        render(
            <CompareProgressModal
                open
                progressFile="left/photos/a.jpg"
                progressAction="index"
                progressDone={1204}
                progressTotal={0}
                onCancel={jest.fn()}
            />
        );
        expect(screen.getByText("1,204")).toBeInTheDocument();
        expect(screen.getByText("files scanned")).toBeInTheDocument();
        expect(screen.getByText("Index")).toBeInTheDocument();
    });
});
