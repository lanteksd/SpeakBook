interface ParsedPdf {
  title: string | null;
  coverImage: string;
  pageTexts: string[];
}

/**
 * Waits for the pdf.js library to be available on the window object.
 * Polls for the library and rejects if it doesn't load within a timeout.
 * @returns A promise that resolves with the pdfjsLib object.
 */
const ensurePdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeout = 5000; // 5 seconds
    const checkInterval = 100; // check every 100ms
    let elapsedTime = 0;

    const intervalId = setInterval(() => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        clearInterval(intervalId);
        resolve(pdfjsLib);
      } else {
        elapsedTime += checkInterval;
        if (elapsedTime >= timeout) {
          clearInterval(intervalId);
          const errorMsg = "pdf.js library failed to load within the time limit. Please check your network connection and refresh the page.";
          console.error(errorMsg);
          reject(new Error(errorMsg));
        }
      }
    }, checkInterval);
  });
};


export const parsePdf = async (file: File): Promise<ParsedPdf> => {
  const pdfjsLib = await ensurePdfJs();
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
  
  const fileReader = new FileReader();
  
  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error('Failed to read file'));
      }
      
      const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
      
      try {
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        
        // --- Extract Metadata for Title ---
        const metadata = await pdf.getMetadata();
        const title = metadata.info?.Title || null;
        
        // --- Extract Cover Image from first page ---
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await firstPage.render({ canvasContext: context, viewport: viewport }).promise;
        }
        const coverImage = canvas.toDataURL('image/jpeg', 0.8);

        // --- Extract Text from all pages ---
        const pageTexts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          pageTexts.push(pageText);
        }

        resolve({ title, coverImage, pageTexts });
      } catch (error) {
        reject(error);
      }
    };

    fileReader.onerror = () => reject(new Error('File reading error'));
    fileReader.readAsArrayBuffer(file);
  });
};