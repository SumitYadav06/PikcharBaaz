/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Menu, Search, X, Home, Zap, Smile, Ghost, Bookmark, 
  History, Settings, Share2, Star, Flame, ChevronRight, 
  Play, Plus, Check, Clock, WifiOff, Youtube, Info,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import { 
  Movie, 
  MovieDetails, 
  CastMember 
} from './types';
import { 
  TMDB_API_KEY, 
  BASE_URL, 
  IMAGE_BASE_URL, 
  IMAGE_ORIGINAL_URL, 
  GENRES, 
  LANGUAGES,
  APP_DOWNLOAD_LINK,
  WEB_LINK
} from './constants';

type ViewMode = 'home' | 'category' | 'search' | 'watchlist' | 'history' | 'actor';

// Movie Card Component
const MovieCard = ({ movie, isLarge = false, rank, onOpen }: { movie: Movie, isLarge?: boolean, rank?: number, onOpen: (id: number) => any, key?: any }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`relative flex-shrink-0 cursor-pointer group ${isLarge ? 'w-[140px]' : 'w-[125px]'}`}
    onClick={() => onOpen(movie.id)}
  >
    {rank && (
      <div className="absolute -top-1 -left-1 w-9 h-9 bg-[#e50914] text-white flex items-center justify-center rounded-full font-black text-lg border-2 border-[#111] z-10 shadow-lg">
        #{rank}
      </div>
    )}
    <div className="aspect-[2/3] rounded-xl overflow-hidden glass relative shadow-xl">
      <img 
        src={`${IMAGE_BASE_URL}${movie.poster_path}`} 
        alt={movie.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        loading="lazy"
      />
      <div className="absolute top-2 right-2 glass text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border-white/20">
        HD
      </div>
    </div>
  </motion.div>
);

// List Card Component (Grid)
const ListCard = ({ movie, index, onOpen }: { movie: Movie, index: number, onOpen: (id: number) => any, key?: any }) => {
  const isSmall = index % 4 === 0 || index % 4 === 3;
  const year = (movie.release_date || '').split('-')[0];
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '0.0';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col glass p-2 rounded-2xl cursor-pointer group mb-4 shadow-xl ${isSmall ? 'mt-0' : 'mt-8 -mb-8'}`}
      onClick={() => onOpen(movie.id)}
    >
      <div className={`relative rounded-xl overflow-hidden glass ${isSmall ? 'aspect-[16/9]' : 'aspect-[2/3]'}`}>
        <img 
          src={`${IMAGE_BASE_URL}${isSmall ? (movie.backdrop_path || movie.poster_path) : (movie.poster_path || movie.backdrop_path)}`} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 glass text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border-white/20">
          HD
        </div>
      </div>
      <div className="px-1">
        <div className="mt-2 text-sm font-bold truncate tracking-tight">{movie.title}</div>
        <div className="flex justify-between items-center mt-1 text-[11px] font-medium text-zinc-400">
          <span>{year}</span>
          <span className="text-yellow-500">★ {rating}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  // Navigation & View State
  const [view, setView] = useState<ViewMode>('home');
  const [currentGenre, setCurrentGenre] = useState<{id: string, name: string} | null>(null);
  const [currentActor, setCurrentActor] = useState<{id: number, name: string} | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(JSON.parse(localStorage.getItem('pb_rs') || '[]'));
  
  // Data States
  const [top10, setTop10] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>([]);
  const [exploreMovies, setExploreMovies] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>(JSON.parse(localStorage.getItem('pb_wl') || '[]'));
  const [watchHistory, setWatchHistory] = useState<Movie[]>(JSON.parse(localStorage.getItem('pb_hs') || '[]'));
  const [language, setLanguage] = useState(localStorage.getItem('pb_lang') || '');
  
  // UI & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activePlayer, setActivePlayer] = useState<'trailer' | 'movie' | null>(null);

  const uniqueMovies = (movies: Movie[]) => {
    const seen = new Set();
    return movies.filter(m => {
      const duplicate = seen.has(m.id);
      seen.add(m.id);
      return !duplicate;
    });
  };

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  // Initialize
  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    
    // Initialize History for back button
    window.history.replaceState({ page: 'home' }, '');

    const handlePopState = () => {
      if (selectedMovieId) {
        closeModal();
      } else if (isSidebarOpen) {
        setIsSidebarOpen(false);
      } else if (isSearchOpen) {
        setIsSearchOpen(false);
        setView('home');
      } else if (view !== 'home') {
        setView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedMovieId, isSidebarOpen, isSearchOpen, view]);

  // Fetch Home Data
  useEffect(() => {
    if (view === 'home') {
      fetchHomeData();
    }
  }, [view, language]);

  // Infinite Scroll Handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading && hasMore) {
        setPage(p => p + 1);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, hasMore]);

  // Load Next Page
  useEffect(() => {
    if (page > 1) {
      if (view === 'home' || view === 'category' || view === 'actor') {
        fetchExploreData(page);
      }
    }
  }, [page]);

  const fetchData = async (endpoint: string) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      return null;
    }
  };

  const fetchHomeData = async () => {
    setIsLoading(true);
    setPage(1);
    setHasMore(true);
    
    const langParam = language ? `&with_original_language=${language}` : '';
    const regionParam = language ? '' : '&with_origin_country=IN';

    const [t10, nr] = await Promise.all([
      fetchData(`/discover/movie?sort_by=popularity.desc${regionParam}`),
      fetchData(`/movie/now_playing?region=IN`)
    ]);

    if (t10) setTop10(uniqueMovies(t10.results.filter((m: any) => m.poster_path)).slice(0, 10));
    if (nr) setNewReleases(uniqueMovies(nr.results.filter((m: any) => m.poster_path)).slice(0, 20));

    // Reset explore movies
    setExploreMovies([]);
    fetchExploreData(1);
  };

  const fetchExploreData = async (p: number) => {
    setIsLoading(true);
    let endpoint = '';
    const langParam = language ? `&with_original_language=${language}` : '';

    if (view === 'home') {
      endpoint = `/discover/movie?sort_by=popularity.desc${langParam}&page=${p}`;
    } else if (view === 'category' && currentGenre) {
      endpoint = `/discover/movie?with_genres=${currentGenre.id}&sort_by=popularity.desc&page=${p}`;
    } else if (view === 'actor' && currentActor) {
      endpoint = `/discover/movie?with_cast=${currentActor.id}&sort_by=popularity.desc&page=${p}`;
    }

    if (endpoint) {
      const data = await fetchData(endpoint);
      if (data && data.results) {
        const filtered = data.results.filter((m: any) => m.poster_path);
        setExploreMovies(prev => uniqueMovies([...prev, ...filtered]));
        if (data.results.length === 0) setHasMore(false);
      }
    }
    setIsLoading(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);

    if (query.length > 2) {
      searchTimeoutRef.current = window.setTimeout(async () => {
        setIsLoading(true);
        const data = await fetchData(`/search/movie?query=${encodeURIComponent(query)}`);
        if (data && data.results) {
          setSearchResults(uniqueMovies(data.results.filter((m: any) => m.poster_path)));
          
          // Save to recent
          setRecentSearches(prev => {
            const updated = [query, ...prev.filter(q => q !== query)].slice(0, 10);
            localStorage.setItem('pb_rs', JSON.stringify(updated));
            return updated;
          });
        }
        setIsLoading(false);
      }, 800);
    } else {
      setSearchResults([]);
    }
  };

  const openMovie = async (id: number) => {
    setSelectedMovieId(id);
    window.history.pushState({ page: 'modal' }, '');
    document.body.style.overflow = 'hidden';
    
    const data = await fetchData(`/movie/${id}?append_to_response=credits,similar,videos,external_ids`);
    if (data) {
      setMovieDetails(data);
      setActivePlayer(null);
      
      // Update History
      const movieObj = {
        id: data.id,
        title: data.title,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        vote_average: data.vote_average,
        release_date: data.release_date
      };
      
      setWatchHistory(prev => {
        const filtered = prev.filter(m => m.id !== id);
        const updated = [movieObj, ...filtered].slice(0, 40);
        localStorage.setItem('pb_hs', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const closeModal = () => {
    setSelectedMovieId(null);
    setMovieDetails(null);
    setActivePlayer(null);
    document.body.style.overflow = 'auto';
  };

  const toggleWatchlist = (movie: Movie) => {
    setWatchlist(prev => {
      const exists = prev.find(m => m.id === movie.id);
      let updated;
      if (exists) {
        updated = prev.filter(m => m.id !== movie.id);
      } else {
        updated = [movie, ...prev];
      }
      localStorage.setItem('pb_wl', JSON.stringify(updated));
      return updated;
    });
  };

  const shareApp = () => {
    const text = `🔥 Download PikcharBaaz - Best App for Free Movies in HD!\n\n📱 Download App:\n👉 ${APP_DOWNLOAD_LINK}\n\n🌐 Watch Online:\n👉 ${WEB_LINK}`;
    if (navigator.share) {
      navigator.share({ title: 'PikcharBaaz', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("Share link copied!");
    }
  };

  const shareMovie = (title: string) => {
    const text = `🎬 Watch "${title}" in HD!\n\n📱 Download PikcharBaaz App to watch now:\n👉 ${APP_DOWNLOAD_LINK}\n\n🌐 Or watch online:\n👉 ${WEB_LINK}`;
    if (navigator.share) {
      navigator.share({ title: 'PikcharBaaz Share', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert("Movie share link copied!");
    }
  };

  const setLanguageAndReload = (l: string) => {
    setLanguage(l);
    localStorage.setItem('pb_lang', l);
    setIsSettingsOpen(false);
    setView('home');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-[#e50914] selection:text-white pb-10">
      <div className="mesh-bg" />
      
      {/* Offline Alert */}
      {!isOnline && (
        <div className="fixed inset-0 bg-[#111] z-[9999] flex flex-col items-center justify-center text-center p-10">
          <WifiOff className="w-16 h-16 text-[#e50914] mb-4" />
          <h2 className="text-2xl font-black">No Internet</h2>
          <p className="text-zinc-500 mt-2">Please check your connection to continue watching.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 bg-[#e50914] px-8 py-3 rounded-full font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full h-[60px] glass flex items-center justify-between px-4 z-[100] shadow-2xl">
        <div className="flex items-center gap-4">
          <Menu 
            className="w-6 h-6 cursor-pointer" 
            onClick={() => {
              setIsSidebarOpen(true);
              window.history.pushState({ page: 'menu' }, '');
            }} 
          />
          <div 
            className="text-xl font-black text-[#e50914] tracking-tight cursor-pointer"
            onClick={() => { setView('home'); setIsSearchOpen(false); }}
          >
            PIKCHARBAAZ
          </div>
        </div>
        <div className="flex items-center">
          <Search 
            className="w-6 h-6 cursor-pointer" 
            onClick={() => {
              setIsSearchOpen(true);
              setIsSidebarOpen(false);
              window.history.pushState({ page: 'search' }, '');
            }} 
          />
        </div>
      </nav>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-[1000]"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 w-[270px] h-full glass z-[1001] shadow-2xl flex flex-col"
            >
              <div className="p-6 flex justify-between items-center border-b border-white/5">
                <div className="text-xl font-black text-[#e50914]">PIKCHARBAAZ</div>
                <X className="w-5 h-5 cursor-pointer" onClick={() => setIsSidebarOpen(false)} />
              </div>
              
              <div className="flex-1 py-4 overflow-y-auto">
                <div 
                  className={`px-6 py-4 flex items-center gap-4 cursor-pointer transition-colors ${view === 'home' ? 'active-pill text-white' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => { setView('home'); setIsSidebarOpen(false); }}
                >
                  <Home className="w-5 h-5" />
                  <span className="font-semibold text-sm">Home</span>
                </div>

                <div className="mt-4 px-6 py-2 text-[10px] uppercase font-bold text-zinc-600">Categories</div>
                {GENRES.map(g => (
                  <div 
                    key={g.id}
                    className={`px-6 py-4 flex items-center gap-4 cursor-pointer transition-colors ${view === 'category' && currentGenre?.id === g.id ? 'active-pill text-white' : 'text-zinc-400 hover:text-white'}`}
                    onClick={() => { 
                      setCurrentGenre({id: g.id, name: g.name});
                      setView('category');
                      setIsSidebarOpen(false);
                      setExploreMovies([]);
                      setPage(1);
                    }}
                  >
                    {g.icon === 'zap' && <Zap className="w-5 h-5" />}
                    {g.icon === 'smile' && <Smile className="w-5 h-5" />}
                    {g.icon === 'ghost' && <Ghost className="w-5 h-5" />}
                    <span className="font-semibold text-sm">{g.name}</span>
                  </div>
                ))}

                <div className="mt-4 px-6 py-2 text-[10px] uppercase font-bold text-zinc-600">Your Stuff</div>
                <div 
                  className={`px-6 py-4 flex items-center gap-4 cursor-pointer transition-colors ${view === 'watchlist' ? 'active-pill text-white' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => { setView('watchlist'); setIsSidebarOpen(false); }}
                >
                  <Bookmark className="w-5 h-5" />
                  <span className="font-semibold text-sm">Watchlist</span>
                </div>
                <div 
                  className={`px-6 py-4 flex items-center gap-4 cursor-pointer transition-colors ${view === 'history' ? 'active-pill text-white' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => { setView('history'); setIsSidebarOpen(false); }}
                >
                  <History className="w-5 h-5" />
                  <span className="font-semibold text-sm">History</span>
                </div>

                <div className="mt-4 px-6 py-2 text-[10px] uppercase font-bold text-zinc-600">App</div>
                <div 
                  className="px-6 py-4 flex items-center gap-4 cursor-pointer text-zinc-400 hover:text-white"
                  onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-semibold text-sm">Settings</span>
                </div>
                <div 
                  className="px-6 py-4 flex items-center gap-4 cursor-pointer text-zinc-400 hover:text-white"
                  onClick={shareApp}
                >
                  <Share2 className="w-5 h-5" />
                  <span className="font-semibold text-sm">Share App</span>
                </div>
              </div>
              <div className="p-6 text-center">
                <div className="text-[10px] text-zinc-700 font-bold tracking-widest uppercase">Owner Sumit Yadav</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pt-[70px]">
        
        {/* Search Results */}
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 min-h-screen relative z-10"
          >
            <div className="relative mt-2">
              <div className="flex items-center glass rounded-xl px-4 py-3 shadow-xl">
                <Search className="w-5 h-5 text-zinc-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search Movies globally..."
                  className="flex-1 bg-transparent border-none outline-none text-zinc-200 ml-3 placeholder:text-zinc-600 font-medium"
                  autoFocus
                />
                {searchQuery && (
                  <X 
                    className="w-5 h-5 text-zinc-500 cursor-pointer" 
                    onClick={() => { setSearchQuery(''); setSearchResults([]); }} 
                  />
                )}
              </div>
            </div>

            {!searchQuery && recentSearches.length > 0 && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Recent Searches</h3>
                  <button 
                    onClick={() => { setRecentSearches([]); localStorage.removeItem('pb_rs'); }}
                    className="text-[#e50914] text-xs font-black uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {recentSearches.map((q, i) => (
                    <div 
                      key={i}
                      className="glass p-4 rounded-xl flex items-center justify-between group cursor-pointer active:bg-white/5 transition-colors"
                      onClick={() => handleSearch(q)}
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-zinc-600" />
                        <span className="text-zinc-300 font-medium">{q}</span>
                      </div>
                      <X 
                        className="w-4 h-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecentSearches(prev => {
                            const updated = prev.filter(x => x !== q);
                            localStorage.setItem('pb_rs', JSON.stringify(updated));
                            return updated;
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-lg font-black tracking-tight">Search Results</h2>
                   {isLoading && <Flame className="w-5 h-5 text-[#e50914] animate-pulse" />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    {searchResults.filter((_, i) => i % 2 === 0).map((m, i) => <ListCard key={m.id} movie={m} index={i * 2} onOpen={openMovie} />)}
                  </div>
                  <div className="flex flex-col">
                    {searchResults.filter((_, i) => i % 2 !== 0).map((m, i) => <ListCard key={m.id} movie={m} index={i * 2 + 1} onOpen={openMovie} />)}
                  </div>
                </div>
                {!isLoading && searchQuery.length > 2 && searchResults.length === 0 && (
                   <div className="text-center py-20 text-zinc-600">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold">No movies found for "{searchQuery}"</p>
                      <p className="text-xs mt-2 italic px-10">Try checking for spelling or use simple keywords like "Thor" or "War".</p>
                   </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Regular Views */}
        {!isSearchOpen && (
          <>
            {/* Horizontal Scroll Sections */}
            {view === 'home' && (
              <div className="animate-in fade-in duration-700">
                
                {/* Continue Watching */}
                {watchHistory.length > 0 && (
                   <div className="mt-4">
                    <div className="px-5 flex justify-between items-center mb-4">
                      <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                        Continue Watching 
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto px-5 scrollbar-hide pb-2">
                      {watchHistory.slice(0, 10).map(m => (
                        <MovieCard key={m.id} movie={m} onOpen={openMovie} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Top 10 Section */}
                <div className="mt-8">
                  <div className="px-5 flex justify-between items-center mb-4">
                    <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                      Top 10 in your Region
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto px-5 scrollbar-hide pb-2">
                    {top10.map((m, i) => (
                      <MovieCard key={m.id} movie={m} rank={i + 1} onOpen={openMovie} />
                    ))}
                  </div>
                </div>

                {/* New Releases Section */}
                <div className="mt-8">
                  <div className="px-5 flex justify-between items-center mb-4">
                    <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                      {language === 'hi' ? 'New Hindi Releases' : language === 'ko' ? 'New Korean Dramas' : 'New Releases'}
                      <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                    </h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto px-5 scrollbar-hide pb-2">
                    {newReleases.map(m => (
                      <MovieCard key={m.id} movie={m} onOpen={openMovie} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* List Views (Watchlist / History) */}
            {(view === 'watchlist' || view === 'history' || view === 'category' || view === 'actor') && (
              <div className="px-5 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-xl font-black mb-6 tracking-tight flex items-center gap-3">
                  {view === 'watchlist' && <><Bookmark className="w-5 h-5 text-[#e50914]" /> My Watchlist</>}
                  {view === 'history' && <><History className="w-5 h-5 text-[#e50914]" /> Watch History</>}
                  {view === 'category' && currentGenre && <><Zap className="w-5 h-5 text-[#e50914]" /> {currentGenre.name} Movies</>}
                  {view === 'actor' && currentActor && <><span className="text-[#e50914]">Movies of</span> {currentActor.name}</>}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    {(view === 'watchlist' ? watchlist : view === 'history' ? watchHistory : exploreMovies).filter((_, i) => i % 2 === 0).map((m, i) => <ListCard key={m.id} movie={m} index={i * 2} onOpen={openMovie} />)}
                  </div>
                  <div className="flex flex-col">
                    {(view === 'watchlist' ? watchlist : view === 'history' ? watchHistory : exploreMovies).filter((_, i) => i % 2 !== 0).map((m, i) => <ListCard key={m.id} movie={m} index={i * 2 + 1} onOpen={openMovie} />)}
                  </div>
                </div>

                {(view === 'watchlist' ? watchlist : view === 'history' ? watchHistory : exploreMovies).length === 0 && (
                   <div className="text-center py-40 text-zinc-700">
                      <div className="text-4xl mb-4">📭</div>
                      <p className="font-bold uppercase tracking-widest text-xs">List is empty</p>
                   </div>
                )}
              </div>
            )}

            {/* Explore Section (Home Grid) */}
            {view === 'home' && (
              <div className="mt-12 px-5">
                <h2 className="text-lg font-black mb-6 tracking-tight">Explore More</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    {exploreMovies.filter((_, i) => i % 2 === 0).map((m, i) => <ListCard key={m.id} movie={m} index={i * 2} onOpen={openMovie} />)}
                  </div>
                  <div className="flex flex-col">
                    {exploreMovies.filter((_, i) => i % 2 !== 0).map((m, i) => <ListCard key={m.id} movie={m} index={i * 2 + 1} onOpen={openMovie} />)}
                  </div>
                </div>
              </div>
            )}

            {/* Global Loader */}
            {(isLoading || !hasMore) && (
              <div className="py-10 flex flex-col items-center justify-center gap-2">
                {isLoading ? (
                   <Flame className="w-8 h-8 text-[#e50914] animate-pulse" />
                ) : (
                   <div className="text-zinc-700 font-bold uppercase tracking-widest text-[10px]">End of Results</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Movie Modal */}
      <AnimatePresence>
        {selectedMovieId && movieDetails && (
          <motion.div 
            initial={{ opacity: 0, y: '20vh' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100vh' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[2000] bg-[#0a0a0c] overflow-y-auto"
          >
            <div className="mesh-bg opacity-50" />
            
            {/* Hero Image */}
            <div className="relative w-full h-[38vh]">
              <img 
                src={movieDetails.backdrop_path ? `${IMAGE_ORIGINAL_URL}${movieDetails.backdrop_path}` : `${IMAGE_BASE_URL}${movieDetails.poster_path}`} 
                className="w-full h-full object-cover"
                style={{ 
                  maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' 
                }}
              />
              <div 
                className="absolute top-5 left-5 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-md cursor-pointer border border-white/10"
                onClick={closeModal}
              >
                <X className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-5 pb-20 -mt-12 relative z-10">
              <h1 className="text-3xl font-black leading-tight drop-shadow-lg">{movieDetails.title}</h1>
              
              <div className="flex items-center gap-3 mt-3 text-xs font-bold text-zinc-400">
                <span className="border border-zinc-600 px-2 py-0.5 rounded uppercase text-[10px] text-zinc-500">HD</span>
                <span>{(movieDetails.release_date || '').split('-')[0]}</span>
                <span className="text-yellow-500">★ {movieDetails.vote_average.toFixed(1)}</span>
                <span className="text-zinc-600">{movieDetails.runtime ? `${movieDetails.runtime}m` : ''}</span>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-4">
                
                {activePlayer === 'movie' ? (
                   <div className="aspect-video bg-black rounded-xl overflow-hidden border border-[#e50914]/30 shadow-[0_0_30px_rgba(229,9,20,0.2)]">
                      <iframe 
                        src={`https://vidsrc.pm/embed/movie/${movieDetails.id}`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                   </div>
                ) : activePlayer === 'trailer' ? (
                   <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
                      {movieDetails.videos?.results.find(v => v.type === 'Trailer' || v.type === 'Teaser') ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${movieDetails.videos.results.find(v => v.type === 'Trailer' || v.type === 'Teaser')?.key}?autoplay=1`}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500 border border-white/5 bg-zinc-900/50 rounded-xl">
                          <Youtube className="w-10 h-10 mb-2 opacity-20" />
                          <p className="text-sm font-bold">Trailer not available.</p>
                        </div>
                      )}
                   </div>
                ) : (
                  <button 
                    onClick={() => setActivePlayer('movie')}
                    className="w-full bg-[#e50914] text-white py-4 rounded-xl flex items-center justify-center gap-3 font-black shadow-[0_8px_20px_rgba(229,9,20,0.3)] active:scale-95 transition-transform"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    Play Full Movie
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => toggleWatchlist(movieDetails)}
                    className="glass py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm active:bg-white/10 transition-colors"
                  >
                    {watchlist.find(m => m.id === movieDetails.id) ? (
                      <><Check className="w-4 h-4 text-[#e50914]" /> Added</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Watchlist</>
                    )}
                  </button>
                  <button 
                    onClick={() => shareMovie(movieDetails.title)}
                    className="glass py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm active:bg-white/10 transition-colors"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>

                {activePlayer !== 'trailer' && (
                  <button 
                    onClick={() => setActivePlayer('trailer')}
                    className="w-full glass py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-zinc-400 active:bg-white/10 transition-colors"
                  >
                    <Youtube className="w-4 h-4 text-[#e50914]" /> Watch Trailer
                  </button>
                )}
              </div>

              {/* Description */}
              <div className="mt-10">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#e50914] mb-3">Storyline</h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                  {movieDetails.overview || "Plot details are currently unavailable for this movie."}
                </p>
              </div>

              {/* Cast */}
              {movieDetails.credits?.cast && movieDetails.credits.cast.length > 0 && (
                <div className="mt-10">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#e50914]">Cast</h3>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tight">(Tap Photo for movies)</span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {movieDetails.credits.cast.slice(0, 15).map(c => (
                      <div 
                        key={c.id} 
                        className="flex-shrink-0 w-16 text-center cursor-pointer active:scale-90 transition-transform"
                        onClick={() => {
                          closeModal();
                          setCurrentActor({id: c.id, name: c.name});
                          setView('actor');
                          setExploreMovies([]);
                          setPage(1);
                        }}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/5 mb-2 bg-zinc-900">
                          <img 
                            src={c.profile_path ? `${IMAGE_BASE_URL}${c.profile_path}` : 'https://via.placeholder.com/150'} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-[10px] font-bold text-zinc-500 truncate">{c.name.split(' ')[0]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Streaming Servers (Backup) */}
              <div className="mt-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#e50914] mb-4">Streaming Servers</h3>
                <div className="space-y-2">
                  <div className="p-4 glass rounded-xl flex items-center justify-between opacity-50">
                    <span className="text-sm font-bold flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#e50914] animate-pulse" />
                      Server 1 (High Quality)
                    </span>
                    <span className="text-[10px] font-bold text-[#e50914] uppercase">Fast</span>
                  </div>
                  <button 
                    onClick={() => {
                      const imdbId = movieDetails.external_ids?.imdb_id;
                      const url = imdbId ? `https://www.playimdb.com/title/${imdbId}/` : `https://moviesapi.club/movie/${movieDetails.id}`;
                      setActivePlayer('movie');
                      const playerBox = document.querySelector('iframe');
                      if (playerBox) playerBox.src = url;
                    }}
                    className="w-full p-4 glass rounded-xl flex items-center justify-between text-zinc-300 active:bg-white/10 transition-colors"
                  >
                    <span className="text-sm font-bold flex items-center gap-3">
                      <RotateCcw className="w-4 h-4 text-[#e50914]" />
                      Server 2 (Backup)
                    </span>
                    <div className="bg-white/5 px-2 py-0.5 rounded text-[9px] font-black uppercase text-zinc-400">Auto</div>
                  </button>
                </div>
              </div>

              {/* Similar Movies */}
              {movieDetails.similar?.results && movieDetails.similar.results.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-sm font-black uppercase tracking-widest text-[#e50914] mb-6">More Like This</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      {uniqueMovies(movieDetails.similar.results).filter((_, i) => i % 2 === 0).map((m, i) => <ListCard key={m.id} movie={m} index={i * 2} onOpen={openMovie} />)}
                    </div>
                    <div className="flex flex-col">
                      {uniqueMovies(movieDetails.similar.results).filter((_, i) => i % 2 !== 0).map((m, i) => <ListCard key={m.id} movie={m} index={i * 2 + 1} onOpen={openMovie} />)}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-5"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="glass w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-black tracking-tight">Settings</h3>
                <X className="w-5 h-5 cursor-pointer text-zinc-500" onClick={() => setIsSettingsOpen(false)} />
              </div>
              <div className="p-6">
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-4">Select Movie Language</div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto scrollbar-hide">
                  {LANGUAGES.map(lang => (
                    <button 
                      key={lang.code}
                      onClick={() => setLanguageAndReload(lang.code)}
                      className={`w-full text-left p-4 rounded-xl font-bold transition-all ${language === lang.code ? 'bg-[#e50914] text-white shadow-lg' : 'glass text-zinc-400 active:bg-white/10'}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Analytics />
    </div>
  );
}
