
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Book } from './types';
import { BookCard } from './components/BookCard';
import { searchBookInfo, getAuthorBio } from './geminiService';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [previewBook, setPreviewBook] = useState<any>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [manualDriveLink, setManualDriveLink] = useState('');
  const [selectedBookForBio, setSelectedBookForBio] = useState<Book | null>(null);
  
  const [filter, setFilter] = useState<'all' | 'read' | 'want-to-read'>('all');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authorBio, setAuthorBio] = useState<{name: string, bio: string} | null>(null);
  const [isLoadingBio, setIsLoadingBio] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('libros_manual_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setBooks(parsed);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const saveState = (newBooks: Book[]) => {
    const sorted = [...newBooks].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    setBooks(sorted);
    localStorage.setItem('libros_manual_v1', JSON.stringify(sorted));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchStatus('Consultando IA y diseñando portada...');
    try {
      const result = await searchBookInfo(searchQuery);
      setPreviewBook(result);
    } catch (err) {
      alert('Error buscando información.');
    } finally {
      setIsSearching(false);
    }
  };

  const downloadImage = () => {
    if (!previewBook?.tempBase64) return;
    const link = document.createElement('a');
    link.href = previewBook.tempBase64;
    link.download = `portada_${previewBook.title.replace(/\s+/g, '_')}.png`;
    link.click();
  };

  const addBookToLibrary = () => {
    if (!previewBook) return;
    const newBook: Book = {
      id: crypto.randomUUID(),
      title: previewBook.title || 'Sin título',
      author: previewBook.author || 'Autor desconocido',
      year: previewBook.year || '',
      summary: previewBook.summary || '',
      tags: previewBook.tags || [],
      coverUrl: manualDriveLink ? '' : (previewBook.tempBase64 || ''),
      driveUrl: manualDriveLink,
      status: 'want-to-read',
      rating: 0,
      dateAdded: Date.now()
    };
    saveState([newBook, ...books]);
    setPreviewBook(null);
    setManualDriveLink('');
    setSearchQuery('');
    setIsModalOpen(false);
  };

  const updateBook = (updatedBook: Book) => {
    const cleanedBook = {
      ...updatedBook,
      coverUrl: updatedBook.driveUrl ? '' : updatedBook.coverUrl
    };
    const newBooks = books.map(b => b.id === cleanedBook.id ? cleanedBook : b);
    saveState(newBooks);
    setEditingBook(null);
  };

  const importLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const processed = imported.map(b => ({
            id: b.id || crypto.randomUUID(),
            title: b.title || b.título || 'Sin título',
            author: b.author || b.autor || 'Autor desconocido',
            year: b.year || b.año || '',
            summary: b.summary || b.resumen || '',
            tags: b.tags || b.etiquetas || [],
            driveUrl: b.driveUrl || b.enlaceDrive || '',
            coverUrl: (b.driveUrl || b.enlaceDrive) ? '' : (b.coverUrl || b.carátula || ''),
            status: (b.status || b.estado === 'leído' ? 'read' : 'want-to-read'),
            rating: b.rating || b.calificación || 0,
            dateAdded: b.dateAdded || b["fecha de adición"] || Date.now()
          }));
          saveState([...processed, ...books].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
          alert('Importación exitosa');
        }
      } catch (err) { alert("Error en JSON"); }
    };
    reader.readAsText(file);
  };

  const filteredBooks = books.filter(b => filter === 'all' ? true : b.status === filter);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-500 pb-20">
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase hidden sm:block italic">Mi Biblioteca</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
               const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
               const url = URL.createObjectURL(blob);
               const link = document.createElement('a');
               link.href = url;
               link.download = `biblioteca.json`;
               link.click();
            }} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 transition-all flex items-center gap-2">
              <span className="hidden md:inline text-[10px] font-bold uppercase">Exportar</span>
              📤
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 transition-all flex items-center gap-2">
              <span className="hidden md:inline text-[10px] font-bold uppercase">Importar</span>
              📥
            </button>
            <input type="file" ref={fileInputRef} onChange={importLibrary} accept=".json" className="hidden" />
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">{isDarkMode ? '🌙' : '☀️'}</button>
            <button onClick={() => setIsModalOpen(true)} className="ml-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Nuevo Libro</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-3 mb-12 overflow-x-auto no-scrollbar pb-2">
          {(['all', 'read', 'want-to-read'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-8 py-3 rounded-full text-xs font-bold transition-all border ${filter === f ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
              {f === 'all' ? 'Todos' : f === 'read' ? 'Leídos' : 'Pendientes'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredBooks.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              onDelete={(id) => saveState(books.filter(b => b.id !== id))} 
              onToggleStatus={(id) => saveState(books.map(b => b.id === id ? {...b, status: b.status === 'read' ? 'want-to-read' : 'read'} : b))} 
              onRate={(id, r) => saveState(books.map(b => b.id === id ? {...b, rating: r} : b))} 
              onEdit={() => setEditingBook(book)}
              onReadMore={() => setSelectedBookForBio(book)}
              onAuthorClick={async (a) => {
                setAuthorBio({ name: a, bio: '' });
                setIsLoadingBio(true);
                const bio = await getAuthorBio(a);
                setAuthorBio({ name: a, bio });
                setIsLoadingBio(false);
              }} 
            />
          ))}
        </div>
      </main>

      {/* Modal Edición / Detalles */}
      {(editingBook || selectedBookForBio) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 sm:p-12 overflow-y-auto max-h-[90vh] no-scrollbar border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black italic">{editingBook ? 'Editar Libro' : 'Detalles'}</h3>
              <button onClick={() => {setEditingBook(null); setSelectedBookForBio(null);}} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">✕</button>
            </div>
            
            {editingBook ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Título</label>
                    <input type="text" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Año</label>
                    <input type="text" value={editingBook.year} onChange={e => setEditingBook({...editingBook, year: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Autor</label>
                  <input type="text" value={editingBook.author} onChange={e => setEditingBook({...editingBook, author: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Resumen / Notas</label>
                  <textarea rows={6} value={editingBook.summary} onChange={e => setEditingBook({...editingBook, summary: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-transparent focus:border-indigo-600 outline-none text-sm leading-relaxed" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Enlace Drive (Prioridad)</label>
                  <input type="text" value={editingBook.driveUrl || ''} onChange={e => setEditingBook({...editingBook, driveUrl: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm border-2 border-transparent focus:border-indigo-600 outline-none" placeholder="https://drive.google.com/..." />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => updateBook(editingBook)} className="flex-grow py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Guardar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="flex gap-6 items-start">
                    <img src={selectedBookForBio!.driveUrl ? `https://lh3.googleusercontent.com/u/0/d/${selectedBookForBio!.driveUrl.match(/\/d\/(.+?)\//)?.[1]}` : selectedBookForBio!.coverUrl} className="w-32 aspect-[2/3] object-cover rounded-xl shadow-md" />
                    <div>
                      <h4 className="text-xl font-black">{selectedBookForBio!.title} ({selectedBookForBio!.year})</h4>
                      <p className="text-indigo-600 font-bold mb-4">{selectedBookForBio!.author}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedBookForBio!.tags.map(t => <span key={t} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold rounded-md uppercase">{t}</span>)}
                      </div>
                    </div>
                 </div>
                 <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 italic">{selectedBookForBio!.summary}</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nuevo Libro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800">
            {!previewBook ? (
              <form onSubmit={handleSearch}>
                <h3 className="text-2xl font-black italic mb-8">Consultar Libro</h3>
                <input autoFocus type="text" placeholder="Título o autor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={isSearching} className="w-full p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-8 text-xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none shadow-inner" />
                <div className="flex gap-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-black uppercase text-[10px]">Cerrar</button>
                   <button type="submit" disabled={isSearching || !searchQuery.trim()} className="flex-[2] py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg disabled:opacity-50">Generar Ficha</button>
                </div>
                {isSearching && <p className="mt-4 text-center text-indigo-600 text-[10px] font-black animate-pulse uppercase tracking-widest">{searchStatus}</p>}
              </form>
            ) : (
              <div className="animate-in slide-in-from-bottom duration-300">
                <div className="flex gap-8 mb-8 flex-col sm:flex-row items-center sm:items-start">
                  <div className="relative group shrink-0">
                    <img src={previewBook.tempBase64} className="w-40 aspect-[2/3] object-cover rounded-2xl shadow-xl border-2 border-white dark:border-slate-700" />
                    <button onClick={downloadImage} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-black uppercase p-2 text-center">
                       <span>⬇️ Descargar</span>
                       <span>Portada IA</span>
                    </button>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-xl font-black">{previewBook.title}</h4>
                      <span className="text-slate-400 font-bold text-xs">{previewBook.year}</span>
                    </div>
                    <p className="text-indigo-600 font-bold mb-4 text-sm">{previewBook.author}</p>
                    <p className="text-slate-500 text-[11px] italic mb-6 leading-relaxed line-clamp-3">{previewBook.summary}</p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 italic">Pega aquí el link de Drive tras subir la portada:</label>
                      <input type="text" value={manualDriveLink} onChange={e => setManualDriveLink(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] outline-none focus:ring-2 ring-indigo-500" placeholder="https://drive.google.com/..." />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setPreviewBook(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-black uppercase text-[10px]">Atrás</button>
                  <button onClick={addBookToLibrary} className="flex-[2] py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Confirmar Registro</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {authorBio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-2xl font-black mb-4 text-indigo-600">{authorBio.name}</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8 italic whitespace-pre-wrap">{isLoadingBio ? "Consultando biografía..." : authorBio.bio}</p>
            <button onClick={() => setAuthorBio(null)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px]">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
