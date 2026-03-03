import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Zap, Check, Loader2 } from 'lucide-react';

interface ScannerProps {
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onClose }) => {
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera access error:", err);
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setScannedImage(canvas.toDataURL('image/jpeg'));
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
  };

  const handleProcess = async () => {
    if (!scannedImage) return;
    setIsProcessing(true);
    setResultText(null);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: scannedImage }),
      });
      const data = await response.json();
      if (data.text) {
        setResultText(data.text);
      } else {
        throw new Error("No text returned");
      }
    } catch (error) {
      console.error("Processing error:", error);
      alert("AI Processing failed. Check your API key.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScannedImage(null);
    setResultText(null);
    startCamera();
  };

  useEffect(() => {
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-zinc-900/50">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><X size={24} /></button>
        <span className="font-bold tracking-widest uppercase text-blue-400">AI Vision Scanner</span>
        <div className="w-10"></div>
      </div>

      {/* Main View */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-y-auto">
        {!scannedImage ? (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full p-6 flex flex-col gap-6">
            <img src={scannedImage} className="max-h-[35%] object-contain rounded-2xl border border-white/10 shadow-2xl" />
            
            {isProcessing && (
              <div className="flex flex-col items-center justify-center p-12 gap-4 bg-zinc-900/50 rounded-3xl border border-blue-500/20">
                <Loader2 className="animate-spin text-blue-500" size={40} />
                <p className="text-blue-400 font-medium animate-pulse text-sm">Gemini is analyzing...</p>
              </div>
            )}

            {resultText && (
              <div className="bg-zinc-900 p-6 rounded-3xl border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Extraction Results</h3>
                  <div className="px-2 py-1 bg-blue-500/10 rounded text-[10px] text-blue-400 font-bold">SUCCESS</div>
                </div>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm font-light">{resultText}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-8 bg-black/90 backdrop-blur-xl border-t border-white/5">
        {!scannedImage ? (
          <button onClick={captureImage} className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-[6px] border-blue-600">
            <div className="w-12 h-12 rounded-full border-2 border-black/5"></div>
          </button>
        ) : (
          <div className="flex gap-4 max-w-md mx-auto">
            {!isProcessing && (
              <>
                <button onClick={resetScanner} className="flex-1 bg-zinc-800 py-4 rounded-2xl flex items-center justify-center gap-2 font-medium text-sm"><RefreshCw size={16} /> Retake</button>
                {!resultText && (
                  <button onClick={handleProcess} className="flex-1 bg-blue-600 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-blue-600/30"><Check size={16} /> Run AI Analysis</button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;
