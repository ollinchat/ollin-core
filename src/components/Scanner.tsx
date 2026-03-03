import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Zap, Check } from 'lucide-react';

interface ScannerProps {
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onClose }) => {
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
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
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg');
    setScannedImage(imageData);
    
    // Stop camera tracks to save battery/resources
    const stream = video.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
  };

  const resetScanner = () => {
    setScannedImage(null);
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white">
          <X size={24} />
        </button>
        <span className="font-semibold text-lg text-white tracking-tight uppercase">Ollin Scanner</span>
        <button className="p-2 bg-white/10 rounded-full text-yellow-400">
          <Zap size={20} fill="currentColor" />
        </button>
      </div>

      {/* Viewport / Live Feed */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-zinc-950">
        {!scannedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* Professional Viewfinder Overlay */}
            <div className="absolute inset-0 border-[2px] border-white/10 m-8 rounded-3xl pointer-events-none">
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-full h-[1px] bg-blue-500/20 shadow-[0_0_15px_blue] animate-pulse"></div>
                </div>
            </div>
          </>
        ) : (
          <img src={scannedImage} alt="Captured preview" className="w-full h-full object-contain p-6" />
        )}
      </div>

      {/* Control Bar */}
      <div className="p-10 flex justify-center items-center bg-black/90 backdrop-blur-xl border-t border-white/5">
        {!scannedImage ? (
          <button 
            onClick={captureImage}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-90 transition-all"
          >
            <div className="w-[70px] h-[70px] bg-white border-2 border-black/10 rounded-full flex items-center justify-center">
                <div className="w-full h-full border-[6px] border-blue-600 rounded-full"></div>
            </div>
          </button>
        ) : (
          <div className="flex gap-4 w-full max-w-sm">
            <button 
              onClick={resetScanner}
              className="flex-1 bg-zinc-800 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-medium hover:bg-zinc-700 transition-all"
            >
              <RefreshCw size={18} /> Retake
            </button>
            <button 
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
              onClick={() => console.log("Ready to process with AI...")}
            >
              <Check size={18} /> Save & Process
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scanner;