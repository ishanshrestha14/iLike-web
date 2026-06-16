import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ProfileSetup from "@/components/ProfileSetup";

// ProfileSetup is a multi-step onboarding wizard (no props; submits via the
// profile service). These are resilient smoke tests of the wizard shell — full
// step-by-step coverage lands with the onboarding overhaul. useAuth is mocked
// globally in src/tests/setup.ts; useNavigate needs a Router.
const renderSetup = () =>
  render(
    <MemoryRouter>
      <ProfileSetup />
    </MemoryRouter>
  );

describe("ProfileSetup", () => {
  it("renders the wizard's first step", () => {
    renderSetup();
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
  });

  it("offers a Next control to advance the wizard", () => {
    renderSetup();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });
});
