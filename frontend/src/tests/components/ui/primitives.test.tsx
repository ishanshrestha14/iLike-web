import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

describe("Input", () => {
  it("renders and forwards changes", () => {
    const onChange = vi.fn();
    render(<Input placeholder="Email" onChange={onChange} />);
    const el = screen.getByPlaceholderText("Email");
    fireEvent.change(el, { target: { value: "a@b.com" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("respects disabled", () => {
    render(<Input placeholder="x" disabled />);
    expect(screen.getByPlaceholderText("x")).toBeDisabled();
  });
});

describe("Textarea", () => {
  it("renders and forwards changes", () => {
    const onChange = vi.fn();
    render(<Textarea placeholder="Bio" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("Bio"), {
      target: { value: "hi" },
    });
    expect(onChange).toHaveBeenCalled();
  });
});

describe("Label", () => {
  it("associates with a control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="name">Name</Label>
        <Input id="name" />
      </>
    );
    expect(screen.getByText("Name")).toHaveAttribute("for", "name");
  });
});

describe("Card", () => {
  it("composes its sub-parts", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Foot")).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("renders text with the default variant", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toHaveClass("bg-primary");
  });

  it("applies a chosen variant", () => {
    render(<Badge variant="like">Liked</Badge>);
    expect(screen.getByText("Liked")).toHaveClass("text-like");
  });
});
