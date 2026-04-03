import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

export default function QRScanner({ onScan, onClose, title = "Scan QR Code" }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Success
        onScan(decodedText);
        scanner.clear();
        onClose();
      },
      (errorMessage) => {
        // This is called for every frame where no QR is found, so we don't log it
      }
    );

    // Give it a moment to initialize
    const timer = setTimeout(() => setIsInitializing(false), 1000);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner:", err));
      }
      clearTimeout(timer);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-light text-brand-pink rounded-xl flex items-center justify-center">
              <Camera size={24} />
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="relative aspect-square bg-gray-900 rounded-3xl overflow-hidden shadow-inner">
            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 bg-gray-900 z-10">
                <Loader2 className="w-10 h-10 animate-spin text-brand-pink" />
                <p className="font-bold text-sm">Initializing Camera...</p>
              </div>
            )}
            <div id="qr-reader" className="w-full h-full border-none"></div>
            
            {/* Scanner Overlay UI */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-brand-pink/50 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-pink rounded-tl-xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-pink rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-pink rounded-bl-xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-pink rounded-br-xl"></div>
                
                {/* Scanning Line Animation */}
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-brand-pink/30 shadow-[0_0_15px_rgba(255,107,156,0.5)]"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm leading-relaxed">
              Position the patient's MediTap ID QR code within the frame to scan instantly.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
