import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  X, 
  Search as SearchIcon, 
  Home as HomeIcon, 
  Flame, 
  Laugh, 
  Ghost, 
  Bookmark, 
  Clock, 
  Settings as SettingsIcon, 
  Play, 
  Plus, 
  Check, 
  Share2, 
  Loader2, 
  ChevronRight, 
  Star,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Config ---
const API_KEY = '5e872b180f9dfd43763e70c1eecd0d1a';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TODAY = new Date().toISOString().split('T')[0];

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string;
  overview?: string;
  genres?: { id: number; name: string }[];
  external_ids?: { imdb_id: string | null };
  similar?: { results: Movie[] };
}

type ViewType = 'home' | 'category' | 'search' | 'watchlist' | 'history' | 'settings';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [category, setCategory] = useState<{ id: string; name: string } | null>(null);
  const [language, setLanguage] = useState<string>(localStorage.getItem('pb_lang') || '');
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Data States
  const [watchlist, setWatchlist] = useState<Movie[]>(JSON.parse(localStorage.getItem('pb_wl') || '[]'));
  const [history, setHistory] = useState<Movie[]>(JSON.parse(localStorage.getItem('pb_hs') || '[]'));
  const [recentSearches, setRecentSearches] = useState<string[]>(JSON.parse(localStorage.getItem('pb_rs') || '[]'));
  
  // Lifecycle
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const toggleWatchlist = (movie: Movie) => {
    const exists = watchlist.find((m) => m.id === movie.id);
    let updated;
    if (exists) {
      updated = watchlist.filter((m) => m.id !== movie.id);
    } else {
      updated = [movie, ...watchlist];
    }
    setWatchlist(updated);
    localStorage.setItem('pb_wl', JSON.stringify(updated));
  };

  const addToHistory = (movie: Movie) => {
    const updated = [movie, ...history.filter((m) => m.id !== movie.id)].slice(0, 30);
    setHistory(updated);
    localStorage.setItem('pb_hs', JSON.stringify(updated));
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('pb_lang', lang);
    setShowSettings(false);
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-[#e50914] selection:text-white overflow-x-hidden relative">
      <div className="mesh-bg">
        <div className="mesh-blob-1" />
        <div className="mesh-blob-2" />
        <div className="mesh-blob-3" />
      </div>

      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>
      
      {isOffline && <OfflineScreen />}

      <Navbar 
        onMenuClick={() => setSidebarOpen(true)} 
        onSearchClick={() => setCurrentView('search')} 
        onLogoClick={() => setCurrentView('home')}
      />

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        currentView={currentView}
        onNavigate={(view, cat) => {
          setCurrentView(view);
          setCategory(cat || null);
          setSidebarOpen(false);
        }}
        onOpenSettings={() => {
          setShowSettings(true);
          setSidebarOpen(false);
        }}
      />

      <main className="pt-20 pb-10 px-4 max-w-7xl mx-auto min-h-screen overflow-y-auto">
        {currentView === 'home' && (
          <HomeView 
            language={language} 
            onMovieClick={setSelectedMovieId} 
            history={history}
          />
        )}
        {currentView === 'category' && category && (
          <CategoryView 
            category={category} 
            onMovieClick={setSelectedMovieId} 
          />
        )}
        {currentView === 'search' && (
          <SearchView 
            onMovieClick={setSelectedMovieId} 
            recentSearches={recentSearches}
            setRecentSearches={setRecentSearches}
          />
        )}
        {(currentView === 'watchlist' || currentView === 'history') && (
          <ListView 
            type={currentView as 'watchlist' | 'history'} 
            items={currentView === 'watchlist' ? watchlist : history} 
            onMovieClick={setSelectedMovieId}
            onDelete={(id) => {
              if (currentView === 'watchlist') {
                const updated = watchlist.filter(m => m.id !== id);
                setWatchlist(updated);
                localStorage.setItem('pb_wl', JSON.stringify(updated));
              } else {
                const updated = history.filter(m => m.id !== id);
                setHistory(updated);
                localStorage.setItem('pb_hs', JSON.stringify(updated));
              }
            }}
          />
        )}
      </main>

      <AnimatePresence>
        {selectedMovieId && (
          <MovieDetailModal 
            movieId={selectedMovieId} 
            onClose={() => setSelectedMovieId(null)}
            onWatchlistToggle={toggleWatchlist}
            watchlist={watchlist}
            addToHistory={addToHistory}
            onMovieClick={setSelectedMovieId}
          />
        )}
      </AnimatePresence>

      {showSettings && (
        <SettingsModal 
          currentLang={language} 
          onClose={() => setShowSettings(false)} 
          onSelectLang={handleLanguageChange} 
        />
      )}
    </div>
  );
}

// --- Components ---

function SplashScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 bg-black z-[99999] flex items-center justify-center p-4"
    >
      <div className="mesh-bg opacity-50">
        <div className="mesh-blob-1" />
        <div className="mesh-blob-2" />
        <div className="mesh-blob-3" />
      </div>
      <motion.div
        initial={{ scale: 1.5, filter: 'blur(15px)', opacity: 0 }}
        animate={{ scale: 1, filter: 'blur(0)', opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="text-5xl md:text-8xl font-black text-[#e50914] tracking-tighter text-center italic"
        style={{ textShadow: '0 0 50px rgba(229,9,20,1)' }}
      >
        PIKCHARBAAZ
      </motion.div>
    </motion.div>
  );
}

function OfflineScreen() {
  return (
    <div className="fixed inset-0 bg-[#111111] z-[99998] flex flex-col items-center justify-center p-6 text-center">
      <WifiOff className="w-16 h-16 text-[#e50914] mb-4" />
      <h2 className="text-2xl font-bold mb-2">No Internet</h2>
      <p className="text-gray-400 font-medium">Please check your network connection to continue streaming.</p>
    </div>
  );
}

function Navbar({ onMenuClick, onSearchClick, onLogoClick }: { onMenuClick: () => void, onSearchClick: () => void, onLogoClick: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 h-16 z-[100] transition-all duration-300 flex items-center justify-between px-4 md:px-8 ${scrolled ? 'bg-white/5 backdrop-blur-2xl border-b border-white/10' : 'bg-transparent'}`}>
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer group">
          <Menu className="w-6 h-6 group-active:scale-90 transition-transform" />
        </button>
        <span 
          onClick={onLogoClick} 
          className="text-xl md:text-2xl font-black text-[#e50914] tracking-tight cursor-pointer active:scale-95 transition-transform"
        >
          PIKCHARBAAZ
        </span>
      </div>
      <button onClick={onSearchClick} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer group">
        <SearchIcon className="w-6 h-6 group-active:scale-90 transition-transform" />
      </button>
    </nav>
  );
}

function Sidebar({ isOpen, onClose, onNavigate, onOpenSettings, currentView }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onNavigate: (view: ViewType, cat?: { id: string, name: string }) => void;
  onOpenSettings: () => void;
  currentView: ViewType;
}) {
  const menuItems = [
    { id: 'home', label: 'Home', icon: HomeIcon, view: 'home' as ViewType },
    { id: '28', label: 'Action', icon: Flame, view: 'category' as ViewType, name: 'Action' },
    { id: '35', label: 'Comedy', icon: Laugh, view: 'category' as ViewType, name: 'Comedy' },
    { id: '27', label: 'Horror', icon: Ghost, view: 'category' as ViewType, name: 'Horror' },
    { id: 'wl', label: 'My Watchlist', icon: Bookmark, view: 'watchlist' as ViewType },
    { id: 'hs', label: 'History', icon: Clock, view: 'history' as ViewType },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 z-[999] backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-white/5 backdrop-blur-3xl z-[1000] border-r border-white/10 flex flex-col shadow-2xl"
            >
              <div className="p-6 mb-4">
                <h1 className="text-2xl font-black text-[#e50914] tracking-tighter">PIKCHARBAAZ</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">Pure Movie Stream</p>
              </div>
              <div className="flex-1 py-4 overflow-y-auto no-scrollbar space-y-2 px-3">
                {menuItems.map((item) => {
                  const isActive = currentView === item.view && (!item.id || item.id === 'home' || item.id === 'wl' || item.id === 'hs' || (currentView === 'category' && item.id));
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.view, item.name ? { id: item.id, name: item.name } : undefined)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-[#e50914] text-white shadow-lg shadow-[#e50914]/20' : 'text-white/60 hover:text-white hover:bg-white/5'} font-bold cursor-pointer text-sm`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="p-6 mt-auto">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <button 
                    onClick={onOpenSettings}
                    className="flex items-center gap-2 mb-3 text-xs font-bold opacity-60 uppercase tracking-widest hover:opacity-100 transition-opacity"
                  >
                    <SettingsIcon className="w-4 h-4" /> Settings
                  </button>
                  <p className="text-[11px] mb-2 opacity-40 uppercase">Global Filter</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-1 bg-[#e50914] rounded text-[10px] font-bold">HD</span>
                    <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold">2026</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function HomeView({ language, onMovieClick, history }: { language: string, onMovieClick: (id: number) => void, history: Movie[] }) {
  const [top10, setTop10] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>([]);
  const [explore, setExplore] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const filterMovies = (movies: Movie[]) => {
    return (movies || []).filter(m => m.release_date && m.release_date <= TODAY && m.vote_count >= 20 && m.poster_path);
  };

  useEffect(() => {
    async function init() {
      setInitialLoading(true);
      const langP = language ? `&with_original_language=${language}` : '';
      
      try {
        // Top 10 Indian
        const top10Data = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_origin_country=IN&sort_by=popularity.desc&primary_release_date.lte=${TODAY}`).then(r => r.json());
        setTop10(filterMovies(top10Data.results).slice(0, 10));

        // New Releases
        const nrData = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=primary_release_date.desc&primary_release_date.lte=${TODAY}&vote_count.gte=10${langP}`).then(r => r.json());
        setNewReleases(filterMovies(nrData.results).slice(0, 15));

        // Explore Page 1
        const expData = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&primary_release_date.lte=${TODAY}${langP}&page=1`).then(r => r.json());
        setExplore(filterMovies(expData.results));
      } catch (err) {
        console.error("Fetch failed", err);
      }
      setInitialLoading(false);
    }
    init();
  }, [language]);

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    const nextPage = page + 1;
    const langP = language ? `&with_original_language=${language}` : '';
    try {
      const expData = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&primary_release_date.lte=${TODAY}${langP}&page=${nextPage}`).then(r => r.json());
      setExplore(prev => [...prev, ...filterMovies(expData.results)]);
      setPage(nextPage);
    } catch (err) {
      console.error("Load more failed", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, loading, language]);

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-10 h-10 text-[#e50914] animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Fetching Magic...</p>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-20">
      {history.length > 0 && (
        <section className="animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black flex items-center gap-2 opacity-80">Continue Watching <ChevronRight className="w-5 h-5 text-gray-600" /></h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x">
            {history.slice(0, 10).map(movie => (
              <PosterCard key={movie.id} movie={movie} onClick={() => onMovieClick(movie.id)} />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-12 gap-6 items-start">
        <section className="col-span-12 lg:col-span-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black flex items-center gap-2 opacity-80 italic">Top 10 in India <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /></h2>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-8 no-scrollbar scroll-smooth snap-x">
            {top10.map((movie, idx) => (
              <PosterCard key={movie.id} movie={movie} rank={idx + 1} onClick={() => onMovieClick(movie.id)} />
            ))}
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 glass-card p-6 h-full flex flex-col justify-between">
           <h3 className="text-lg font-black flex items-center gap-2 mb-6">🌏 Region Focus</h3>
           <div className="space-y-3 mb-6">
              <div className={`p-4 rounded-2xl flex items-center justify-between border cursor-pointer transition-all ${language === 'hi' ? 'bg-[#e50914] border-transparent shadow-lg shadow-red-600/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => language !== 'hi' && onMovieClick(top10[0]?.id)}>
                <span className="font-bold">Bollywood</span>
                <span className={`text-[10px] px-2 py-1 rounded font-black ${language === 'hi' ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>HINDI</span>
              </div>
              <div className={`p-4 rounded-2xl flex items-center justify-between border cursor-pointer transition-all ${language === 'te' ? 'bg-[#e50914] border-transparent shadow-lg shadow-red-600/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => language !== 'te' && onMovieClick(top10[1]?.id)}>
                <span className="font-bold">Tollywood</span>
                <span className="text-[10px] bg-blue-600 px-2 py-1 rounded text-white font-black">TELUGU</span>
              </div>
              <div className={`p-4 rounded-2xl flex items-center justify-between border cursor-pointer transition-all ${language === 'en' ? 'bg-[#e50914] border-transparent shadow-lg shadow-red-600/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`} onClick={() => language !== 'en' && onMovieClick(top10[2]?.id)}>
                <span className="font-bold">Hollywood</span>
                <span className="text-[10px] bg-green-600 px-2 py-1 rounded text-white font-black">ENGLISH</span>
              </div>
           </div>
           <p className="text-[10px] text-center opacity-40 font-black tracking-widest uppercase">Select language in sidebar settings</p>
        </section>
      </div>

      <section className="animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter opacity-80">
            {language === 'hi' ? 'New Hindi Releases' : language === 'te' ? 'New Telugu Releases' : 'New Releases'}
            <Flame className="w-5 h-5 text-orange-500" />
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x">
          {newReleases.map(movie => (
            <PosterCard key={movie.id} movie={movie} onClick={() => onMovieClick(movie.id)} />
          ))}
        </div>
      </section>

      <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
        <h2 className="text-xl font-black mb-10 h-10 flex items-center gap-3">
          <span className="w-1.5 h-full bg-[#e50914] rounded-full" />
          EXPLORE COLLECTIONS
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {explore.map(movie => (
            <LandscapeCard key={movie.id} movie={movie} onClick={() => onMovieClick(movie.id)} />
          ))}
        </div>
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#e50914] animate-spin" />
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryView({ category, onMovieClick }: { category: { id: string, name: string }, onMovieClick: (id: number) => void }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${category.id}&sort_by=popularity.desc&primary_release_date.lte=${TODAY}&page=1`).then(r => r.json());
      setMovies(data.results.filter((m: any) => m.poster_path));
      setLoading(false);
      setPage(1);
    }
    load();
  }, [category.id]);

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    const nextPage = page + 1;
    const data = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${category.id}&sort_by=popularity.desc&primary_release_date.lte=${TODAY}&page=${nextPage}`).then(r => r.json());
    setMovies(prev => [...prev, ...data.results.filter((m: any) => m.poster_path)]);
    setPage(nextPage);
    setLoading(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, loading, category.id]);

  return (
    <div className="pb-20">
      <h1 className="text-3xl md:text-5xl font-black mb-12 h-16 flex items-center gap-4">
        <span className="w-2 h-full bg-[#e50914] rounded-full shadow-lg shadow-red-600/20" />
        {category.name.toUpperCase()}
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {movies.map(movie => (
          <LandscapeCard key={movie.id} movie={movie} onClick={() => onMovieClick(movie.id)} />
        ))}
      </div>
      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 text-[#e50914] animate-spin" />
        </div>
      )}
    </div>
  );
}

function SearchView({ onMovieClick, recentSearches, setRecentSearches }: { 
  onMovieClick: (id: number) => void, 
  recentSearches: string[], 
  setRecentSearches: React.Dispatch<React.SetStateAction<string[]>> 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    const data = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(q)}`).then(r => r.json());
    setResults(data.results.filter((m: any) => m.poster_path));
    setLoading(false);

    if (!recentSearches.includes(q)) {
      const updated = [q, ...recentSearches].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('pb_rs', JSON.stringify(updated));
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('pb_rs');
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="relative">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-[#e50914]">
          <SearchIcon className="w-6 h-6" />
        </div>
        <input 
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            clearTimeout((window as any).searchTimeout);
            (window as any).searchTimeout = setTimeout(() => handleSearch(e.target.value), 800);
          }}
          placeholder="Search for Blockbusters..."
          className="w-full h-16 bg-[#1a1a1a] border-2 border-white/5 rounded-2xl pl-14 pr-6 text-xl outline-none focus:border-[#e50914] focus:bg-[#222] transition-all shadow-2xl font-medium"
        />
      </div>

      {query.length === 0 && recentSearches.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-500 font-black text-sm uppercase tracking-widest">Recent Searches</h3>
            <button onClick={clearRecent} className="text-[#e50914] text-xs font-black hover:bg-[#e50914]/10 px-3 py-1.5 rounded-full uppercase tracking-tighter transition-colors">Clear All</button>
          </div>
          <div className="grid gap-2">
            {recentSearches.map((s, i) => (
              <button 
                key={i} 
                onClick={() => {
                  setQuery(s);
                  handleSearch(s);
                }}
                className="w-full h-14 flex items-center justify-between px-5 bg-white/5 hover:bg-white/10 rounded-xl group transition-all cursor-pointer font-bold"
              >
                <span className="flex items-center gap-4 text-gray-400 group-hover:text-white transition-colors">
                  <Clock className="w-5 h-5 text-[#e50914]" /> {s}
                </span>
                <X className="w-5 h-5 text-gray-600 opacity-0 group-hover:opacity-100 transition-all hover:text-white" onClick={(e) => {
                  e.stopPropagation();
                  const updated = recentSearches.filter(x => x !== s);
                  setRecentSearches(updated);
                  localStorage.setItem('pb_rs', JSON.stringify(updated));
                }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="animate-in fade-in duration-500">
          <h3 className="text-2xl font-black mb-10 h-10 flex items-center gap-3">
            <span className="w-1.5 h-full bg-[#e50914] rounded-full" />
            DISCOVERY RESULTS
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {results.map(movie => (
              <LandscapeCard key={movie.id} movie={movie} onClick={() => onMovieClick(movie.id)} />
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-[#e50914] animate-spin" />
        </div>
      )}
    </div>
  );
}

function ListView({ type, items, onMovieClick, onDelete }: { 
  type: 'watchlist' | 'history', 
  items: Movie[], 
  onMovieClick: (id: number) => void,
  onDelete: (id: number) => void
}) {
  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <h1 className="text-3xl md:text-5xl font-black mb-12 h-16 flex items-center gap-4">
        <span className="w-2 h-full bg-[#e50914] rounded-full shadow-lg shadow-red-600/20" />
        {type === 'watchlist' ? 'MY WATCHLIST' : 'WATCH HISTORY'}
      </h1>
      {items.length === 0 ? (
        <div className="text-center py-32 flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-gray-600">
            {type === 'watchlist' ? <Bookmark className="w-12 h-12" /> : <Clock className="w-12 h-12" />}
          </div>
          <p className="text-gray-500 font-black text-xl tracking-tighter uppercase">Your {type} is currently empty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {items.map(movie => (
            <div key={movie.id} className="relative group">
              <LandscapeCard movie={movie} onClick={() => onMovieClick(movie.id)} />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove "${movie.title}" from list?`)) {
                    onDelete(movie.id);
                  }
                }}
                className="absolute top-2 right-2 w-10 h-10 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all shadow-2xl hover:bg-[#e50914] z-10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PosterCard({ movie, rank, onClick }: { movie: Movie, rank?: number, onClick: () => void, key?: any }) {
  return (
    <div 
      onClick={onClick}
      className="relative flex-shrink-0 w-36 md:w-44 aspect-[2/3] rounded-3xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95 group shadow-2xl snap-center"
    >
      <img 
        src={IMAGE_BASE + movie.poster_path} 
        alt={movie.title} 
        loading="lazy"
        className="w-full h-full object-cover transition-all duration-700 group-hover:brightness-[0.4]"
      />
      {rank && (
        <div className="absolute top-2 left-2 w-10 h-10 bg-[#e50914] text-white flex items-center justify-center font-black text-xl italic rounded-full shadow-lg z-10 border border-white/20">
          {rank}
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-[#e50914] text-white text-[10px] font-black px-2 py-1 rounded shadow-2xl uppercase z-10 tracking-widest">Premium</div>
      <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-black/60 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase opacity-60 mb-1">PikcharBaaz</p>
        <p className="text-xs font-black line-clamp-1">{movie.title}</p>
      </div>
    </div>
  );
}

function LandscapeCard({ movie, onClick }: { movie: Movie, onClick: () => void, key?: any }) {
  const imgSrc = (movie.backdrop_path || movie.poster_path) ? (IMAGE_BASE + (movie.backdrop_path || movie.poster_path)) : '';
  const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
  
  return (
    <div 
      onClick={onClick}
      className="flex flex-col gap-3 cursor-pointer group active:scale-[0.98] transition-all duration-300"
    >
      <div className="relative aspect-video rounded-3xl overflow-hidden shadow-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <img 
          src={imgSrc} 
          alt={movie.title} 
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700 group-hover:brightness-50"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 glass-card flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-current" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black px-2 py-0.5 rounded shadow-2xl uppercase tracking-tighter">HD+</div>
      </div>
      <div className="px-2">
        <h4 className="text-sm font-black line-clamp-1 group-hover:text-[#e50914] transition-colors">{movie.title}</h4>
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold mt-1">
          <span className="uppercase tracking-[0.2em]">{year}</span>
          <span className="text-yellow-500/80 flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> {movie.vote_average.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

function MovieDetailModal({ movieId, onClose, onWatchlistToggle, watchlist, addToHistory, onMovieClick }: { 
  movieId: number, 
  onClose: () => void,
  onWatchlistToggle: (movie: Movie) => void,
  watchlist: Movie[],
  addToHistory: (movie: Movie) => void,
  onMovieClick: (id: number) => void
}) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=similar,external_ids`).then(r => r.json());
        setMovie(data);
        addToHistory(data);
        modalRef.current?.scrollTo(0, 0);
      } catch (err) {
        console.error("Detail fetch failed", err);
      }
      setLoading(false);
    }
    load();
  }, [movieId]);

  if (!movie && loading) {
    return (
      <div className="fixed inset-0 z-[2000] bg-[#111] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#e50914] animate-spin" />
      </div>
    );
  }

  if (!movie) return null;

  const isInWatchlist = !!watchlist.find(m => m.id === movie.id);
  const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
  const imdbId = movie.external_ids?.imdb_id;

  const servers = [
    { name: 'Server 1 (VIP)', res: '4K ULTRA', icon: '1', url: imdbId ? `https://www.playimdb.com/title/${imdbId}/` : null },
    { name: 'Server 2 (Fast)', res: '1080p', icon: '2', url: `https://moviesapi.club/movie/${movie.id}` },
    { name: 'Server 3 (Extreme)', res: 'HD+', icon: '3', url: `https://vidlink.pro/movie/${movie.id}` },
    { name: 'Server 4 (Backup)', res: 'AUTO', icon: '4', url: `https://vidsrc.pm/embed/movie/${movie.id}` },
  ].filter(s => s.url);

  return (
    <motion.div 
      ref={modalRef}
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[2000] bg-[#111111] overflow-y-auto no-scrollbar"
    >
      <div className="relative h-[45vh] md:h-[65vh]">
        <img 
          src={movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : (IMAGE_BASE + movie.poster_path)}
          className="w-full h-full object-cover"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/20" />
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-red-600 rounded-full text-white cursor-pointer hover:scale-110 active:scale-90 transition-all z-20 shadow-xl shadow-red-600/20"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="px-5 md:px-12 pb-24 -mt-24 relative z-10 max-w-6xl mx-auto">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
        >
          <div className="mb-4">
            <span className="bg-[#e50914] px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 shadow-lg shadow-red-600/20">Indian Blockbuster</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black mb-8 leading-[0.85] tracking-tighter uppercase drop-shadow-2xl">{movie.title}</h1>
          
          <div className="flex items-center gap-6 text-xs md:text-sm font-black text-white/50 mb-12 overflow-x-auto no-scrollbar whitespace-nowrap">
            <span className="glass-button px-3 py-1 text-white">4K HDR</span>
            <span className="uppercase tracking-[0.2em]">{year}</span>
            <span className="text-yellow-500 flex items-center gap-1.5"><Star className="w-4 h-4 fill-current" /> {movie.vote_average.toFixed(1)}</span>
            {movie.genres?.slice(0, 3).map(g => (
              <span key={g.id} className="bg-white/5 px-3 py-1 rounded-full border border-white/10 uppercase tracking-tighter text-[10px]">{g.name}</span>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-16">
            <button 
              onClick={() => window.open(servers[0].url || '', '_blank')}
              className="flex-[2] h-16 bg-white text-black rounded-2xl font-black text-xl flex items-center justify-center gap-4 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Play className="w-7 h-7 fill-current" /> PLAY NOW
            </button>
            <button 
              onClick={() => onWatchlistToggle(movie)}
              className={`flex-1 h-16 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all border-2 ${isInWatchlist ? 'bg-[#e50914] text-white border-transparent' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
            >
              {isInWatchlist ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
              {isInWatchlist ? 'SAVED' : 'WATCHLIST'}
            </button>
            <button 
              onClick={() => {
                const text = `🎬 *PikcharBaaz Recommends:* \n\n"*${movie.title}*" (${year})\nRating: ★${movie.vote_average.toFixed(1)}\n\nWatch it now in 4K HDR! 🍿\n👉 ${window.location.href}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="flex-1 h-16 bg-white/5 hover:bg-white/10 border-2 border-white/10 rounded-2xl font-black text-sm flex items-center justify-center gap-3 text-white transition-all shadow-xl backdrop-blur-sm"
            >
              <Share2 className="w-5 h-5 text-green-500" /> SHARE
            </button>
          </div>

          <div className="grid md:grid-cols-[2fr_1fr] gap-12">
            <div className="glass-card p-8 bg-white/[0.03]">
              <h3 className="text-sm font-black text-[#e50914] uppercase tracking-[0.2em] mb-6">Synopsis</h3>
              <p className="text-white/70 leading-relaxed text-lg md:text-2xl font-medium tracking-tight">
                {movie.overview || "Experience the thrill of cinematic perfection with PikcharBaaz. Dive into a world where storytelling meets cutting-edge visual mastery."}
              </p>
            </div>
            
            <div className="glass-card p-8 bg-white/[0.03]">
              <h3 className="text-sm font-black text-[#e50914] uppercase tracking-[0.2em] mb-6">Streaming Hub</h3>
              <div className="grid gap-3">
                {servers.map((srv, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                        window.open(srv.url || '', '_blank');
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-[#e50914] transition-all group group cursor-pointer shadow-xl backdrop-blur-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-black flex items-center justify-center font-black text-[#e50914] rounded-lg group-hover:bg-white group-hover:text-red-600 transition-all text-sm italic">
                        {srv.icon}
                      </div>
                      <span className="font-bold text-sm uppercase tracking-tighter">{srv.name}</span>
                    </div>
                    <span className="text-[10px] bg-white/10 px-2 py-1 rounded font-black group-hover:bg-black/20 tracking-widest">{srv.res}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {movie.similar && movie.similar.results.length > 0 && (
          <section className="mt-20">
            <h3 className="text-2xl font-black mb-8 border-l-8 border-[#e50914] pl-5 uppercase tracking-tighter">Recommended For You</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {movie.similar.results.slice(0, 12).filter(m => m.poster_path).map(s => (
                <LandscapeCard key={s.id} movie={s} onClick={() => onMovieClick(s.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}

function SettingsModal({ currentLang, onClose, onSelectLang }: { currentLang: string, onClose: () => void, onSelectLang: (lang: string) => void }) {
  const langs = [
    { id: '', label: 'All Languages' },
    { id: 'hi', label: 'Hindi (Bollywood)' },
    { id: 'en', label: 'English (Hollywood)' },
    { id: 'te', label: 'Telugu (Tollywood)' },
    { id: 'ta', label: 'Tamil' },
  ];

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-sm glass-card border-white/20 overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between font-black text-xl uppercase tracking-tighter">
          Region Focus
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full cursor-pointer active:scale-90 transition-all"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-5 space-y-2">
          {langs.map((lang) => (
            <button
              key={lang.id}
              onClick={() => onSelectLang(lang.id)}
              className={`w-full p-4 rounded-xl text-left font-black transition-all border text-sm flex items-center justify-between group ${currentLang === lang.id ? 'bg-[#e50914] border-transparent shadow-lg shadow-red-600/20 text-white' : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/50 hover:text-white'}`}
            >
              {lang.label}
              {currentLang === lang.id ? <Check className="w-5 h-5" /> : <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-all" />}
            </button>
          ))}
        </div>
        <div className="p-6 bg-white/5 text-[10px] text-center font-black text-white/30 uppercase tracking-[0.3em]">
          Powered by PikcharBaaz Engine
        </div>
      </motion.div>
    </div>
  );
}
