
import React, { useState, useCallback, useRef } from 'react';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  onError: (message: string) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_FILE_TYPES = "image/*,.pdf,.doc,.docx,.html,.htm,.json,.csv";


const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelect, selectedFiles, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const validFiles: File[] = [];
    let errorMsg = null;

    Array.from(fileList).forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
            errorMsg = `Il file "${file.name}" supera la dimensione massima di 2MB.`;
        } else {
            validFiles.push(file);
        }
    });

    if (errorMsg) {
        onError(errorMsg);
        return;
    }
    
    if (validFiles.length > 0) {
        onFilesSelect(validFiles);
    }
  }, [onFilesSelect, onError]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
  };

  const handleDrag = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragIn = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }, [handleFiles]);

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  return (
    <div className="text-center w-full max-w-lg">
      <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
        Analizza Rapporto di Accessibilità
      </h2>
      <p className="mt-4 text-slate-400 max-w-xl mx-auto">
        Carica uno o più report (immagini, PDF, HTML, JSON, CSV) per creare un raggruppamento.
        <br/>
        Dimensione massima: 2MB per file.
      </p>
      <div
        className={`mt-8 p-8 border-2 border-dashed rounded-xl transition-colors duration-200 cursor-pointer ${isDragging ? 'border-sky-400 bg-sky-900/30' : 'border-slate-600 hover:border-slate-500'}`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
        aria-label="File upload drop zone"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={ACCEPTED_FILE_TYPES}
          multiple
        />
        <div className="flex flex-col items-center justify-center space-y-4 text-slate-400">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {selectedFiles.length > 0 ? (
             <div className="space-y-2">
                <p className="font-semibold text-slate-300">{selectedFiles.length} file selezionati:</p>
                <ul className="text-sm text-slate-500 max-h-32 overflow-y-auto">
                    {selectedFiles.map((f, i) => (
                        <li key={i} className="truncate max-w-[200px] mx-auto">{f.name}</li>
                    ))}
                </ul>
             </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-300">Trascina i file qui</p>
              <p className="text-sm">o clicca per selezionare (multiplo)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
