
import { Book } from '../types';

const DB_NAME = 'PDFBookReaderDB';
const DB_VERSION = 1;
const BOOK_STORE_NAME = 'books';
const PDF_STORE_NAME = 'pdfs';

let db: IDBDatabase;

export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject('Error opening DB');
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(BOOK_STORE_NAME)) {
        dbInstance.createObjectStore(BOOK_STORE_NAME, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(PDF_STORE_NAME)) {
        dbInstance.createObjectStore(PDF_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const addBook = (book: Book, pdfFile: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BOOK_STORE_NAME, PDF_STORE_NAME], 'readwrite');
    const bookStore = transaction.objectStore(BOOK_STORE_NAME);
    const pdfStore = transaction.objectStore(PDF_STORE_NAME);
    
    const bookRequest = bookStore.add(book);
    const pdfBlob = new Blob([pdfFile], { type: 'application/pdf' });
    const pdfRequest = pdfStore.add({ id: book.id, file: pdfBlob });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Transaction error while adding book');
  });
};

export const getBooks = (): Promise<Book[]> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BOOK_STORE_NAME], 'readonly');
    const store = transaction.objectStore(BOOK_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Error fetching books');
  });
};

export const updateBookCover = (bookId: string, newCoverImage: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([BOOK_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(BOOK_STORE_NAME);
        const getRequest = store.get(bookId);

        getRequest.onsuccess = () => {
            const book = getRequest.result;
            if (book) {
                book.coverImage = newCoverImage;
                const putRequest = store.put(book);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject('Error updating book cover');
            } else {
                reject('Book not found');
            }
        };
        getRequest.onerror = () => reject('Error getting book to update');
    });
};

export const deleteBook = (bookId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([BOOK_STORE_NAME, PDF_STORE_NAME], 'readwrite');
    const bookStore = transaction.objectStore(BOOK_STORE_NAME);
    const pdfStore = transaction.objectStore(PDF_STORE_NAME);
    
    bookStore.delete(bookId);
    pdfStore.delete(bookId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject('Transaction error while deleting book');
  });
};
