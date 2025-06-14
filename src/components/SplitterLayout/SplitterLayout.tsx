import React, { ReactNode } from "react";
import Pane from "./Pane";

function clearSelection() {
    if (document.body.createTextRange) {
        const range = document.body.createTextRange();
        range.collapse();
        range.select();
    } else if (window.getSelection) {
        if ((window.getSelection() as any).empty) {
            (window.getSelection() as any).empty();
        } else if (window.getSelection().removeAllRanges) {
            window.getSelection().removeAllRanges();
        }
    } else if ((document as any).selection) {
        (document as any).selection.empty();
    }
}

const DEFAULT_SPLITTER_SIZE = 4;

export interface SplitterLayoutProps {
    customClassName?: string;
    vertical?: boolean;
    percentage?: boolean;
    primaryIndex?: number;
    primaryMinSize?: number;
    secondaryInitialSize?: number;
    secondaryMinSize?: number;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onSecondaryPaneSizeChange?: (size: number) => void;
    children?: ReactNode[];
}

interface SplitterLayoutState {
    secondaryPaneSize: number;
    resizing: boolean;
}

class SplitterLayout extends React.Component<
    SplitterLayoutProps,
    SplitterLayoutState
> {
    container: HTMLDivElement | null = null;
    splitter: HTMLDivElement | null = null;

    static defaultProps = {
        customClassName: "",
        vertical: false,
        percentage: false,
        primaryIndex: 0,
        primaryMinSize: 0,
        secondaryInitialSize: undefined,
        secondaryMinSize: 0,
        onDragStart: undefined,
        onDragEnd: undefined,
        onSecondaryPaneSizeChange: undefined,
        children: [],
    };

    constructor(props: SplitterLayoutProps) {
        super(props);
        this.handleResize = this.handleResize.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleSplitterMouseDown = this.handleSplitterMouseDown.bind(this);
        this.state = {
            secondaryPaneSize: 0,
            resizing: false,
        };
    }

    componentDidMount() {
        window.addEventListener("resize", this.handleResize);
        document.addEventListener("mouseup", this.handleMouseUp);
        document.addEventListener("mousemove", this.handleMouseMove);
        document.addEventListener("touchend", this.handleMouseUp);
        document.addEventListener("touchmove", this.handleTouchMove);

        let secondaryPaneSize;
        if (typeof this.props.secondaryInitialSize !== "undefined") {
            secondaryPaneSize = this.props.secondaryInitialSize;
        } else if (this.container) {
            const containerRect = this.container.getBoundingClientRect();
            let splitterRect;
            if (this.splitter) {
                splitterRect = this.splitter.getBoundingClientRect();
            } else {
                splitterRect = {
                    width: DEFAULT_SPLITTER_SIZE,
                    height: DEFAULT_SPLITTER_SIZE,
                };
            }
            secondaryPaneSize = this.getSecondaryPaneSize(
                containerRect,
                splitterRect,
                {
                    left:
                        containerRect.left +
                        (containerRect.width - splitterRect.width) / 2,
                    top:
                        containerRect.top +
                        (containerRect.height - splitterRect.height) / 2,
                },
                false
            );
        } else {
            secondaryPaneSize = 0;
        }
        this.setState({ secondaryPaneSize });
    }

    componentDidUpdate(
        prevProps: SplitterLayoutProps,
        prevState: SplitterLayoutState
    ) {
        if (
            prevState.secondaryPaneSize !== this.state.secondaryPaneSize &&
            this.props.onSecondaryPaneSizeChange
        ) {
            this.props.onSecondaryPaneSizeChange(this.state.secondaryPaneSize);
        }
        if (prevState.resizing !== this.state.resizing) {
            if (this.state.resizing) {
                if (this.props.onDragStart) {
                    this.props.onDragStart();
                }
            } else if (this.props.onDragEnd) {
                this.props.onDragEnd();
            }
        }
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.handleResize);
        document.removeEventListener("mouseup", this.handleMouseUp);
        document.removeEventListener("mousemove", this.handleMouseMove);
        document.removeEventListener("touchend", this.handleMouseUp);
        document.removeEventListener("touchmove", this.handleTouchMove);
    }

    getSecondaryPaneSize(
        containerRect: DOMRect,
        splitterRect: DOMRect,
        clientPosition: { left: number; top: number },
        offsetMouse: boolean
    ) {
        let totalSize;
        let splitterSize;
        let offset;
        if (this.props.vertical) {
            totalSize = containerRect.height;
            splitterSize = splitterRect.height;
            offset = clientPosition.top - containerRect.top;
        } else {
            totalSize = containerRect.width;
            splitterSize = splitterRect.width;
            offset = clientPosition.left - containerRect.left;
        }
        if (offsetMouse) {
            offset -= splitterSize / 2;
        }
        if (offset < 0) {
            offset = 0;
        } else if (offset > totalSize - splitterSize) {
            offset = totalSize - splitterSize;
        }

        let secondaryPaneSize;
        if (this.props.primaryIndex === 1) {
            secondaryPaneSize = offset;
        } else {
            secondaryPaneSize = totalSize - splitterSize - offset;
        }
        let primaryPaneSize = totalSize - splitterSize - secondaryPaneSize;
        if (this.props.percentage) {
            secondaryPaneSize = (secondaryPaneSize * 100) / totalSize;
            primaryPaneSize = (primaryPaneSize * 100) / totalSize;
            splitterSize = (splitterSize * 100) / totalSize;
            totalSize = 100;
        }

        if (primaryPaneSize < (this.props.primaryMinSize || 0)) {
            secondaryPaneSize = Math.max(
                secondaryPaneSize -
                    ((this.props.primaryMinSize || 0) - primaryPaneSize),
                0
            );
        } else if (secondaryPaneSize < (this.props.secondaryMinSize || 0)) {
            secondaryPaneSize = Math.min(
                totalSize - splitterSize - (this.props.primaryMinSize || 0),
                this.props.secondaryMinSize || 0
            );
        }

        return secondaryPaneSize;
    }

    handleResize() {
        if (this.splitter && !this.props.percentage && this.container) {
            const containerRect = this.container.getBoundingClientRect();
            const splitterRect = this.splitter.getBoundingClientRect();
            const secondaryPaneSize = this.getSecondaryPaneSize(
                containerRect,
                splitterRect,
                {
                    left: splitterRect.left,
                    top: splitterRect.top,
                },
                false
            );
            this.setState({ secondaryPaneSize });
        }
    }

    handleMouseMove(e: MouseEvent) {
        if (this.state.resizing && this.container && this.splitter) {
            const containerRect = this.container.getBoundingClientRect();
            const splitterRect = this.splitter.getBoundingClientRect();
            const secondaryPaneSize = this.getSecondaryPaneSize(
                containerRect,
                splitterRect,
                {
                    left: e.clientX,
                    top: e.clientY,
                },
                true
            );
            clearSelection();
            this.setState({ secondaryPaneSize });
        }
    }

    handleTouchMove(e: TouchEvent) {
        this.handleMouseMove(e.changedTouches[0] as any);
    }

    handleSplitterMouseDown() {
        clearSelection();
        this.setState({ resizing: true });
    }

    handleMouseUp() {
        this.setState((prevState) =>
            prevState.resizing ? { resizing: false } : null
        );
    }

    render() {
        let containerClasses = "splitter-layout";
        if (this.props.customClassName) {
            containerClasses += ` ${this.props.customClassName}`;
        }
        if (this.props.vertical) {
            containerClasses += " splitter-layout-vertical";
        }
        if (this.state.resizing) {
            containerClasses += " layout-changing";
        }

        const children = React.Children.toArray(this.props.children).slice(
            0,
            2
        );
        if (children.length === 0) {
            children.push(<div />);
        }
        const wrappedChildren = [];
        const primaryIndex =
            this.props.primaryIndex !== 0 && this.props.primaryIndex !== 1
                ? 0
                : this.props.primaryIndex;
        for (let i = 0; i < children.length; ++i) {
            let primary = true;
            let size = undefined;
            if (children.length > 1 && i !== primaryIndex) {
                primary = false;
                size = this.state.secondaryPaneSize;
            }
            wrappedChildren.push(
                <Pane
                    vertical={this.props.vertical}
                    percentage={this.props.percentage}
                    primary={primary}
                    size={size}
                    key={i}
                >
                    {children[i]}
                </Pane>
            );
        }

        return (
            <div
                className={containerClasses}
                ref={(c) => {
                    this.container = c;
                }}
            >
                {wrappedChildren[0]}
                {wrappedChildren.length > 1 && (
                    <div
                        role="separator"
                        className="layout-splitter"
                        ref={(c) => {
                            this.splitter = c;
                        }}
                        onMouseDown={this.handleSplitterMouseDown}
                        onTouchStart={this.handleSplitterMouseDown}
                    />
                )}
                {wrappedChildren.length > 1 && wrappedChildren[1]}
            </div>
        );
    }
}

export default SplitterLayout;
