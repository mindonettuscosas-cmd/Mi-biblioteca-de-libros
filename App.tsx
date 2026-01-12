
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
  
  const [filter, setFilter] = useState<'all' | 'read' | 'want-to-read'>('all');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authorBio, setAuthorBio] = useState<{name: string, bio: string} | null>(null);
  const [isLoadingBio, setIsLoadingBio] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carga inicial desde LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('libros_manual_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setBooks(parsed);
        }
      } catch (e) { 
        console.error("Error cargando localStorage:", e); 
      }
    }
  }, []);

  // Persistencia de tema
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Guardar estado de forma segura
  const saveState = (newBooks: Book[]) => {
    const sorted = [...newBooks].sort((a, b) => b.dateAdded - a.dateAdded);
    setBooks(sorted);
    localStorage.setItem('libros_manual_v1', JSON.stringify(sorted));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;
    setIsSearching(true);
    setSearchStatus('Gemini está diseñando la ficha y la portada con texto...');
    try {
      const result = await searchBookInfo(searchQuery);
      setPreviewBook(result);
    } catch (err) {
      alert('Error buscando información del libro.');
    } finally {
      setIsSearching(false);
    }
  };

  const addBookToLibrary = () => {
    if (!previewBook) return;
    
    const newBook: Book = {
      id: crypto.randomUUID(),
      title: previewBook.title,
      author: previewBook.author,
      year: previewBook.year,
      summary: previewBook.summary,
      tags: previewBook.tags,
      coverUrl: previewBook.tempBase64 || '',
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
    const newBooks = books.map(b => b.id === updatedBook.id ? updatedBook : b);
    saveState(newBooks);
    setEditingBook(null);
  };

  const exportLibrary = () => {
    if (books.length === 0) {
      alert("No hay libros para exportar.");
      return;
    }
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mi_biblioteca_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        
        if (Array.isArray(imported)) {
          // Validar que los objetos importados tengan estructura mínima
          const validBooks = imported.filter(b => b.title);
          
          if (validBooks.length > 0) {
            if (confirm(`Se han encontrado ${validBooks.length} libros. ¿Deseas importarlos a tu colección?`)) {
              // Asegurar que cada libro tenga un ID único si no lo tiene
              const processedBooks = validBooks.map(b => ({
                ...b,
                id: b.id || crypto.randomUUID(),
                dateAdded: b.dateAdded || Date.now(),
                status: b.status || 'want-to-read',
                rating: b.rating || 0
              }));

              // Combinar evitando duplicados por ID
              const existingIds = new Set(books.map(b => b.id));
              const uniqueNewBooks = processedBooks.filter(b => !existingIds.has(b.id));
              const updatedList = [...uniqueNewBooks, ...books];
              
              saveState(updatedList);
              alert(`${uniqueNewBooks.length} libros nuevos añadidos.`);
            }
          } else {
            alert("El archivo no contiene libros válidos.");
          }
        }
      } catch (err) {
        alert("Error: El archivo JSON no es válido.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const deleteBook = useCallback((id: string) => {
    // Implementación de la confirmación antes de borrar
    const confirmed = window.confirm("¿Estás seguro de que deseas eliminar este libro de tu biblioteca? Esta acción no se puede deshacer.");
    if (confirmed) {
      setBooks(prev => {
        const updated = prev.filter(b => b.id !== id);
        localStorage.setItem('libros_manual_v1', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setBooks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, status: (b.status === 'read' ? 'want-to-read' : 'read') as any } : b);
      localStorage.setItem('libros_manual_v1', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const rateBook = useCallback((id: string, rating: number) => {
    setBooks(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, rating } : b);
      localStorage.setItem('libros_manual_v1', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const filteredBooks = books.filter(b => filter === 'all' ? true : b.status === filter);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-500">
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

          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={exportLibrary} title="Exportar Biblioteca" className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-2">
              <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest">Exportar</span>
              📤
            </button>
            <button onClick={() => fileInputRef.current?.click()} title="Importar Biblioteca" className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors flex items-center gap-2">
              <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest">Importar</span>
              📥
            </button>
            <input type="file" ref={fileInputRef} onChange={importLibrary} accept=".json" className="hidden" />
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">{isDarkMode ? '🌙' : '☀️'}</button>
            <button onClick={() => setIsModalOpen(true)} className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xl hover:bg-indigo-700">Añadir Libro</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex gap-3 mb-12 overflow-x-auto no-scrollbar pb-2">
          {(['all', 'read', 'want-to-read'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-8 py-3 rounded-full text-xs font-bold transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500'}`}>
              {f === 'all' ? 'Todos' : f === 'read' ? 'Leídos' : 'Pendientes'}
            </button>
          ))}
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-32 bg-white dark:bg-slate-900/50 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Biblioteca vacía</p>
            <p className="text-slate-500 text-xs mt-2 uppercase">Presiona "Importar" para recuperar tu archivo JSON</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredBooks.map(book => (
              <BookCard 
                key={book.id} 
                book={book} 
                onDelete={deleteBook} 
                onToggleStatus={toggleStatus} 
                onRate={rateBook} 
                onEdit={() => setEditingBook(book)}
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
        )}
      </main>

      {/* Modales de Edición, Adición y Bio (se mantienen igual pero con consistencia de estilos) */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 sm:p-14 overflow-y-auto no-scrollbar max-h-[95vh]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black">Editar Libro</h3>
              <button onClick={() => setEditingBook(null)} className="text-slate-400 text-2xl">✕</button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Título</label>
                <input type="text" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Autor</label>
                <input type="text" value={editingBook.author} onChange={e => setEditingBook({...editingBook, author: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Resumen</label>
                <textarea rows={4} value={editingBook.summary} onChange={e => setEditingBook({...editingBook, summary: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Enlace Drive</label>
                <input type="text" value={editingBook.driveUrl || ''} onChange={e => setEditingBook({...editingBook, driveUrl: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs border-2 border-transparent focus:border-indigo-600 outline-none" />
              </div>
            </div>
            <div className="flex gap-6 mt-10">
              <button onClick={() => setEditingBook(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-xs">Cerrar</button>
              <button onClick={() => updateBook(editingBook)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-10 sm:p-14 overflow-y-auto no-scrollbar max-h-[95vh]">
            {!previewBook ? (
              <form onSubmit={handleSearch}>
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-black">Nuevo Libro</h3>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 text-2xl">✕</button>
                </div>
                <input autoFocus type="text" placeholder="Título o autor..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} disabled={isSearching} className="w-full p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl mb-10 text-2xl font-bold border-4 border-transparent focus:border-indigo-600 outline-none transition-all shadow-inner" />
                <div className="flex gap-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                  <button type="submit" disabled={isSearching || !searchQuery.trim()} className="flex-[2] py-6 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Generar IA</button>
                </div>
                {isSearching && <p className="mt-6 text-center text-indigo-600 text-xs font-black animate-pulse uppercase tracking-widest">{searchStatus}</p>}
              </form>
            ) : (
              <div className="animate-in slide-in-from-bottom duration-500">
                <div className="flex gap-10 mb-8 flex-col sm:flex-row">
                  <img src={previewBook.tempBase64} className="w-52 aspect-[2/3] object-cover rounded-[2rem] shadow-2xl mx-auto border-4 border-white dark:border-slate-800" />
                  <div className="flex-grow">
                    <h4 className="text-2xl font-black mb-1">{previewBook.title}</h4>
                    <p className="text-indigo-600 font-bold mb-4">{previewBook.author}</p>
                    <p className="text-slate-500 text-sm italic mb-6 leading-relaxed line-clamp-4">{previewBook.summary}</p>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Enlace Drive (opcional):</label>
                      <input type="text" value={manualDriveLink} onChange={e => setManualDriveLink(e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 ring-indigo-500" placeholder="Pega el link de Google Drive aquí..." />
                    </div>
                  </div>
                </div>
                <div className="flex gap-6">
                  <button onClick={() => setPreviewBook(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-xs">Atrás</button>
                  <button onClick={addBookToLibrary} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">Confirmar Guardado</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {authorBio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] p-12 shadow-2xl animate-in zoom-in">
            <h3 className="text-3xl font-black mb-6 text-indigo-600">{authorBio.name}</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-10 whitespace-pre-wrap">{isLoadingBio ? "Buscando biografía..." : authorBio.bio}</p>
            <button onClick={() => setAuthorBio(null)} className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
