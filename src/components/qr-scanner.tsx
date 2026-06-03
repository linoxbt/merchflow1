import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
};

const REGION_ID = "qr-scanner-region";

export function QrScanner({ open, onClose, onScan }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    async function start() {
      try {
        const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelled) return;
            onScan(decoded);
            stop();
            onClose();
          },
          () => {},
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Camera not available");
      }
    }

    async function stop() {
      const s = scannerRef.current;
      if (!s) return;
      try {
        if (s.isScanning) await s.stop();
        await s.clear();
      } catch {
        /* swallow */
      }
      scannerRef.current = null;
    }

    start();
    return () => {
      cancelled = true;
      void stop();
    };
  }, [open, onClose, onScan]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> Scan invoice QR
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div
            id={REGION_ID}
            className="w-full aspect-square rounded-md overflow-hidden bg-black"
          />
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-3 text-xs">
              {error}. Make sure you've granted camera permission and try again.
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose} className="border border-border">
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}