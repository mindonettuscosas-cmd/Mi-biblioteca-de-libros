
import React from 'react';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onRate: (id: string, rating: number) => void;
  onAuthorClick: (author: string) => void;
  onEdit: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onDelete, onToggleStatus, onRate, onAuthorClick, onEdit }) => {
  
  const getDirectDriveLink = (url: string) => {
    if (!url) return null;
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/(.+?)\/(view|edit)?/) || url.match(/id=(.+?)(&|$)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
      }
    }
    return url;
  };

  const driveImg = getDirectDriveLink(book.driveUrl || '');
  // Priorizar imagen de Drive, luego base64 local, y finalmente un placeholder con el título.
  const displayCover = driveImg || book.coverUrl || `https://via.placeholder.com/400x600/4f46e5/ffffff?text=${encodeURIComponent(book.title)}`;

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-800 flex flex-col h-full">
      <div className="relative aspect-[2/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img 
          src={displayCover} 
          alt={book.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://via.placeholder.com/400x600/4f46e5/ffffff?text=${encodeURIComponent(book.title)}`;
          }}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 gap-2">
           {book.driveUrl && (
             <a href={book.driveUrl} target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg hover:bg-indigo-700 transition-colors">Ver en Drive</a>
           )}
           <button onClick={onEdit} className="w-full py-3 bg-white/20 backdrop-blur-md text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/40 transition-colors">Editar Datos</button>
        </div>

        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md z-10 ${
          book.status === 'read' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
        }`}>
          {book.status === 'read' ? 'Leído' : 'Pendiente'}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2">{book.title}</h3>
          <button onClick={() => onAuthorClick(book.author)} className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline text-left">{book.author}</button>
        </div>
        
        {book.status === 'read' && (
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => onRate(book.id, star)} className={`transition-colors ${star <= book.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 space-y-2">
          <button onClick={() => onToggleStatus(book.id)} className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${book.status === 'read' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white shadow-md'}`}>
            {book.status === 'read' ? 'Leído' : '¿Terminado?'}
          </button>
          <button 
            onClick={() => onDelete(book.id)} 
            className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
          >
            Eliminar Libro
          </button>
        </div>
      </div>
    </div>
  );
};
