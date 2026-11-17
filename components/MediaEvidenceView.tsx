
import React, { useRef, useState } from 'react';
import { AuditMedia } from '../types';

interface MediaEvidenceViewProps {
  mediaList: AuditMedia[];
  onAddMedia: (media: AuditMedia) => void;
  onUpdateMedia: (id: string, updates: Partial<AuditMedia>) => void;
  onDeleteMedia: (id: string) => void;
}

const MediaEvidenceView: React.FC<MediaEvidenceViewProps> = ({ mediaList, onAddMedia, onUpdateMedia, onDeleteMedia }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsProcessing(true);
    const files: File[] = Array.from(e.target.files);

    for (const file of files) {
        // Basic type detection
        let type: 'image' | 'video' | 'audio' = 'image';
        if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type.startsWith('image/')) type = 'image';
        else continue; // Skip unsupported

        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const res = reader.result as string;
                    resolve(res.split(',')[1]); // Keep only data
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const newMedia: AuditMedia = {
                id: crypto.randomUUID(),
                fileName: file.name,
                mimeType: file.type,
                type: type,
                base64Data: base64,
                caption: '',
                description: '',
                timestamp: Date.now()
            };
            
            onAddMedia(newMedia);

        } catch (err) {
            console.error("Error reading media file", err);
            alert(`Impossibile caricare ${file.name}`);
        }
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsProcessing(false);
  };

  const getMediaSource = (media: AuditMedia) => {
      return `data:${media.mimeType};base64,${media.base64Data}`;
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
            <div>
                <h2 className="text-2xl font-bold text-white">Media & Evidenze</h2>
                <p className="text-slate-400 text-sm mt-1">Carica screenshot, video o audio per documentare i problemi riscontrati.</p>
            </div>
            
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isProcessing ? (
                     <span className="block h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                )}
                Aggiungi Media
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*,audio/*"
                multiple
                onChange={handleFileSelect}
            />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {mediaList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-500">Nessun media caricato.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {mediaList.map((media) => (
                        <div key={media.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-6 group">
                            
                            {/* PREVIEW SECTION */}
                            <div className="w-full md:w-1/3 lg:w-1/4 flex-shrink-0 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden min-h-[200px] border border-slate-700/50">
                                {media.type === 'image' && (
                                    <img 
                                        src={getMediaSource(media)} 
                                        alt={media.fileName} 
                                        className="max-w-full max-h-[300px] object-contain" 
                                    />
                                )}
                                {media.type === 'video' && (
                                    <video controls className="max-w-full max-h-[300px]">
                                        <source src={getMediaSource(media)} type={media.mimeType} />
                                        Il tuo browser non supporta il tag video.
                                    </video>
                                )}
                                {media.type === 'audio' && (
                                    <div className="w-full px-4 text-center">
                                        <div className="mb-3 text-indigo-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                            </svg>
                                        </div>
                                        <audio controls className="w-full h-8">
                                            <source src={getMediaSource(media)} type={media.mimeType} />
                                        </audio>
                                    </div>
                                )}
                            </div>

                            {/* DETAILS SECTION */}
                            <div className="flex-1 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{media.type}</span>
                                        <span className="text-sm font-mono text-slate-400 break-all">{media.fileName}</span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if(confirm('Eliminare questo file?')) onDeleteMedia(media.id);
                                        }}
                                        className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-700/50 rounded transition-colors"
                                        title="Elimina"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="mt-2 space-y-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Didascalia (breve)</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="Es. Screenshot Focus Mancante Home"
                                            value={media.caption}
                                            onChange={(e) => onUpdateMedia(media.id, { caption: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Descrizione (dettagliata)</label>
                                        <textarea 
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                                            placeholder="Descrivi cosa mostra il media e perché è rilevante per la remediation..."
                                            value={media.description}
                                            onChange={(e) => onUpdateMedia(media.id, { description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default MediaEvidenceView;
