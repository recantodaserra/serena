
import React, { useState, useEffect } from 'react';
import { GalleryService, ChaletService } from '../services/storage';
import { Chalet, GalleryItem } from '../types';
import { PlayCircle, Video, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Gallery = () => {
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [c, g] = await Promise.all([ChaletService.getAll(), GalleryService.getAll()]);
      setChalets(c);
      setItems(g);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.chaletId === filter);

  if (loading) return <div className="min-h-screen pt-32 text-center text-gray-500">Carregando galeria...</div>;

  return (
    <div className="pt-24 pb-20 animate-fade-in">
       {/* Header */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h1 className="font-serif text-4xl md:text-5xl text-serra-dark mb-4">Nossa Galeria</h1>
          <div className="h-1 w-24 bg-serra-accent mx-auto rounded-full mb-6"></div>
          <p className="text-gray-600 max-w-2xl mx-auto font-light">
            Mergulhe na atmosfera do Recanto da Serra. Confira vídeos e fotos de nossos espaços.
          </p>
       </div>

       {/* Filtros */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex flex-wrap justify-center gap-3">
             <button 
               onClick={() => setFilter('all')}
               className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${filter === 'all' ? 'bg-serra-accent text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:border-serra-accent hover:text-serra-accent'}`}
             >
               Todos
             </button>
             <button 
                onClick={() => setFilter('general')}
                className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${filter === 'general' ? 'bg-serra-accent text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:border-serra-accent hover:text-serra-accent'}`}
             >
                Geral
             </button>
             {chalets.map(c => (
               <button 
                 key={c.id}
                 onClick={() => setFilter(c.id)}
                 className={`px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${filter === c.id ? 'bg-serra-accent text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-500 hover:border-serra-accent hover:text-serra-accent'}`}
               >
                 {c.name}
               </button>
             ))}
          </div>
       </div>

       {/* Grid */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
               <ImageIcon size={64} className="mx-auto text-gray-200 mb-4"/>
               <p className="text-gray-400">Nenhum item encontrado nesta categoria.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
               {filteredItems.map(item => (
                 <div key={item.id} className="break-inside-avoid bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group border border-gray-100">
                    <div className="relative">
                       {item.type === 'video' ? (
                          <div className="relative aspect-video">
                            <video 
                              src={item.url} 
                              controls 
                              className="w-full h-full object-cover" 
                              preload="metadata"
                            />
                          </div>
                       ) : (
                          <img src={item.url} className="w-full h-auto block transform group-hover:scale-105 transition-transform duration-700"/>
                       )}
                       
                       {/* Badge para saber de qual chalé é (se estiver vendo todos) */}
                       {filter === 'all' && item.chaletId !== 'general' && (
                         <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">
                            {chalets.find(c => c.id === item.chaletId)?.name}
                         </div>
                       )}
                    </div>
                    
                    {/* Descrição */}
                    {item.description && (
                      <div className="p-4 bg-white relative z-10">
                        <p className="text-sm text-gray-600 font-light leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    )}
                 </div>
               ))}
            </div>
          )}
       </div>
    </div>
  );
};

export default Gallery;
