import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";

interface GlobalDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void> | void;

  title?: string;
  description?: string;

  confirmText?: string;
  cancelText?: string;

  loading?: boolean;
  error?: string | null;

  destructive?: boolean;
}

export default function GlobalDeleteModal({
  open,
  onOpenChange,
  onDelete,
  title = "Delete Item",
  description = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  loading = false,
  error,
  destructive = true,
}: GlobalDeleteModalProps) {
  const handleDelete = async () => {
    try {
      await onDelete();
      onOpenChange(false);
    } catch {
      // Parent component should handle errors.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!loading) {
          onOpenChange(value);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>

            <DialogTitle>{title}</DialogTitle>
          </div>

          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>

          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

            {loading ? "Deleting..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
