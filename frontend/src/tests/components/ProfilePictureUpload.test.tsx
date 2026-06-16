import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import { uploadProfilePicture } from "@/services/profileService";

vi.mock("@/services/profileService", () => ({
  uploadProfilePicture: vi.fn(),
}));
vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const file = new File(["x"], "p.jpg", { type: "image/jpeg" });
const fileInput = (c: HTMLElement) =>
  c.querySelector('input[type="file"]') as HTMLInputElement;

beforeEach(() => vi.clearAllMocks());

describe("ProfilePictureUpload", () => {
  it("shows 'Add Photo' when there is no current picture", () => {
    render(
      <ProfilePictureUpload currentPictureUrl={null} onUploadSuccess={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: /add photo/i })
    ).toBeInTheDocument();
  });

  it("renders the current picture when provided", () => {
    render(
      <ProfilePictureUpload
        currentPictureUrl="/me.jpg"
        onUploadSuccess={vi.fn()}
      />
    );
    expect(screen.getByAltText("Profile")).toHaveAttribute("src", "/me.jpg");
  });

  it("uploads the selected file and reports the new URL", async () => {
    vi.mocked(uploadProfilePicture).mockResolvedValue("/new.jpg");
    const onUploadSuccess = vi.fn();
    const { container } = render(
      <ProfilePictureUpload
        currentPictureUrl={null}
        onUploadSuccess={onUploadSuccess}
      />
    );

    fireEvent.change(fileInput(container), { target: { files: [file] } });

    await waitFor(() =>
      expect(onUploadSuccess).toHaveBeenCalledWith("/new.jpg")
    );
    expect(uploadProfilePicture).toHaveBeenCalledWith(file);
  });

  it("does not report success when the upload fails", async () => {
    vi.mocked(uploadProfilePicture).mockRejectedValue(new Error("nope"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onUploadSuccess = vi.fn();
    const { container } = render(
      <ProfilePictureUpload
        currentPictureUrl={null}
        onUploadSuccess={onUploadSuccess}
      />
    );

    fireEvent.change(fileInput(container), { target: { files: [file] } });

    await waitFor(() => expect(uploadProfilePicture).toHaveBeenCalled());
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it("ignores an empty file selection", () => {
    const { container } = render(
      <ProfilePictureUpload currentPictureUrl={null} onUploadSuccess={vi.fn()} />
    );
    fireEvent.change(fileInput(container), { target: { files: [] } });
    expect(uploadProfilePicture).not.toHaveBeenCalled();
  });
});
