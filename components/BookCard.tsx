
import React, { useState, useEffect } from 'react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onAuthorClick: (author: string) => void;
  onEdit: () => void;
  onReadMore: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onDelete, onToggleStatus, onRate, onAuthorClick, onEdit, onReadMore }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let timeout: number;
    if (isConfirming) {
      timeout = window.setTimeout(() => setIsConfirming(false), 3000);
    }
    return () => timeout && window.clearTimeout(timeout);
  }, [isConfirming]);

  const getDirectDriveLink = (url: string) => {
    if (!url) return null;
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
      if (match && match[1]) return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
    }
    return url;
  };

  const driveImg = getDirectDriveLink(book.driveUrl || '');
  const displayCover = driveImg || book.coverUrl || `https://via.placeholder.com/400x600/4f46e5/ffffff?text=${encodeURIComponent(book.title)}`;

  const getStatusConfig = (status: Book['status']) => {
    switch(status) {
      case 'read': return { label: 'Leído', color: 'bg-emerald-500', btnLabel: 'Releer' };
      case 'reading': return { label: 'Leyendo', color: 'bg-indigo-500', btnLabel: 'Terminar' };
      case 're-reading': return { label: 'Releído', color: 'bg-purple-500', btnLabel: 'Abandonar' };
      case 'abandoned': return { label: 'Abandonado', color: 'bg-slate-500', btnLabel: 'Reiniciar' };
      default: return { label: 'Pendiente', color: 'bg-amber-500', btnLabel: 'Empezar' };
    }
  };

  const statusConfig = getStatusConfig(book.status);

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500 border border-slate-200 dark:border-slate-800 flex flex-col h-full">
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img 
          src={displayCover} 
          alt={book.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x600/4f46e5/ffffff?text=${encodeURIComponent(book.title)}`; }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-1.5">
           <button onClick={onReadMore} className="w-full py-2 bg-white text-indigo-900 rounded-lg text-[8px] font-black uppercase tracking-widest shadow hover:bg-slate-100 transition-colors">Sinopsis</button>
           <button onClick={onEdit} className="w-full py-2 bg-white/20 backdrop-blur-md text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-white/40 transition-colors">Editar</button>
        </div>

        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider shadow-md backdrop-blur-md z-10 text-white ${statusConfig.color}`}>
          {statusConfig.label}
        </div>
      </div>
      
      <div className="p-3 flex flex-col flex-grow">
        <div className="mb-2">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-0.5 line-clamp-1">{book.title}</h3>
          <div className="flex flex-col">
            <button onClick={() => onAuthorClick(book.author)} className="text-indigo-600 dark:text-indigo-400 text-[9px] font-semibold hover:underline text-left truncate">{book.author}</button>
            <span className="text-slate-400 font-bold text-[7px] uppercase tracking-wider">{book.year || 'S/A'}</span>
          </div>
        </div>
        
        <div className="flex gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => onRate(book.id, star)} className={`transition-colors transform active:scale-125 ${star <= book.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700 hover:text-amber-200'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {book.tags.slice(0, 2).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[7px] font-bold rounded uppercase truncate max-w-full">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-2 space-y-1">
          <button onClick={() => onToggleStatus(book.id)} className={`w-full py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
            book.status === 'reading' ? 'bg-indigo-600 text-white shadow-sm' : 
            book.status === 'read' ? 'bg-emerald-600 text-white shadow-sm' : 
            book.status === 're-reading' ? 'bg-purple-600 text-white shadow-sm' :
            book.status === 'abandoned' ? 'bg-slate-600 text-white shadow-sm' :
            'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
          }`}>
            {statusConfig.btnLabel}
          </button>
          <button onClick={() => isConfirming ? onDelete(book.id) : setIsConfirming(true)} className={`w-full py-1.5 text-[7px] font-black uppercase tracking-widest transition-all duration-300 rounded-md ${isConfirming ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-500'}`}>
            {isConfirming ? 'Confirmar' : 'Borrar'}
          </button>
        </div>
      </div>
    </div>
  );
};
