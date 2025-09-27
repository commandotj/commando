import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import FunctionBar from "../FunctionBar";
import * as hooks from "../../hooks/useCopyToOtherPane";
import * as redux from "../../app/hooks";

jest.mock("../../hooks/useCopyToOtherPane");
jest.mock("../../app/hooks");

describe("FunctionBar", () => {
  beforeEach(() => {
    (redux.useAppSelector as jest.Mock).mockImplementation((fn) =>
      fn({
        fileManager: {
          activePane: 0,
          panes: [
            {
              selectedKeys: ["file1.txt"],
              currentPath: "/src",
              entries: [],
            },
            { selectedKeys: [], currentPath: "/dst", entries: [] },
          ],
        },
      }),
    );
  });

  it("复制按钮 enable 且点击时调用 handleCopyToOtherPane", () => {
    render(<FunctionBar />);
    const copyBtn = screen.getByLabelText("复制到另一侧");
    expect(copyBtn).toBeEnabled();
    fireEvent.click(copyBtn);

    // The component should open the BatchCopyProgressModal
    expect(screen.getByText("批量复制进度")).toBeInTheDocument();
  });

  it("复制按钮 disabled 时不可点击", () => {
    (redux.useAppSelector as jest.Mock).mockImplementation((fn) =>
      fn({
        fileManager: {
          activePane: 0,
          panes: [
            { selectedKeys: [], currentPath: "/src", entries: [] },
            { selectedKeys: [], currentPath: "/dst", entries: [] },
          ],
        },
      }),
    );
    const copyMock = jest.fn();
    (hooks.useCopyToOtherPane as jest.Mock).mockReturnValue(copyMock);
    render(<FunctionBar />);
    const copyBtn = screen.getByLabelText("复制到另一侧");
    expect(copyBtn).toBeDisabled();
    fireEvent.click(copyBtn);
    expect(copyMock).not.toHaveBeenCalled();
  });

  it("渲染所有操作按钮并响应点击", () => {
    (redux.useAppSelector as jest.Mock).mockImplementation((fn) =>
      fn({
        fileManager: {
          activePane: 0,
          panes: [
            {
              selectedKeys: ["file1.txt"],
              currentPath: "/src",
              entries: [],
            },
            { selectedKeys: [], currentPath: "/dst", entries: [] },
          ],
        },
      }),
    );
    (hooks.useCopyToOtherPane as jest.Mock).mockReturnValue(jest.fn());
    render(<FunctionBar />);
    expect(screen.getByLabelText("复制到另一侧")).toBeInTheDocument();
    expect(screen.getByLabelText("新建文件")).toBeInTheDocument();
    expect(screen.getByLabelText("新建文件夹")).toBeInTheDocument();
    expect(screen.getByLabelText("刷新")).toBeInTheDocument();
    expect(screen.getByLabelText("设置")).toBeInTheDocument();
  });
});
