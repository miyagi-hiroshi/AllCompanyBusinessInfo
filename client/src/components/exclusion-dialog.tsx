import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ExclusionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  isExcluding: boolean;
  onConfirm: (reason: string) => void;
}

export function ExclusionDialog({
  open,
  onOpenChange,
  selectedCount,
  isExcluding,
  onConfirm,
}: ExclusionDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isExcluding ? "突合対象外設定" : "突合対象外解除"}
          </DialogTitle>
          <DialogDescription>
            {isExcluding
              ? `選択した${selectedCount}件の明細を突合対象外に設定します。`
              : `選択した${selectedCount}件の明細の突合対象外を解除します。`}
          </DialogDescription>
        </DialogHeader>
        {isExcluding && (
          <div className="space-y-2">
            <Label htmlFor="reason">除外理由（オプション）</Label>
            <Textarea
              id="reason"
              placeholder="例: 重複データのため除外"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            variant={isExcluding ? "destructive" : "default"}
          >
            {isExcluding ? "除外" : "除外解除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
