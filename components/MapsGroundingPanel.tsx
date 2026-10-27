import React, { useState } from 'react';
import { searchMapsGrounding } from '../services/geminiService';
import { MapsGroundingResult, GroundedPlace } from '../types';
import { MapPinIcon, ExternalLinkIcon, CompassIcon, LoaderIcon, AlertIcon, SparklesIcon } from './Icons';

interface MapsGroundingPanelProps {
  onSelectScenery: (sceneryPrompt: string, placeTitle?: string) => void;
}

export const MapsGroundingPanel: React.FC<MapsGroundingPanelProps> = ({ onSelectScenery }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MapsGroundingResult | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const popularLocations = [
    'Cristo Redentor, Rio de Janeiro',
    'Praia de Copacabana, Brasil',
    'Torre Eiffel, Paris',
    'Cruzamento de Shibuya, Tóquio',
    'Times Square, Nova York',
    'Coliseu, Roma',
  ];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
      }
    );
  };

  const handleSearch = async (searchTerm?: string) => {
    const term = (searchTerm ?? query).trim();
    if (!term) {
      setError('Digite o nome de uma cidade, ponto turístico ou cenário.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await searchMapsGrounding(term, userCoords || undefined);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar informações no Google Maps.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyPlaceToPrompt = (place: GroundedPlace) => {
    const formatted = `No cenário real de ${place.title}${place.address ? ` (${place.address})` : ''}, com iluminação cinematográfica, atmosfera autêntica e detalhes visuais fiéis ao local.`;
    onSelectScenery(formatted, place.title);
  };

  const applyGeneralScenery = () => {
    if (!results || !results.text) return;
    const summary = `Cenário inspirado em "${query}": ${results.text.slice(0, 180)}... Iluminação natural realista e atmosfera detalhada do local.`;
    onSelectScenery(summary);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <MapPinIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Google Maps Grounding
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-normal">
                gemini-3.8-flash
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Descubra cenários reais para inserir seu personagem com fidelidade geográfica
            </p>
          </div>
        </div>

        <button
          onClick={handleGetLocation}
          title="Usar coordenadas atuais"
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
            userCoords
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <CompassIcon className="w-3.5 h-3.5" />
          {isLocating ? 'Obtendo GPS...' : userCoords ? 'GPS Ativo' : 'Perto de Mim'}
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ex: Praia de Copacabana, Torre Eiffel, Shibuya..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={isLoading || !query.trim()}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
        >
          {isLoading ? (
            <LoaderIcon className="w-4 h-4 animate-spin" />
          ) : (
            <SparklesIcon className="w-4 h-4" />
          )}
          <span>Pesquisar</span>
        </button>
      </div>

      {/* Sugestões populares de cenários */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-slate-500 uppercase font-semibold">Sugestões:</span>
        {popularLocations.map((loc) => (
          <button
            key={loc}
            onClick={() => {
              setQuery(loc);
              handleSearch(loc);
            }}
            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            {loc}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
          <AlertIcon className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-200">{error}</p>
        </div>
      )}

      {/* Resultados do Maps Grounding */}
      {results && (
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <MapPinIcon className="w-3.5 h-3.5" />
              Locais Verificados no Google Maps
            </span>
            <button
              onClick={applyGeneralScenery}
              className="text-[10px] text-slate-400 hover:text-emerald-300 transition-colors underline"
            >
              Usar visão geral no prompt
            </button>
          </div>

          {results.places && results.places.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {results.places.map((place, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">
                          {idx + 1}
                        </span>
                        {place.title}
                      </h4>
                      {place.uri && (
                        <a
                          href={place.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                          title="Abrir no Google Maps"
                        >
                          Google Maps
                          <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {place.address && (
                      <p className="text-[10px] text-slate-400 mt-0.5 ml-5">{place.address}</p>
                    )}
                    {place.snippet && (
                      <p className="text-[11px] text-slate-300 italic mt-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                        "{place.snippet}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => applyPlaceToPrompt(place)}
                    className="self-end text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1"
                  >
                    <SparklesIcon className="w-3 h-3" />
                    Inserir neste Cenário
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic bg-slate-950 p-3 rounded-xl border border-slate-800">
              {results.text || 'Nenhum ponto específico do mapa retornado.'}
            </p>
          )}

          {results.text && results.places.length > 0 && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed max-h-32 overflow-y-auto">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                Contexto Visual do Local:
              </span>
              {results.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
