
import React, { useState, useEffect, useCallback } from 'react';
import { Book } from './types';
import * as db from './services/db';
import { parsePdf } from './utils/pdf';
import Bookshelf from './components/Bookshelf';
import BookReader from './components/BookReader';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initDbAndLoadBooks = async () => {
      try {
        await db.initDB();
        const loadedBooks = await db.getBooks();
        setBooks(loadedBooks);
      } catch (error) {
        console.error("Failed to initialize DB or load books:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initDbAndLoadBooks();
  }, []);

  const handleAddBook = async (file: File) => {
    setIsLoading(true);
    try {
      const { title, coverImage, pageTexts } = await parsePdf(file);
      const newBook: Book = {
        id: Date.now().toString(),
        title: title || file.name.replace('.pdf', ''),
        coverImage,
        pageTexts,
      };
      await db.addBook(newBook, file);
      setBooks(prevBooks => [...prevBooks, newBook]);
    } catch (error) {
      console.error("Failed to add book:", error);
      alert("There was an error processing the PDF. Please try a different file.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdateBookCover = async (bookId: string, newCoverImage: string) => {
    try {
        await db.updateBookCover(bookId, newCoverImage);
        setBooks(prevBooks => prevBooks.map(book => 
            book.id === bookId ? { ...book, coverImage: newCoverImage } : book
        ));
    } catch (error) {
        console.error("Failed to update cover:", error);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm("Are you sure you want to delete this book?")) {
      try {
        await db.deleteBook(bookId);
        setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      } catch (error) {
        console.error("Failed to delete book:", error);
      }
    }
  };


  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book);
  }, []);

  const handleBackToShelf = useCallback(() => {
    setSelectedBook(null);
  }, []);

  if (selectedBook) {
    return <BookReader book={selectedBook} onBack={handleBackToShelf} />;
  }

  return <Bookshelf 
            books={books} 
            onSelectBook={handleSelectBook} 
            onAddBook={handleAddBook} 
            onUpdateCover={handleUpdateBookCover}
            onDeleteBook={handleDeleteBook}
            isLoading={isLoading} 
         />;
};

export default App;
