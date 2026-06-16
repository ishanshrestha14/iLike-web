import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PhotoGallery } from "@/components/profile/PhotoGallery";

// Reduced motion → transitions resolve instantly for stable assertions.
beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("reduce"),
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

const photos = ["/a.jpg", "/b.jpg", "/c.jpg"];

describe("PhotoGallery", () => {
  it("renders the first photo", () => {
    render(<PhotoGallery photos={photos} alt="Alice" />);
    expect(screen.getByAltText("Alice 1 of 3")).toBeInTheDocument();
  });

  it("shows an empty state with no photos", () => {
    render(<PhotoGallery photos={[]} />);
    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument();
  });

  it("advances to the next photo", async () => {
    render(<PhotoGallery photos={photos} alt="Alice" />);
    fireEvent.click(screen.getByLabelText("Next photo"));
    expect(await screen.findByAltText("Alice 2 of 3")).toBeInTheDocument();
  });

  it("goes to the previous photo (wraps around)", async () => {
    render(<PhotoGallery photos={photos} alt="Alice" />);
    fireEvent.click(screen.getByLabelText("Previous photo"));
    expect(await screen.findByAltText("Alice 3 of 3")).toBeInTheDocument();
  });

  it("jumps via thumbnails", async () => {
    render(<PhotoGallery photos={photos} alt="Alice" />);
    fireEvent.click(screen.getByLabelText("View photo 3"));
    expect(await screen.findByAltText("Alice 3 of 3")).toBeInTheDocument();
  });

  it("hides nav controls for a single photo", () => {
    render(<PhotoGallery photos={["/only.jpg"]} alt="Alice" />);
    expect(screen.queryByLabelText("Next photo")).not.toBeInTheDocument();
  });
});
