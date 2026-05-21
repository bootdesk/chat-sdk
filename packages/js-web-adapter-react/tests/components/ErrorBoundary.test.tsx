import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ErrorBoundary } from "../../src/components/ErrorBoundary";

function Bomb({ shouldThrow }: { shouldThrow: boolean }): React.JSX.Element {
  if (shouldThrow) throw new Error("Boom!");
  return <div>Safe</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders default fallback on error", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Boom!")).toBeInTheDocument();
  });

  it("renders custom fallback element", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
  });

  it("renders custom fallback function", () => {
    render(
      <ErrorBoundary fallback={(error) => <div>Error: {error.message}</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Error: Boom!")).toBeInTheDocument();
  });

  it("calls onError when caught", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toBe("Boom!");
  });

  it("recovers when Try again is clicked and children no longer throw", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    screen.getByText("Try again").click();

    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });
});
