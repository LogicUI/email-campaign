import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InvalidRowAlert } from "@/components/data-import/invalid-row-alert";

describe("InvalidRowAlert", () => {
  it("renders all invalid rows inside a scrollable panel", () => {
    render(
      <InvalidRowAlert
        invalidCount={8}
        rows={Array.from({ length: 8 }, (_, index) => ({
          rowIndex: index + 2,
          email: `lead${index + 1}@example.com`,
          reason: "Invalid email format.",
        }))}
      />,
    );

    expect(screen.getByText("8 rows will be skipped")).toBeInTheDocument();
    expect(screen.getByText("Row 9")).toBeInTheDocument();
    expect(screen.queryByText(/\+3 more invalid rows/i)).not.toBeInTheDocument();
  });
});
