import React, { useState } from 'react';
import { GeneratedImage, ReferenceImage, GenerationConfig, AspectRatioType, ImageSizeType } from './types';
import { generateOrEditImage } from './services/geminiService';
import MultiReferenceUploader from './components/ReferenceUploader';
import { MapsGroundingPanel } from './components/MapsGroundingPanel';
import { WandIcon, DownloadIcon, LoaderIcon, AlertIcon, ImageIcon, SparklesIcon } from './components/Icons';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>('edit');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [config, setConfig] = useState<GenerationConfig>({
    aspectRatio: '1:1',
    imageSize: '1K',
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Por favor, descreva a imagem ou cena desejada.');
      return;
    }

    if (activeTab === 'edit' && referenceImages.length === 0) {
      setError('No modo de edição/identidade consistente, adicione ao menos uma imagem de referência.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // If in edit mode, send reference images; otherwise, generate from text prompt only
      const refs = activeTab === 'edit' ? referenceImages : [];
      const result = await generateOrEditImage(prompt, refs, config);
      setGeneratedImages((prev) => [result, ...prev]);
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'Erro ao processar imagem com gemini-nano-banana-2.1.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSceneryFromMaps = (sceneryText: string, placeTitle?: string) => {
    setPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return sceneryText;
      }
      return `${trimmed}. Ambientado em: ${sceneryText}`;
    });
  };

  const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `personagen-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const useAsReference = async (imgUrl: string) => {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const file = new File([blob], `ref-${Date.now()}.png`, { type: blob.type || 'image/png' });
      const base64 = imgUrl.split(',')[1] || '';

      const newRef: ReferenceImage = {
        file,
        previewUrl: imgUrl,
        base64,
        mimeType: blob.type || 'image/png',
      };

      setReferenceImages((prev) => (prev.length < 3 ? [...prev, newRef] : [newRef, prev[0], prev[1]]));
      setActiveTab('edit');
    } catch (e) {
      console.error('Failed to convert image to reference:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-slate-950/85 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <WandIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white">PersonaGen</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono px-1.5 py-0.5 rounded font-medium">
                  gemini-nano-banana-2.1
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Criação & Edição de Imagens + Google Maps Grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden md:inline font-mono text-[11px]">Maps: gemini-3.8-flash</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Creation/Editing Controls & Maps Grounding */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('edit')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <WandIcon className="w-3.5 h-3.5" />
              Editar / Identidade ({referenceImages.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              Criar do Zero (Texto)
            </button>
          </div>

          {/* References Section (Visible when in Edit / Identity Mode) */}
          {activeTab === 'edit' && (
            <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-[10px]">
                    1
                  </span>
                  Fotos de Referência ({referenceImages.length}/3)
                </h2>
                <span className="text-[11px] text-slate-500">Mantém traços do rosto e estilo</span>
              </div>
              <MultiReferenceUploader
                references={referenceImages}
                onImagesUpdate={setReferenceImages}
              />
            </section>
          )}

          {/* Prompt & Scenery Formulation */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-[10px]">
                  {activeTab === 'edit' ? '2' : '1'}
                </span>
                {activeTab === 'edit' ? 'Descrição da Nova Cena / Edição' : 'Prompt Criativo da Imagem'}
              </h2>
              {prompt && (
                <button
                  onClick={() => setPrompt('')}
                  className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'edit'
                  ? 'Ex: no centro do Cristo Redentor ao entardecer, iluminação dourada e visual realista de alta resolução...'
                  : 'Ex: um viajante futurista caminhando pelas ruas de Shibuya à noite com reflexos de néon na chuva, fotorrealista 4K...'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-100 focus:ring-1 focus:ring-cyan-500 outline-none transition-all h-28 resize-none placeholder-slate-500 leading-relaxed"
            />

            {/* Config: Format (Aspect Ratio) & Resolution (Image Size) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Proporção (Aspect Ratio)
                </label>
                <select
                  value={config.aspectRatio}
                  onChange={(e) => setConfig({ ...config, aspectRatio: e.target.value as AspectRatioType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="1:1">1:1 (Quadrado)</option>
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="9:16">9:16 (Story / Reels)</option>
                  <option value="4:3">4:3 (Fotografia Padrão)</option>
                  <option value="3:4">3:4 (Retrato)</option>
                  <option value="4:1">4:1 (Banner Ultra Panorâmico)</option>
                  <option value="1:4">1:4 (Ultra Vertical)</option>
                  <option value="8:1">8:1 (Faixa Panorâmica)</option>
                  <option value="1:8">1:8 (Faixa Vertical)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Resolução (nano-banana-2.1)
                </label>
                <select
                  value={config.imageSize}
                  onChange={(e) => setConfig({ ...config, imageSize: e.target.value as ImageSizeType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="1K">1K (Padrão Rápido)</option>
                  <option value="2K">2K (Alta Resolução)</option>
                  <option value="4K">4K (Qualidade Máxima)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                <AlertIcon className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-200 leading-snug">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || (activeTab === 'edit' && referenceImages.length === 0)}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transform active:scale-[0.99]"
            >
              {isGenerating ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Processando com gemini-nano-banana-2.1...
                </>
              ) : (
                <>
                  <WandIcon className="w-4 h-4" />
                  {activeTab === 'edit' ? 'Editar / Gerar Personagem' : 'Criar Nova Imagem'}
                </>
              )}
            </button>
          </section>

          {/* Google Maps Grounding Feature */}
          <MapsGroundingPanel onSelectScenery={handleSelectSceneryFromMaps} />
        </div>

        {/* Right Column: Creation Gallery & Details */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="text-cyan-400 w-5 h-5" />
                <h2 className="text-lg font-bold text-white">Galeria de Criações</h2>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
                {generatedImages.length} {generatedImages.length === 1 ? 'ITEM' : 'ITENS'}
              </span>
            </div>

            {generatedImages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-600 mb-4">
                  <ImageIcon className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300 mb-1">Nenhuma imagem criada ainda</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Escolha um cenário real no Google Maps Grounding ou envie fotos de referência para criar ou editar imagens com <strong>gemini-nano-banana-2.1</strong>.
                </p>
                <div className="flex flex-wrap gap-2 justify-center text-[11px] text-slate-400">
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                    ⚡ Formatos de 1:1 até 8:1
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                    🔍 Locais reais com Maps
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                    ✨ Resolução 1K a 4K
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generatedImages.map((img) => (
                  <div
                    key={img.id}
                    className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all hover:border-cyan-500/40 flex flex-col"
                  >
                    <div className="relative overflow-hidden bg-slate-950 flex items-center justify-center min-h-[260px]">
                      <img
                        src={img.url}
                        alt={img.prompt}
                        className="w-full h-full max-h-[420px] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 p-1.5 rounded-xl backdrop-blur-sm border border-slate-700">
                        <button
                          onClick={() => useAsReference(img.url)}
                          title="Usar como referência para nova edição"
                          className="p-1.5 text-slate-300 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <WandIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadImage(img.url, img.id)}
                          title="Baixar imagem em alta resolução"
                          className="p-1.5 text-slate-300 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {(img.aspectRatio || img.imageSize) && (
                        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 border border-slate-800">
                          {img.aspectRatio || '1:1'} • {img.imageSize || '1K'}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-900/90 flex-1 flex flex-col justify-between border-t border-slate-800">
                      <p className="text-xs text-slate-200 line-clamp-3 mb-3 leading-relaxed">
                        "{img.prompt}"
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 font-mono">
                        <span>gemini-nano-banana-2.1</span>
                        <span>{new Date(img.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
