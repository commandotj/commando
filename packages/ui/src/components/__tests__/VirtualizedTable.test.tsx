import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import type { ColumnDef } from "@tanstack/react-table";
import { VirtualizedTable } from "../VirtualizedTable";

jest.mock("@tanstack/react-virtual", () => ({
    useVirtualizer: ({ count }: { count: number }) => ({
        getVirtualItems: () =>
            Array.from({ length: count }, (_, index) => ({
                index,
                start: index * 32,
                end: (index + 1) * 32,
                size: 32,
                key: index,
            })),
        getTotalSize: () => count * 32,
    }),
}));

type Row = { key: string; name: string; size: number };

const columns: ColumnDef<Row, unknown>[] = [
    {
        accessorKey: "name",
        header: "Name",
        meta: { width: "70%" },
    },
    {
        accessorKey: "size",
        header: "Size",
        meta: { width: "30%", align: "right" },
    },
];

const data: Row[] = [
    { key: "1", name: "file1.txt", size: 123 },
    { key: "2", name: "file2.txt", size: 456 },
];

function renderTable(
    overrides: Partial<Parameters<typeof VirtualizedTable<Row>>[0]> = {}
) {
    return render(
        <Theme>
            <div style={{ height: 240 }}>
                <VirtualizedTable
                    columns={columns}
                    dataSource={data}
                    showSelection={false}
                    {...overrides}
                />
            </div>
        </Theme>
    );
}

describe("VirtualizedTable", () => {
    it("renders headers and visible rows", () => {
        renderTable();

        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Size")).toBeInTheDocument();
        expect(screen.getByText("file1.txt")).toBeInTheDocument();
        expect(screen.getByText("file2.txt")).toBeInTheDocument();
    });

    it("supports row selection when enabled", () => {
        const onRowSelectionChange = jest.fn();
        renderTable({ showSelection: true, onRowSelectionChange });

        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes.length).toBeGreaterThan(0);
    });
});
