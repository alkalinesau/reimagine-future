/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Sparkles, 
  Rocket, 
  Stethoscope, 
  Building2, 
  Globe2, 
  Cpu,
  Loader2,
  RefreshCcw,
  Download,
  ChevronRight,
  QrCode,
  X
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

// --- Constants & Types ---

const OCCUPATIONS = [
  {
    id: 'interstellar-explorer',
    title: 'Interstellar Explorer',
    description: 'Venture beyond the stars in a sleek, futuristic space suit.',
    icon: Rocket,
    prompt: 'Transform the person in the photo into an Interstellar Explorer. They should be wearing a highly detailed, sleek, futuristic white and chrome space suit with glowing blue accents. The background should be the interior of a high-tech spaceship bridge with a view of a colorful nebula through a massive window. Maintain the person\'s facial features and identity perfectly. Cinematic lighting, photorealistic, 8k resolution.',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'cybernetic-surgeon',
    title: 'Cybernetic Surgeon',
    description: 'Master of bio-tech integration in a high-tech medical bay.',
    icon: Stethoscope,
    prompt: 'Transform the person in the photo into a Cybernetic Surgeon. They should be wearing advanced medical scrubs with integrated fiber-optic sensors and a sleek head-mounted augmented reality display. One arm should have subtle, elegant cybernetic enhancements. The background is a sterile, glowing blue futuristic operating room with holographic medical charts. Maintain facial identity. Photorealistic, professional lighting.',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'deep-sea-architect',
    title: 'Deep Sea Architect',
    description: 'Designing the underwater cities of tomorrow.',
    icon: Building2,
    prompt: 'Transform the person in the photo into a Deep Sea Architect. They are wearing a specialized lightweight diving suit with bioluminescent trim. They are standing in front of a massive glass dome overlooking a sprawling, glowing underwater city with futuristic submersibles. Maintain facial identity. Ethereal underwater lighting, vibrant colors, photorealistic.',
    color: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'galactic-diplomat',
    title: 'Galactic Diplomat',
    description: 'The voice of humanity in the intergalactic council.',
    icon: Globe2,
    prompt: 'Transform the person in the photo into a Galactic Diplomat. They are wearing elegant, flowing futuristic robes made of iridescent, light-emitting fabric. The setting is a grand, sun-drenched council chamber with alien architecture and holographic star maps in the background. Maintain facial identity. Regal atmosphere, soft cinematic lighting, high detail.',
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'quantum-ai-engineer',
    title: 'Quantum AI Engineer',
    description: 'Architecting the minds of the next generation.',
    icon: Cpu,
    prompt: 'Transform the person in the photo into a Quantum AI Engineer. They are wearing a minimalist tech-wear outfit with subtle glowing circuits. They are surrounded by floating, complex quantum data visualizations and glowing neural network structures in a dark, high-tech lab. Maintain facial identity. Cyberpunk aesthetic, high contrast, neon accents, photorealistic.',
    color: 'from-orange-500 to-red-600'
  }
];

// --- Components ---

export default function App() {
  const [selectedJob, setSelectedJob] = useState(OCCUPATIONS[0]);
  const [image, setImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResultImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResultImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleReimagine = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = 'gemini-2.5-flash-image';

      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: selectedJob.prompt,
            },
          ],
        },
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const newImage = `data:image/png;base64,${part.inlineData.data}`;
            setResultImage(newImage);
            foundImage = true;
            
            // Automatically trigger share to get ID for QR code
            try {
              const shareResponse = await fetch('/api/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: newImage }),
              });
              const shareData = await shareResponse.json();
              if (shareData.id) {
                setShareId(shareData.id);
              }
            } catch (shareErr) {
              console.error("Auto-sharing failed", shareErr);
            }
            
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("The AI didn't return an image. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during the transformation.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `future-${selectedJob.id}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!resultImage) return;
    setIsSharing(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: resultImage }),
      });
      const data = await response.json();
      if (data.id) {
        setShareId(data.id);
      }
    } catch (err) {
      console.error("Sharing failed", err);
    } finally {
      setIsSharing(false);
    }
  };

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : '';

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="w-full mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4"
        >
          <Sparkles className="w-3 h-3" />
          <span>AI-POWERED TRANSFORMATION</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-4"
        >
          Reimagine Your <span className="gradient-text">Future</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-400 max-w-2xl mx-auto text-lg"
        >
          Upload your photo and see yourself in the most prestigious occupations of the next century.
        </motion.p>
      </header>

      <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Options */}
        <div className="lg:col-span-5 space-y-8">
          {/* Upload Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <span className="w-4 h-px bg-zinc-800"></span>
              Step 1: Your Identity
            </h2>
            
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
                ${image ? 'border-emerald-500/50' : 'border-zinc-800 hover:border-zinc-700 hover:bg-white/5'}
              `}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              
              {image ? (
                <div className="relative w-full h-full group">
                  <img src={image} alt="Original" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-sm font-medium flex items-center gap-2">
                      <RefreshCcw className="w-4 h-4" /> Change Photo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                    <Upload className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-zinc-300 font-medium">Drop your photo here</p>
                  <p className="text-zinc-500 text-sm mt-1">or click to browse files</p>
                </div>
              )}
            </div>
          </section>

          {/* Job Selection */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <span className="w-4 h-px bg-zinc-800"></span>
              Step 2: Choose Your Destiny
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              {OCCUPATIONS.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`
                    flex items-start gap-4 p-4 rounded-xl border transition-all text-left
                    ${selectedJob.id === job.id 
                      ? `bg-gradient-to-r ${job.color} border-transparent text-white shadow-lg` 
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'}
                  `}
                >
                  <div className={`
                    p-2 rounded-lg 
                    ${selectedJob.id === job.id ? 'bg-white/20' : 'bg-zinc-800'}
                  `}>
                    <job.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">{job.title}</h3>
                    <p className={`text-xs mt-1 ${selectedJob.id === job.id ? 'text-white/80' : 'text-zinc-500'}`}>
                      {job.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <button
            disabled={!image || isProcessing}
            onClick={handleReimagine}
            className={`
              w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
              ${!image || isProcessing 
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xl shadow-emerald-500/20'}
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Future...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Reimagine My Future</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Result Display */}
        <div className="lg:col-span-7">
          <div className="glass-panel h-full min-h-[500px] flex flex-col">
            <div className="p-6 border-bottom border-white/5 flex items-center justify-between">
              <h2 className="font-display font-semibold text-xl flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${selectedJob.color}`}></div>
                The Result
              </h2>
              {resultImage && (
                <button 
                  onClick={downloadImage}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  title="Download Image"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 relative p-6 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isProcessing ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-6 text-center"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <selectedJob.icon className="w-8 h-8 text-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Synthesizing Reality</h3>
                      <p className="text-zinc-500 max-w-xs">
                        Our AI is weaving your identity into the fabric of the {selectedJob.title} universe.
                      </p>
                    </div>
                  </motion.div>
                ) : resultImage ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full flex flex-col"
                  >
                    <div className="relative rounded-xl overflow-hidden shadow-2xl flex-1">
                      <img 
                        src={resultImage} 
                        alt="Transformed" 
                        className="w-full h-full object-contain bg-black/20"
                      />
                      
                      {/* QR Code Overlay */}
                      {shareId && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute bottom-4 right-4 p-3 bg-white rounded-xl shadow-2xl flex flex-col items-center gap-2"
                        >
                          <QRCodeCanvas value={shareUrl} size={120} level="M" />
                          <span className="text-[10px] font-bold text-black uppercase tracking-widest">Scan to Download</span>
                        </motion.div>
                      )}
                    </div>
                    <div className="mt-6 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                      </div>
                      <p className="text-sm text-zinc-300 italic">
                        "Your journey as a {selectedJob.title} begins today. The future looks bright."
                      </p>
                    </div>
                  </motion.div>
                ) : error ? (
                  <motion.div 
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center p-8"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                      <Loader2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Transformation Failed</h3>
                    <p className="text-zinc-500 mb-6">{error}</p>
                    <button 
                      onClick={handleReimagine}
                      className="px-6 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                    >
                      Try Again
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-400 mb-2">Ready for Transformation</h3>
                    <p className="text-zinc-600 max-w-xs mx-auto">
                      Select your dream job and click "Reimagine" to see your future self.
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-4 text-zinc-700">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center">1</div>
                        <span className="text-[10px] uppercase tracking-widest">Upload</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center">2</div>
                        <span className="text-[10px] uppercase tracking-widest">Select</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center">3</div>
                        <span className="text-[10px] uppercase tracking-widest">Behold</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mt-20 py-8 border-t border-zinc-900 text-center">
        <p className="text-zinc-600 text-sm flex items-center justify-center gap-2">
          Powered by <span className="text-zinc-400 font-semibold">Gemini 2.5 Flash</span>
          <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
          Built for the Future
        </p>
      </footer>
    </div>
  );
}
