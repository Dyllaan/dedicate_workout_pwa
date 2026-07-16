import { cloneElement, isValidElement, type ReactElement } from "react";

type TooltipProps = {
  label: string;
  children: ReactElement<{ title?: string; "aria-label"?: string }>;
};

export function Tooltip({ label, children }: TooltipProps) {
  if (!isValidElement(children)) {
    return children;
  }

  return cloneElement(children, {
    title: children.props.title ?? label,
  });
}
