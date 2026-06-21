import type { ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "dark";
  block?: boolean;
}

export default function Button({
  variant = "primary",
  block = false,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      className={`btn btn-${variant} ${block ? "btn-block" : ""} ${className}`}
      {...rest}
    />
  );
}
