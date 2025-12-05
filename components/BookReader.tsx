
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Book, VoiceOption } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audio';
import { BackIcon, PlayIcon, PauseIcon, NextIcon, PrevIcon, MaleIcon, FemaleIcon, LoadingIcon, FontSizeIncreaseIcon, FontSizeDecreaseIcon, VolumeIcon } from './icons';

interface BookReaderProps {
  book: Book;
  onBack: () => void;
}

const BookReader: React.FC<BookReaderProps> = ({ book, onBack }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [voice, setVoice] = useState<VoiceOption>(VoiceOption.FEMALE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [volume, setVolume] = useState(1);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [audioCache, setAudioCache] = useState<Map<number, string>>(new Map());
  const [autoPlay, setAutoPlay] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const wordHighlightIntervalRef = useRef<number | null>(null);
  const preloadingPageRef = useRef<number | null>(null);
  const isInitialMountRef = useRef(true);

  const stopPlayback = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null; // Prevent onended from firing on manual stop
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (wordHighlightIntervalRef.current) {
      clearInterval(wordHighlightIntervalRef.current);
      wordHighlightIntervalRef.current = null;
    }
    setIsPlaying(false);
    setHighlightedWordIndex(-1);
  }, []);

  useEffect(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const gainNode = context.createGain();
    gainNode.connect(context.destination);
    audioContextRef.current = context;
    gainNodeRef.current = gainNode;
    return () => {
      stopPlayback();
      context.close();
    };
  }, [stopPlayback]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    stopPlayback();
    setAudioCache(new Map());
  }, [voice, stopPlayback]);

  const preloadPage = useCallback(async (pageIndex: number) => {
    if (pageIndex >= book.pageTexts.length || audioCache.has(pageIndex) || preloadingPageRef.current === pageIndex) {
      return;
    }
    const pageText = book.pageTexts[pageIndex];
    if (!pageText?.trim()) return;

    preloadingPageRef.current = pageIndex;
    try {
      const audioData = await generateSpeech(pageText, voice);
      if (audioData) {
        setAudioCache(prev => new Map(prev).set(pageIndex, audioData));
      }
    } catch (error) {
      console.error(`Failed to preload page ${pageIndex}:`, error);
    } finally {
      if (preloadingPageRef.current === pageIndex) {
        preloadingPageRef.current = null;
      }
    }
  }, [book.pageTexts, voice, audioCache]);

  const playCurrentPage = useCallback(async () => {
    if (isGenerating) return;
    
    stopPlayback();
    setIsGenerating(true);
    setHighlightedWordIndex(-1);
    
    try {
      let audioData = audioCache.get(currentPage);
      const pageText = book.pageTexts[currentPage];

      if (!audioData && pageText?.trim()) {
        audioData = await generateSpeech(pageText, voice);
        if (audioData) {
          setAudioCache(prev => new Map(prev).set(currentPage, audioData));
        }
      }
      
      if (audioData && audioContextRef.current && gainNodeRef.current) {
        const totalWords = (pageText.match(/\S+/g) || []).length;
        if (totalWords === 0) {
            setIsGenerating(false);
            return;
        }

        const decodedBytes = decode(audioData);
        const audioBuffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNodeRef.current);
        source.onended = () => {
          setIsPlaying(false);
          if (wordHighlightIntervalRef.current) clearInterval(wordHighlightIntervalRef.current);
          if (autoPlay && currentPage < book.pageTexts.length - 1) {
            setCurrentPage(p => p + 1);
          }
        };
        source.start();
        audioSourceRef.current = source;
        setIsPlaying(true);
        
        const wordDuration = (audioBuffer.duration * 1000) / totalWords;
        setHighlightedWordIndex(0);
        wordHighlightIntervalRef.current = window.setInterval(() => {
          setHighlightedWordIndex(prevIndex => {
              const nextIndex = prevIndex + 1;
              if (nextIndex >= totalWords) {
                if(wordHighlightIntervalRef.current) clearInterval(wordHighlightIntervalRef.current);
                return prevIndex;
              }
              return nextIndex;
          });
        }, wordDuration);
        
        preloadPage(currentPage + 1);
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
      alert("Could not generate audio. Please check your API key and network connection.");
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, currentPage, book.pageTexts, voice, stopPlayback, audioCache, preloadPage, autoPlay]);

  useEffect(() => {
    if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        preloadPage(1); // Preload the second page on initial load
        return;
    }

    stopPlayback();

    if (autoPlay) {
        playCurrentPage();
    } else {
        preloadPage(currentPage + 1);
    }
}, [currentPage, autoPlay]); // Removed playCurrentPage and preloadPage as they are stable useCallback

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playCurrentPage();
    }
  };

  const goToNextPage = () => {
    if (currentPage < book.pageTexts.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const renderPageContent = () => {
      const pageText = book.pageTexts[currentPage] || "";
      if (!pageText.trim()) return "This page is empty.";
      
      const paragraphs = pageText.split('\n').filter(p => p.trim() !== '');
      let wordCounter = 0;

      return paragraphs.map((paragraph, pIndex) => (
          <p key={pIndex} className="mb-4">
              {paragraph.split(/\s+/).filter(w => w).map((word, wIndex) => {
                  const currentWordIndex = wordCounter++;
                  return (
                      <span key={wIndex} className={`px-0.5 rounded transition-colors duration-150 ${currentWordIndex === highlightedWordIndex ? 'bg-blue-500 text-white' : ''}`}>
                          {word}{' '}
                      </span>
                  );
              })}
          </p>
      ));
  }


  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
      <header className="flex items-center justify-between p-4 bg-gray-800 shadow-md z-10">
        <button onClick={onBack} className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
          <BackIcon className="w-6 h-6" />
          <span className="font-semibold">Bookshelf</span>
        </button>
        <h1 className="text-lg font-bold text-center truncate mx-4 flex-1">{book.title}</h1>
        <div className="w-28 text-right">
          <span className="text-sm text-gray-400">
            Page {currentPage + 1} / {book.pageTexts.length}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
        <div 
          className="max-w-4xl mx-auto leading-relaxed text-gray-300 transition-all duration-200"
          style={{ fontSize: `${fontSize}px` }}
        >
          {renderPageContent()}
        </div>
      </main>

      <footer className="sticky bottom-0 bg-gray-800/80 backdrop-blur-sm p-4 shadow-lg-top">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-2">
                <button onClick={() => setVoice(VoiceOption.FEMALE)} className={`p-2 rounded-full transition-colors ${voice === VoiceOption.FEMALE ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                <FemaleIcon className="w-5 h-5" />
                </button>
                <button onClick={() => setVoice(VoiceOption.MALE)} className={`p-2 rounded-full transition-colors ${voice === VoiceOption.MALE ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                <MaleIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center space-x-2">
                <label htmlFor="autoplay-toggle" className="flex items-center cursor-pointer">
                    <span className="mr-2 text-sm font-medium text-gray-400">Auto-Play</span>
                    <div className="relative">
                        <input type="checkbox" id="autoplay-toggle" className="sr-only" checked={autoPlay} onChange={() => setAutoPlay(prev => !prev)} />
                        <div className="block bg-gray-600 w-12 h-6 rounded-full"></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${autoPlay ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                </label>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={goToPrevPage} disabled={currentPage === 0} className="p-3 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <PrevIcon className="w-7 h-7" />
            </button>
            <button
              onClick={handlePlayPause}
              disabled={isGenerating}
              className="p-4 bg-blue-600 rounded-full text-white shadow-lg hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-wait transition-transform transform hover:scale-105"
            >
              {isGenerating ? <LoadingIcon className="w-8 h-8 animate-spin" /> : (isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />)}
            </button>
            <button onClick={goToNextPage} disabled={currentPage >= book.pageTexts.length - 1} className="p-3 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <NextIcon className="w-7 h-7" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
                <VolumeIcon className="w-5 h-5 text-gray-400" />
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-20 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    aria-label="Volume control"
                />
            </div>
            <button onClick={() => setFontSize(s => Math.max(s - 1, 12))} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                <FontSizeDecreaseIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setFontSize(s => Math.min(s + 1, 36))} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                <FontSizeIncreaseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BookReader;
