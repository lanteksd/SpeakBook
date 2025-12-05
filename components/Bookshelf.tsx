
import React, { useRef } from 'react';
import { Book } from '../types';
import { UploadIcon, BookOpenIcon, EditIcon, TrashIcon } from './icons';

interface BookshelfProps {
  books: Book[];
  isLoading: boolean;
  onSelectBook: (book: Book) => void;
  onAddBook: (file: File) => void;
  onUpdateCover: (bookId: string, newCoverImage: string) => void;
  onDeleteBook: (bookId: string) => void;
}

const BookCard: React.FC<{ 
  book: Book; 
  onSelect: () => void;
  onUpdateCover: (bookId: string, newCoverImage: string) => void;
  onDeleteBook: (bookId: string) => void;
}> = ({ book, onSelect, onUpdateCover, onDeleteBook }) => {
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpdateCover(book.id, event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    coverInputRef.current?.click();
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteBook(book.id);
  }

  return (
    <div className="group relative cursor-pointer flex flex-col items-center space-y-2">
      <div onClick={onSelect} className="aspect-[2/3] w-full bg-gray-800 rounded-lg overflow-hidden shadow-lg transform transition-transform duration-300 group-hover:scale-105 group-hover:shadow-blue-500/30">
        <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-1 right-1 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button onClick={handleEditClick} className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <EditIcon className="w-4 h-4" />
          </button>
          <button onClick={handleDeleteClick} className="p-1.5 bg-gray-800/80 rounded-full text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500">
            <TrashIcon className="w-4 h-4" />
          </button>
      </div>
      <input type="file" accept="image/*" ref={coverInputRef} onChange={handleCoverChange} className="hidden" />
      <p className="text-center text-sm font-medium text-gray-300 group-hover:text-white truncate w-full px-1">{book.title}</p>
    </div>
  );
};

const UploadCard: React.FC<{ onFileSelect: (file: File) => void }> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCardClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    } else if (file) {
      alert("Please select a valid PDF file.");
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer aspect-[2/3] w-full bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-gray-700/50 hover:border-blue-500 hover:text-white transition-all duration-300"
    >
      <UploadIcon className="w-10 h-10 mb-2" />
      <span className="text-sm font-semibold text-center px-2">Upload PDF Book</span>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />
    </div>
  );
};


const Bookshelf: React.FC<BookshelfProps> = ({ books, isLoading, onSelectBook, onAddBook, onUpdateCover, onDeleteBook }) => {
  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center space-x-3">
          <BookOpenIcon className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white tracking-tight">My Audio Books</h1>
        </header>
        
        {isLoading && (
          <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400"></div>
             <p className="ml-4 text-lg">Loading Books...</p>
          </div>
        )}
        
        {!isLoading && books.length === 0 && (
          <div className="text-center py-16 px-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Your bookshelf is empty.</h2>
            <p className="text-gray-400">Click on "Upload PDF Book" to get started.</p>
          </div>
        )}
        
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {books.map(book => (
              <BookCard key={book.id} book={book} onSelect={() => onSelectBook(book)} onUpdateCover={onUpdateCover} onDeleteBook={onDeleteBook} />
            ))}
            <UploadCard onFileSelect={onAddBook} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookshelf;
