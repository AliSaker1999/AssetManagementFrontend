import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import clsx from 'clsx';

export type ScanResultKind = 'found' | 'already-found' | 'not-found' | 'ambiguous' | 'error';

export interface ScanResult {
  kind: ScanResultKind;
  scannedCode: string;
  assetCode?: string;
  message: string;
}

interface BarcodeScannerModalProps {
  onClose: () => void;
  /** Resolve + mutate + toast all live in the caller — this component only needs the outcome back. */
  onDetected: (scannedCode: string) => Promise<ScanResult>;
}

const DEDUPE_WINDOW_MS = 2500;
const MAX_FEED_ITEMS = 20;

const kindDotClass: Record<ScanResultKind, string> = {
  found: 'bg-success',
  'already-found': 'bg-ink-300',
  'not-found': 'bg-danger',
  ambiguous: 'bg-warning',
  error: 'bg-danger',
};

function describeCameraError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  switch (name) {
    case 'NotAllowedError': return 'Camera access was denied. Allow camera permission for this site and try again.';
    case 'NotFoundError': return 'No camera was found on this device.';
    case 'NotReadableError': return 'The camera is already in use by another application or browser tab.';
    case 'OverconstrainedError': return 'Could not access a camera on this device.';
    default: return 'Could not start the camera. Please try again.';
  }
}

/** Minimal shape of the ImageCapture API this component needs — not declared in every TS DOM lib
 *  version, and not implemented in every browser (notably Safari), so it's accessed defensively
 *  through `window` rather than referencing a global `ImageCapture` type directly. */
interface ImageCaptureLike {
  grabFrame(): Promise<ImageBitmap>;
}

/**
 * Full-screen camera scanner for continuous barcode scanning — point at one tag after
 * another without closing this modal between scans. Unmounting (not a separate `open` prop)
 * is what closes it, so camera teardown has exactly one path: this effect's cleanup.
 */
export default function BarcodeScannerModal({ onClose, onDetected }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastRef = useRef<{ code: string; atMs: number } | null>(null);
  const busyRef = useRef(false);
  const captureBusyRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [scannedCount, setScannedCount] = useState(0);
  const [feed, setFeed] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [captureHint, setCaptureHint] = useState<string | null>(null);

  // Shared by both the continuous auto-scan loop and the manual capture button below — only
  // depends on stable refs/state setters, so it's fine to live outside the camera effect and
  // be called from either path without duplicating the dedupe/busy/result-feed logic.
  const handleDecode = useCallback(async (text: string) => {
    // busyRef is checked BEFORE touching lastRef, and lastRef is only stamped once we
    // actually commit to processing — not on every sighting. Stamping it unconditionally
    // meant a code that got busy-blocked once, while still held continuously in frame, kept
    // refreshing its own "just seen" timestamp every frame without ever being processed — so
    // it looked permanently stuck in cooldown until physically removed from view and re-shown.
    if (busyRef.current) return;
    const now = Date.now();
    const last = lastRef.current;
    if (last && last.code === text && now - last.atMs < DEDUPE_WINDOW_MS) return;

    busyRef.current = true;
    lastRef.current = { code: text, atMs: now };
    setScannedCount((n) => n + 1);
    try {
      const result = await onDetectedRef.current(text);
      setFeed((prev) => [result, ...prev].slice(0, MAX_FEED_ITEMS));
    } catch {
      const errorResult: ScanResult = { kind: 'error', scannedCode: text, message: 'Unexpected error' };
      setFeed((prev) => [errorResult, ...prev].slice(0, MAX_FEED_ITEMS));
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access requires a secure connection (HTTPS or localhost). Ask an administrator about enabling HTTPS for this site.');
      return;
    }

    let cancelled = false;
    let controls: IScannerControls | null = null;
    let stream: MediaStream | null = null;
    let frameSeen = false;

    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    function stopVideoTracks() {
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      stream = null;
    }

    // Some phone cameras accept the stream (decodeFromConstraints resolves, no exception) but
    // never actually deliver frames — e.g. an unsupported resolution silently chosen for an
    // unusual rear-camera module. The decode callback below fires on every processed frame
    // regardless of whether a barcode was found in it, so if it never fires at all, no frames
    // are arriving and scanning cannot work — surface that instead of an indefinite blank
    // screen with nothing to act on.
    const watchdog = window.setTimeout(() => {
      if (!cancelled && !frameSeen) {
        setCameraError('The camera started but no video arrived. This can happen on some phone cameras — try again, or check that no other app is using the camera.');
      }
    }, 7000);

    // Acquired and attached manually rather than handing constraints straight to zxing's
    // decodeFromConstraints: on at least one Android phone that call resolved successfully
    // and the decoder was genuinely receiving frames (proven by a frame-seen diagnostic used
    // while tracking this down), yet the <video> element's own srcObject/readyState never
    // reflected the stream at all — zxing's internal stream-to-video attachment silently
    // failed even though the camera and the decode pipeline both worked. Owning getUserMedia +
    // srcObject + play() here removes that attachment step from zxing's side entirely; it's
    // only ever handed an element already known to be playing, via decodeFromVideoElement.
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play().catch(() => {}); // some browsers need an explicit play() despite autoplay attrs

        const c = await reader.decodeFromVideoElement(video, (result) => {
          if (cancelled) return;
          frameSeen = true;
          if (!result) return; // per-frame "nothing decoded" is expected, not an error
          void handleDecode(result.getText());
        });
        if (cancelled) { c.stop(); stopVideoTracks(); return; } // acquired after we already closed
        controls = c;
      } catch (err) {
        if (!cancelled) setCameraError(describeCameraError(err));
      }
    }

    void start();

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      controls?.stop();
      stopVideoTracks(); // belt-and-suspenders: guarantee the camera indicator light goes off
      readerRef.current = null;
    };
  }, [retryToken, handleDecode]);

  // Manual "capture" — the continuous scan above decodes from the live video preview, which
  // browsers commonly cap at a lower resolution than the camera can actually deliver as a
  // still. A dense/long barcode can have bars too thin for the live preview to resolve even
  // though a full-resolution photo of the same label decodes fine. ImageCapture.grabFrame()
  // reads the sensor's current frame independent of the video element's own resolution, so
  // this is a genuinely higher-detail attempt, not just "try the same thing again" — falls
  // back to snapshotting the live video frame on browsers without ImageCapture (notably Safari).
  const handleManualCapture = useCallback(async () => {
    const video = videoRef.current;
    const reader = readerRef.current;
    if (!video || !reader || captureBusyRef.current) return;

    captureBusyRef.current = true;
    setCapturing(true);
    setCaptureHint(null);
    try {
      const canvas = document.createElement('canvas');
      let bitmap: ImageBitmap | null = null;

      const track = (video.srcObject as MediaStream | null)?.getVideoTracks()[0];
      const ImageCaptureCtor = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => ImageCaptureLike }).ImageCapture;
      if (track && ImageCaptureCtor) {
        try {
          bitmap = await new ImageCaptureCtor(track).grabFrame();
        } catch {
          bitmap = null; // fall through to the video-frame fallback below
        }
      }

      const ctx = canvas.getContext('2d')!;
      if (bitmap) {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      try {
        const result = reader.decodeFromCanvas(canvas);
        void handleDecode(result.getText());
      } catch {
        setCaptureHint('No barcode found in that capture — steady the camera and try again.');
        setTimeout(() => setCaptureHint(null), 2500);
      }
    } finally {
      captureBusyRef.current = false;
      setCapturing(false);
    }
  }, [handleDecode]);

  return (
    <div className="fixed inset-0 z-[120] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-navy-800 text-white shrink-0">
        <div className="text-[14px] font-semibold">Scan Barcode</div>
        <div className="text-[13px] text-navy-200 num">{scannedCount} scanned</div>
      </div>

      <div className="relative flex-1 min-h-0 bg-black">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-white text-[14px]">{cameraError}</p>
            <button onClick={() => { setCameraError(null); setRetryToken((t) => t + 1); }} className="btn-secondary">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-[75%] max-w-sm aspect-[3/1] border-2 border-gold-400/80 rounded-lg" />
            </div>

            {captureHint && (
              <div className="absolute top-3 left-3 right-3 text-center text-[12px] text-white bg-black/70 rounded-lg px-3 py-2">
                {captureHint}
              </div>
            )}

            {/* Manual capture: grabs a full-resolution still (see handleManualCapture) rather
                than relying on the live preview's own resolution — for barcodes dense enough
                that continuous scanning struggles. */}
            <button
              onClick={() => void handleManualCapture()}
              disabled={capturing}
              aria-label="Capture"
              className={clsx(
                'absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white',
                'flex items-center justify-center transition-transform active:scale-95',
                capturing ? 'bg-white/40' : 'bg-white/90'
              )}
            >
              <div className={clsx('w-12 h-12 rounded-full', capturing ? 'bg-white/60' : 'bg-white')} />
            </button>
          </>
        )}
      </div>

      <div className="max-h-[30vh] overflow-y-auto bg-navy-900 shrink-0">
        {feed.length === 0 ? (
          <div className="text-center text-[13px] text-navy-300 py-6 px-4">
            Point the camera at a barcode label — it scans automatically, or tap the shutter button to capture a sharper still.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-navy-700">
            {feed.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                <span className={clsx('w-2 h-2 rounded-full shrink-0', kindDotClass[r.kind])} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white font-code truncate">
                    {r.assetCode ?? r.scannedCode}
                  </div>
                  <div className="text-[12px] text-navy-300 truncate">{r.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-navy-800 shrink-0 flex justify-center">
        <button onClick={onClose} className="btn-secondary w-full max-w-xs">Done</button>
      </div>
    </div>
  );
}
