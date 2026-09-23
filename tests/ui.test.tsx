import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FlightCard } from "../src/components/UI";
import { flight } from "./fixtures";
it("renders honest status, airport codes and a working detail link", () => {
  const f = flight({ status: "Scheduled" });
  render(
    <MemoryRouter>
      <FlightCard flight={f} />
    </MemoryRouter>,
  );
  expect(screen.getByText("Scheduled")).toBeInTheDocument();
  expect(screen.getByText("EVN")).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", `/flight/${f.id}`);
  expect(screen.getByText("User-entered flight record")).toBeInTheDocument();
});
