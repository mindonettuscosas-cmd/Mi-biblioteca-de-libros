
export interface Book {
  id: string;
  title: string;
  author: string;
  year: string;
  summary: string;
  tags: string[];
  coverUrl: string; // URL temporal o base64 inicial
  driveUrl?: string; // El enlace manual de Google Drive
  status: 'read' | 'want-to-read' | 'reading' | 'abandoned' | 're-reading';
  rating: number; 
  dateAdded: number;
}

export interface SearchResult {
  title: string;
  author: string;
  year: string;
  summary: string;
  tags: string[];
  coverUrl: string;
}
