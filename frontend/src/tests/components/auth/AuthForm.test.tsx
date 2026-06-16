import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import AuthForm from "@/components/auth/AuthForm";

const defaultProps = {
  isLogin: true,
  formData: { name: "", email: "", password: "" },
  isLoading: false,
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe("AuthForm", () => {
  it("renders the login form by default (no name field)", () => {
    render(<AuthForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/full name/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("renders the registration form when not in login mode", () => {
    render(<AuthForm {...defaultProps} isLogin={false} />);
    expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
  });

  it("forwards input changes", () => {
    const onInputChange = vi.fn();
    render(<AuthForm {...defaultProps} onInputChange={onInputChange} />);
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: "a@b.com", name: "email" },
    });
    expect(onInputChange).toHaveBeenCalled();
  });

  it("submits the form", () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <AuthForm {...defaultProps} onSubmit={onSubmit} />
    );
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows the loading state with a disabled submit", () => {
    render(<AuthForm {...defaultProps} isLoading />);
    const submit = screen.getByRole("button", { name: /processing/i });
    expect(submit).toBeDisabled();
  });

  it("shows an error message when provided", () => {
    render(<AuthForm {...defaultProps} error="Invalid credentials" />);
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("toggles password visibility", () => {
    const { container } = render(<AuthForm {...defaultProps} />);
    const password = screen.getByPlaceholderText(/password/i);
    expect(password).toHaveAttribute("type", "password");
    // The eye toggle is the only type="button" control in the form.
    fireEvent.click(container.querySelector('button[type="button"]')!);
    expect(password).toHaveAttribute("type", "text");
  });
});
