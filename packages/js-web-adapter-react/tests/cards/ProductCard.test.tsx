import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ProductCardComponent } from "../../src/cards/ProductCard";

describe("ProductCard", () => {
  const defaultCard = {
    type: "product" as const,
    url: "https://example.com/product.jpg",
    title: "Widget",
    price: 29.99,
    currency: "USD",
  };

  it("renders product image", () => {
    const { container } = render(<ProductCardComponent card={defaultCard} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.com/product.jpg");
  });

  it("displays title and price", () => {
    render(<ProductCardComponent card={defaultCard} />);
    expect(screen.getByText("Widget")).toBeInTheDocument();
    expect(screen.getByText("USD 29.99")).toBeInTheDocument();
  });

  it("shows badge when provided", () => {
    const withBadge = { ...defaultCard, badge: "Sale" };
    render(<ProductCardComponent card={withBadge} />);
    expect(screen.getByText("Sale")).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    const withActions = {
      ...defaultCard,
      actions: [
        { label: "Buy", actionId: "buy", value: "sku-123" },
        { label: "Details", actionId: "details" },
      ],
    };
    render(<ProductCardComponent card={withActions} />);
    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("calls onActionClick when action button clicked", () => {
    const onActionClick = vi.fn();
    const withAction = {
      ...defaultCard,
      actions: [{ label: "Buy", actionId: "buy", value: "sku-123" }],
    };
    render(<ProductCardComponent card={withAction} onActionClick={onActionClick} />);
    fireEvent.click(screen.getByText("Buy"));
    expect(onActionClick).toHaveBeenCalledWith("buy", "sku-123");
  });

  it("returns null for non-product type", () => {
    const { container } = render(
      <ProductCardComponent card={{ type: "image" as any, url: "https://example.com/img.png" }} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
