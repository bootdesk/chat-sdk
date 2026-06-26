import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { PollCardComponent } from "../../src/cards/PollCard";

describe("PollCard", () => {
  const defaultCard = {
    type: "poll" as const,
    question: "Best color?",
    options: [
      { id: "red", label: "Red" },
      { id: "blue", label: "Blue" },
    ],
  };

  it("renders question", () => {
    render(<PollCardComponent card={defaultCard} />);
    expect(screen.getByText("Best color?")).toBeInTheDocument();
  });

  it("renders all options", () => {
    render(<PollCardComponent card={defaultCard} />);
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
  });

  it("selects option on click", () => {
    render(<PollCardComponent card={defaultCard} />);
    fireEvent.click(screen.getByText("Red"));
    const option = screen.getByText("Red").closest("button");
    expect(option?.className).toContain("bdesk-poll-card-option--selected");
  });

  it("shows vote button after selection", () => {
    render(<PollCardComponent card={defaultCard} />);
    fireEvent.click(screen.getByText("Red"));
    expect(screen.getByText("Vote")).toBeInTheDocument();
  });

  it("calls onActionClick on vote with selected option", () => {
    const onActionClick = vi.fn();
    render(<PollCardComponent card={defaultCard} onActionClick={onActionClick} />);
    fireEvent.click(screen.getByText("Red"));
    fireEvent.click(screen.getByText("Vote"));
    expect(onActionClick).toHaveBeenCalledWith("poll_vote", "red");
  });

  it("shows results after voting", () => {
    const withResults = {
      ...defaultCard,
      results: [
        { optionId: "red", count: 10 },
        { optionId: "blue", count: 5 },
      ],
    };
    const onActionClick = vi.fn();
    render(<PollCardComponent card={withResults} onActionClick={onActionClick} />);
    fireEvent.click(screen.getByText("Red"));
    fireEvent.click(screen.getByText("Vote"));
    expect(screen.getByText("15 votes")).toBeInTheDocument();
  });

  it("supports multiple selection", () => {
    const multiCard = {
      ...defaultCard,
      allowMultiple: true,
    };
    render(<PollCardComponent card={multiCard} />);
    fireEvent.click(screen.getByText("Red"));
    fireEvent.click(screen.getByText("Blue"));
    expect(screen.getByText("Vote (2)")).toBeInTheDocument();
  });

  it("disables options after voting", () => {
    const onActionClick = vi.fn();
    render(<PollCardComponent card={defaultCard} onActionClick={onActionClick} />);
    fireEvent.click(screen.getByText("Red"));
    fireEvent.click(screen.getByText("Vote"));
    const redBtn = screen.getByText("Red").closest("button");
    expect(redBtn?.disabled).toBe(true);
  });

  it("returns null for non-poll type", () => {
    const { container } = render(
      <PollCardComponent card={{ type: "image" as any, url: "https://example.com/img.png" }} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
