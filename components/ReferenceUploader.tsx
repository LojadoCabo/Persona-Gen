
import React, { useRef } from 'react';
import { ReferenceImage } from '../types';
import { UploadIcon, TrashIcon } from './Icons';

interface ReferenceUploaderProps {
  references: ReferenceImage[];
  onImagesUpdate: (images: ReferenceImage[]) => void;
}

const MultiReferenceUploader: React.FC<ReferenceUploaderProps> = ({ references, onImagesUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 3 - references.length;
    // Explicitly cast to File[] to fix inference issues in different environments
    const filesToProcess: File[] = Array.from(files).slice(0, remainingSlots) as File[];

    const newImages: ReferenceImage[] = [];

    for (const file of filesToProcess) {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        // Correctly pass the file as a Blob/File
        reader.readAsDataURL(file);
      });

      const match = base64Data.match(/^data:(.+);base64,(.*)$/);
      if (match) {
        newImages.push({
          file,
          previewUrl: base64Data,
          mimeType: match[1],
          base64: match[2],
        });
      }
    }

    onImagesUpdate([...references, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const updated = [...references];
    updated.splice(index, 1);
    onImagesUpdate(updated);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => {
          const image = references[index];
          return (
            <div 
              key={index} 
              className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all ${
                image 
                ? 'border-slate-700 bg-slate-800' 
                : 'border-dashed border-slate-800 bg-slate-900/50 hover:border-cyan-500/50 cursor-pointer'
              }`}
              onClick={() => !image && fileInputRef.current?.click()}
            >
              {image ? (
                <>
                  <img 
                    src={image.previewUrl} 
                    alt={`Ref ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-sm"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UploadIcon className="w-6 h-6 text-slate-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {references.length < 3 && (
        <p className="text-[10px] text-center text-slate-500 uppercase tracking-tighter">
          Adicione até {3 - references.length} mais fotos para maior precisão
        </p>
      )}

      <input 
        ref={fileInputRef}
        type="file" 
        multiple
        accept="image/*" 
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default MultiReferenceUploader;