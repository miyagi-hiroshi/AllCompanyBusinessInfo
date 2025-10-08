import { AlertTriangle, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type ReconciliationStatus = "matched" | "fuzzy" | "unmatched";

interface ReconciliationStatusBadgeProps {
  status: ReconciliationStatus;
  className?: string;
}

export function ReconciliationStatusBadge({ status, className }: ReconciliationStatusBadgeProps) {
  const config = {
    matched: {
      label: "突合済",
      icon: Check,
      className: "bg-success/20 text-success border-success/30",
    },
    fuzzy: {
      label: "曖昧一致",
      icon: AlertTriangle,
      className: "bg-warning/20 text-warning border-warning/30",
    },
    unmatched: {
      label: "未突合",
      icon: X,
      className: "bg-destructive/20 text-destructive border-destructive/30",
    },
  };

  const { label, icon: Icon, className: statusClassName } = config[status];

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-1 gap-1 ${statusClassName} ${className || ""}`}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{label}</span>
    </Badge>
  );
}
