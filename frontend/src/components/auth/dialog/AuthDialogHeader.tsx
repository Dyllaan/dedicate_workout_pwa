import type { LucideIcon } from "lucide-react";

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuthDialogHeaderProps = {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
};

export default function AuthDialogHeader({
  icon: Icon,
  title,
  description,
  className,
}: AuthDialogHeaderProps) {
  return (
    <DialogHeader className={className}>
      <DialogTitle className="auth-dialog-title-row">
        <Icon className="auth-dialog-title-icon" />
        {title}
      </DialogTitle>
      {description ? <DialogDescription>{description}</DialogDescription> : null}
    </DialogHeader>
  );
}
