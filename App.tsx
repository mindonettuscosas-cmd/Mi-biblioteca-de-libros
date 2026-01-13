
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
  
  const [filter, setFilter] = useState<'all' | 'read' | 'want-to-read' | 'reading'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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

  const allCategories = Array.from(new Set(books.flatMap(b => b.tags))).sort();

  const filteredBooks = books.filter(b => {
    const matchesStatus = filter === 'all' ? true : b.status === filter;
    const matchesCategory = categoryFilter === 'all' ? true : b.tags.includes(categoryFilter);
    return matchesStatus && matchesCategory;
  });

  const getDirectDriveLink = (url: string) => {
    if (!url) return null;
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
      if (match && match[1]) return `https://lh3.googleusercontent.com/u/0/d/${match[1]}`;
    }
    return url;
  };

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `biblioteca_libros.json`;
    link.click();
  };

  const exportToPDF = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Mi Biblioteca - Exportación</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1e293b; }
            h1 { text-align: center; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
            .filter-info { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 30px; }
            .book-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .book-item { border: 1px solid #e2e8f0; padding: 20px; border-radius: 15px; display: flex; gap: 20px; break-inside: avoid; }
            .cover { width: 100px; height: 150px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .info { flex: 1; }
            .title { font-weight: 800; font-size: 16px; margin: 0; }
            .author { color: #4f46e5; font-weight: 700; font-size: 14px; margin: 4px 0; }
            .year { color: #94a3b8; font-size: 12px; font-weight: bold; }
            .summary { font-size: 11px; color: #475569; margin-top: 10px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
            .rating { color: #f59e0b; margin-top: 8px; font-size: 14px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>Catálogo de Biblioteca</h1>
          <p class="filter-info">Categoría: ${categoryFilter.toUpperCase()} | Estado: ${filter.toUpperCase()}</p>
          <div class="book-grid">
            ${filteredBooks.map(b => `
              <div class="book-item">
                <img src="${getDirectDriveLink(b.driveUrl || '') || b.coverUrl || ''}" class="cover" />
                <div class="info">
                  <p class="year">${b.year}</p>
                  <h2 class="title">${b.title}</h2>
                  <p class="author">${b.author}</p>
                  <div class="rating">${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)}</div>
                  <div class="summary">${b.summary}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 1000); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const importLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          saveState([...imported, ...books].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
          alert('Importación exitosa');
        }
      } catch (err) { alert("Error en JSON"); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-500 pb-20">
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase hidden sm:block italic">Mi Biblioteca</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={exportToJSON} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center gap-2">
              <span className="hidden md:inline text-[9px] font-bold uppercase">Guardar JSON</span>
              💾
            </button>
            <button onClick={exportToPDF} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-2">
              <span className="hidden md:inline text-[9px] font-bold uppercase">PDF</span>
              📄
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 transition-all flex items-center gap-2">
              <span className="hidden md:inline text-[9px] font-bold uppercase">Abrir</span>
              📥
            </button>
            <input type="file" ref={fileInputRef} onChange={importLibrary} accept=".json" className="hidden" />
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">{isDarkMode ? '🌙' : '☀️'}</button>
            <button onClick={() => setIsModalOpen(true)} className="ml-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Añadir</button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {(['all', 'read', 'reading', 'want-to-read'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 rounded-full text-[10px] font-bold transition-all border whitespace-nowrap ${filter === f ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                {f === 'all' ? 'Todos' : f === 'read' ? 'Leídos' : f === 'reading' ? 'Leyendo' : 'Pendientes'}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-56">
             <select 
               value={categoryFilter} 
               onChange={(e) => setCategoryFilter(e.target.value)}
               className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[10px] font-bold text-slate-500 appearance-none focus:ring-2 ring-indigo-500 outline-none"
             >
               <option value="all">Todas las Categorías</option>
               {allCategories.map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
             </select>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
          {filteredBooks.map(book => (
            <BookCard 
              key={book.id} 
              book={book} 
              onDelete={(id) => saveState(books.filter(b => b.id !== id))} 
              onToggleStatus={(id) => {
                const nextStatus: Book['status'] = book.status === 'want-to-read' ? 'reading' : (book.status === 'reading' ? 'read' : 'want-to-read');
                saveState(books.map(b => b.id === id ? {...b, status: nextStatus} : b));
              }} 
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
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Categorías (separadas por coma)</label>
                  <input 
                    type="text" 
                    value={editingBook.tags.join(', ')} 
                    onChange={e => setEditingBook({...editingBook, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})} 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-bold border-2 border-transparent focus:border-indigo-600 outline-none"
                    placeholder="Ej: Misterio, Thriller, Historia"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Estado</label>
                  <select 
                    value={editingBook.status} 
                    onChange={e => setEditingBook({...editingBook, status: e.target.value as Book['status']})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl font-bold outline-none"
                  >
                    <option value="want-to-read">Pendiente</option>
                    <option value="reading">Leyendo</option>
                    <option value="read">Leído</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => updateBook(editingBook)} className="flex-grow py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Guardar</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="flex gap-6 items-start">
                    <img src={getDirectDriveLink(selectedBookForBio!.driveUrl || '') || selectedBookForBio!.coverUrl} className="w-32 aspect-[2/3] object-cover rounded-xl shadow-md" />
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
