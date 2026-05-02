/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Menu, 
  Search, 
  Home, 
  Flame, 
  Laugh, 
  Ghost, 
  Bookmark, 
  History, 
  Settings, 
  X, 
  ChevronRight, 
  Star, 
  Plus, 
  Share2, 
  Check, 
  Play, 
  Youtube,
  WifiOff,
  Loader2,
  Clock
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Movie, ViewType } from './types';
import { 
  TMDB_API_KEY, 
  TMDB_BASE_URL, 
  TMDB_IMAGE_BASE, 
  TMDB_IMAGE_ORIGINAL,
  APP_DOWNLOAD_LINK,
  WEB_LINK
} from './constants';

const App: React.FC = () => {
  // Navigation & UI State
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [currentGenre, setCurrentGenre] = useState<string>('');
  const [genreName, setGenreName] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Data State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [top10, setTop10] = useState<Movie[]>([]);
  const [newReleases, setNewReleases] = useState<Movie[]>([]);
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>(JSON.parse(localStorage.getItem('pb_wl') || '[]'));
  const [watchHistory, setWatchHistory] = useState<Movie[]>(JSON.parse(localStorage.getItem('pb_hs') || '[]'));
  const [recentSearches, setRecentSearches] = useState<string[]>(JSON.parse(localStorage.getItem('pb_rs') || '[]'));
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetching State
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLang, setUserLang] = useState(localStorage.getItem('pb_lang') || '');

  // Media States
  const [activePlayer, setActivePlayer] = useState<'trailer' | 'movie' | null>(null);
  const [moviePlayerUrl, setMoviePlayerUrl] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial Effects
  useEffect(() => {
    const timer = setTimeout(() => setIsSplashVisible(false), 2000);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchTMDB = async (endpoint: string) => {
    try {
      const response = await fetch(`${TMDB_BASE_URL}${endpoint}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('TMDB Fetch Error:', error);
      return null;
    }
  };

  const loadHomeData = async () => {
    setIsLoading(true);
    const langParam = userLang ? `&with_original_language=${userLang}` : '';
    const originParam = userLang ? '' : '&with_origin_country=IN';

    // Top 10
    const top10Data = await fetchTMDB(`/discover/movie?api_key=${TMDB_API_KEY}${originParam}&sort_by=popularity.desc`);
    if (top10Data?.results) setTop10(top10Data.results.filter((m: any) => m.poster_path).slice(0, 10));

    // New Releases
    const newReleasesData = await fetchTMDB(`/movie/now_playing?api_key=${TMDB_API_KEY}&region=IN`);
    if (newReleasesData?.results) setNewReleases(newReleasesData.results.filter((m: any) => m.poster_path));

    // Initial Explore List
    const exploreData = await fetchTMDB(`/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc${langParam}&page=1`);
    if (exploreData?.results) setMovies(exploreData.results.filter((m: any) => m.poster_path));
    
    setIsLoading(false);
  };

  const loadCategoryData = async (id: string) => {
    setIsLoading(true);
    const data = await fetchTMDB(`/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${id}&sort_by=popularity.desc&page=1`);
    if (data?.results) setMovies(data.results.filter((m: any) => m.poster_path));
    setIsLoading(false);
  };

  useEffect(() => {
    if (currentView === 'home') {
      loadHomeData();
    } else if (currentView === 'cat' && currentGenre) {
      loadCategoryData(currentGenre);
    }
    setPage(1);
    setHasMore(true);
  }, [currentView, currentGenre, userLang]);

  useEffect(() => {
    setContinueWatching(watchHistory.slice(0, 10));
  }, [watchHistory]);

  const loadMore = async () => {
    if (isLoading || !hasMore || currentView === 'search' || currentView === 'wl' || currentView === 'hs') return;
    
    setIsLoading(true);
    const nextPage = page + 1;
    let endpoint = '';
    const langParam = userLang ? `&with_original_language=${userLang}` : '';

    if (currentView === 'home') {
      endpoint = `/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc${langParam}&page=${nextPage}`;
    } else if (currentView === 'cat') {
      endpoint = `/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${currentGenre}&sort_by=popularity.desc&page=${nextPage}`;
    }

    const data = await fetchTMDB(endpoint);
    if (data?.results?.length) {
      setMovies(prev => [...prev, ...data.results.filter((m: any) => m.poster_path)]);
      setPage(nextPage);
    } else {
      setHasMore(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, isLoading, hasMore, currentView, currentGenre, userLang]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    const data = await fetchTMDB(`/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
    if (data?.results) setSearchResults(data.results.filter((m: any) => m.poster_path));
    setIsLoading(false);

    if (query.length > 2 && !recentSearches.includes(query)) {
      const newRecent = [query, ...recentSearches.slice(0, 9)];
      setRecentSearches(newRecent);
      localStorage.setItem('pb_rs', JSON.stringify(newRecent));
    }
  };

  const openMovieDetails = async (movieId: number) => {
    const details = await fetchTMDB(`/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,similar,videos,external_ids`);
    if (details) {
      setSelectedMovie(details);
      setIsModalOpen(true);
      setActivePlayer(null);
      setMoviePlayerUrl('');
      
      // Update history
      const newHistory = [details, ...watchHistory.filter(m => m.id !== details.id)].slice(0, 30);
      setWatchHistory(newHistory);
      localStorage.setItem('pb_hs', JSON.stringify(newHistory));
    }
  };

  const toggleWatchlist = () => {
    if (!selectedMovie) return;
    const exists = watchlist.some(m => m.id === selectedMovie.id);
    let newWatchlist;
    if (exists) {
      newWatchlist = watchlist.filter(m => m.id !== selectedMovie.id);
    } else {
      newWatchlist = [selectedMovie, ...watchlist];
    }
    setWatchlist(newWatchlist);
    localStorage.setItem('pb_wl', JSON.stringify(newWatchlist));
  };

  const shareContent = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PikcharBaaz', text });
      } catch (e) {}
    } else {
      navigator.clipboard.writeText(text);
      alert("Link Copied to Clipboard!");
    }
  };

  const deleteFromList = (id: number, type: 'wl' | 'hs') => {
    if (type === 'wl') {
      const newList = watchlist.filter(m => m.id !== id);
      setWatchlist(newList);
      localStorage.setItem('pb_wl', JSON.stringify(newList));
    } else {
      const newList = watchHistory.filter(m => m.id !== id);
      setWatchHistory(newList);
      localStorage.setItem('pb_hs', JSON.stringify(newList));
    }
  };

  // Helper for grid distribution
  const distributeMovies = (movieList: Movie[]) => {
    const left: Movie[] = [];
    const right: Movie[] = [];
    movieList.forEach((m, i) => {
      if (i % 2 === 0) left.push(m);
      else right.push(m);
    });
    return { left, right };
  };

  const MovieCard = ({ movie, index, isShort = false }: { movie: Movie, index: number, isShort?: boolean, key?: any }) => {
    const year = (movie.release_date || '').split('-')[0];
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '0.0';
    // Logic for alternate heights as in user's CSS
    const effectiveIsShort = isShort || (index % 2 === 0 && index % 4 !== 0) || (index % 2 !== 0 && index % 4 !== 1);
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: (index % 10) * 0.05 }}
        className="relative mb-4 group cursor-pointer bg-surface border border-border-subtle rounded-xl p-1.5 hover:border-primary/50 transition-colors shadow-lg"
        onClick={() => openMovieDetails(movie.id)}
      >
        <div className={`relative overflow-hidden rounded-lg bg-[#1a1a1a] ${effectiveIsShort ? 'aspect-video' : 'aspect-[2/3]'}`}>
          <img 
            src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} 
            alt={movie.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute bottom-0 left-0 bg-primary text-white text-[9px] font-black px-2 py-1 z-10 transition-transform origin-left group-hover:scale-110 uppercase tracking-tighter">
            HD
          </div>
        </div>
        <div className="mt-2.5 px-1 pb-1">
          <div className="text-[13px] font-bold truncate leading-tight group-hover:text-primary transition-colors">{movie.title}</div>
          <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-500 font-medium">
            <span>{year}</span>
            <span className="flex items-center gap-1 text-gray-400">
              <Star size={10} fill="currentColor" className="text-yellow-500" /> {rating}
            </span>
          </div>
        </div>
        {currentView === 'wl' || currentView === 'hs' ? (
           <button 
            type="button"
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-red-500 z-20 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove "${movie.title}"?`)) {
                deleteFromList(movie.id, currentView as any);
              }
            }}
           >
             <X size={16} />
           </button>
        ) : null}
      </motion.div>
    );
  };

  const SectionHeader = ({ title, icon: Icon }: { title: string, icon?: any }) => (
    <div className="flex items-center justify-between px-4 my-4 font-bold text-[17px]">
      <span className="flex items-center gap-2">
        {title} {Icon && <Icon size={16} className="text-gray-400" />}
      </span>
      <ChevronRight size={14} className="text-gray-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-main text-white font-sans selection:bg-primary">
      {/* Splash Screen */}
      <AnimatePresence>
        {isSplashVisible && (
          <motion.div 
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 bg-black z-[99999] flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 1.5, opacity: 0, filter: 'blur(15px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              className="text-[42px] font-black text-primary tracking-widest drop-shadow-[0_0_30px_rgba(229,9,20,0.8)]"
            >
              PIKCHARBAAZ
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Alert */}
      {isOffline && (
        <div className="fixed inset-0 bg-bg-main z-[99998] flex flex-col items-center justify-center text-center p-6">
          <WifiOff size={60} className="text-primary mb-4" />
          <h2 className="text-2xl font-bold">No Internet Connection</h2>
          <p className="text-gray-400 mt-2">Please check your connection and try again.</p>
        </div>
      )}

      {/* Navbar */}
      <nav className={`fixed top-0 w-full h-[60px] bg-bg-main flex items-center justify-between px-4 z-[100] transition-shadow duration-300 ${window.scrollY > 10 ? 'shadow-[0_2px_10px_rgba(0,0,0,0.5)]' : ''}`}>
        <div className="flex items-center gap-4">
          <Menu 
            size={24} 
            className="cursor-pointer" 
            onClick={() => setIsSidebarOpen(true)} 
          />
          <div 
            className="text-[22px] font-black text-primary tracking-tight cursor-pointer"
            onClick={() => {
              setCurrentView('home');
              setIsSearchOpen(false);
              window.scrollTo(0, 0);
            }}
          >
            PIKCHARBAAZ
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search 
            size={22} 
            className={`cursor-pointer ${isSearchOpen ? 'text-primary' : ''}`}
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (!isSearchOpen) window.scrollTo(0, 0);
            }} 
          />
        </div>
      </nav>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[999]"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside 
        initial={{ x: -280 }}
        animate={{ x: isSidebarOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 left-0 w-[260px] h-full bg-surface z-[1000] overflow-y-auto border-r border-border-subtle shadow-2xl flex flex-col"
      >
        <div className="p-6 flex justify-between items-center">
          <div className="text-2xl font-black text-primary tracking-tighter">PIKCHARBAAZ</div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="py-2 px-4 flex-1 space-y-1">
          {[
            { id: 'home', label: 'Home', icon: Home, action: () => setCurrentView('home') },
            { id: 'cat', label: 'Action', genre: '28', icon: Flame },
            { id: 'cat', label: 'Comedy', genre: '35', icon: Laugh },
            { id: 'cat', label: 'Horror', genre: '27', icon: Ghost },
            { id: 'wl', label: 'My Watchlist', icon: Bookmark, action: () => setCurrentView('wl') },
            { id: 'hs', label: 'History', icon: History, action: () => setCurrentView('hs') },
            { id: 'settings', label: 'Settings', icon: Settings, action: () => setIsSettingsOpen(true) },
          ].map((item, idx) => {
            const isActive = item.genre ? (currentGenre === item.genre && currentView === 'cat') : (currentView === item.id);
            return (
              <div 
                key={idx}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer font-semibold text-[14px] transition-all duration-300 ${
                  isActive 
                    ? 'text-primary bg-primary/10 shadow-[inset_0_0_20px_rgba(229,9,20,0.05)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.genre) {
                    setCurrentView('cat');
                    setCurrentGenre(item.genre);
                    setGenreName(item.label);
                  }
                  setIsSidebarOpen(false);
                }}
              >
                <item.icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </div>
            );
          })}
        </nav>
        
        <div className="p-6 mt-auto text-center text-[10px] text-gray-600 font-bold tracking-widest uppercase opacity-60">
          Developed by Sumit Yadav
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="pt-[70px] pb-10">
        {/* Search View */}
        {isSearchOpen && (
          <div className="min-h-screen px-4 pt-2 max-w-2xl mx-auto">
            <div className="flex items-center bg-gray-900 border border-border-subtle rounded-full px-5 py-3 shadow-2xl focus-within:border-primary/50 transition-all">
              <Search size={18} className="text-gray-500" />
              <input 
                type="text" 
                placeholder="Search movies globally..."
                className="flex-1 bg-transparent border-none outline-none ml-4 text-[15px] text-white placeholder-gray-600"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {!searchQuery && recentSearches.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm text-gray-400 mb-2 font-bold">
                  Recent Searches
                  <button 
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem('pb_rs');
                    }}
                    className="text-primary hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                {recentSearches.map((term, i) => (
                  <div 
                    key={i} 
                    className="flex justify-between items-center p-3 bg-surface rounded-md border-b border-[#333] cursor-pointer group hover:bg-white/5"
                    onClick={() => handleSearch(term)}
                  >
                    <span className="flex items-center gap-3 text-sm text-gray-300">
                      <Clock size={16} /> {term}
                    </span>
                    <X 
                      size={18} 
                      className="text-red-500 opacity-70 hover:opacity-100" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = recentSearches.filter(t => t !== term);
                        setRecentSearches(next);
                        localStorage.setItem('pb_rs', JSON.stringify(next));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {searchQuery && (
              <>
                <SectionHeader title="Search Results" />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {distributeMovies(searchResults).left.concat(distributeMovies(searchResults).right).map((m, i) => (
                    <MovieCard key={m.id} movie={m} index={i} />
                  ))}
                </div>
                {isLoading && (
                  <div className="flex justify-center p-6">
                    <Loader2 size={32} className="animate-spin text-primary" />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Regular Views */}
        {!isSearchOpen && (
          <>
            {currentView === 'home' && (
              <>
                {/* Hero Banner Section */}
                {top10.length > 0 && (
                  <section className="px-4 mb-8">
                    <div 
                      className="relative rounded-2xl overflow-hidden h-72 group shadow-2xl cursor-pointer"
                      onClick={() => openMovieDetails(top10[0].id)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                      <div className="absolute inset-0 bg-black/20"></div>
                      <div className="absolute left-8 top-1/2 -translate-y-1/2 z-20 max-w-xs">
                        <span className="px-2.5 py-1 bg-primary text-[10px] font-black rounded uppercase tracking-widest mb-3 inline-block">
                          Trending Movie
                        </span>
                        <h2 className="text-3xl font-black mb-2 leading-tight uppercase italic drop-shadow-lg">
                          {top10[0].title}
                        </h2>
                        <p className="text-gray-300 text-[11px] font-medium mb-5 line-clamp-2 opacity-80">
                          {top10[0].overview}
                        </p>
                        <div className="flex items-center gap-3">
                          <button className="bg-white text-black px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all transform active:scale-95 shadow-lg">
                            <Play size={16} fill="black" /> Play Now
                          </button>
                        </div>
                      </div>
                      <img 
                        src={`${TMDB_IMAGE_ORIGINAL}${top10[0].backdrop_path || top10[0].poster_path}`} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        alt="Hero"
                      />
                    </div>
                  </section>
                )}

                {continueWatching.length > 0 && (
                  <div className="mb-4">
                    <SectionHeader title="Continue Watching" />
                    <div className="flex gap-3 overflow-x-auto px-4 hide-scroll">
                      {continueWatching.map((movie) => (
                        <div 
                          key={movie.id}
                          className="w-[130px] shrink-0 cursor-pointer group"
                          onClick={() => openMovieDetails(movie.id)}
                        >
                          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface border border-border-subtle group-hover:border-primary/50 transition-colors shadow-lg">
                            <img 
                              src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} 
                              alt={movie.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-110 opacity-80 group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play fill="white" size={30} strokeWidth={0} />
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
                              <div className="h-full bg-primary w-2/3 shadow-[0_0_8px_rgba(229,9,20,0.8)]"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <SectionHeader title="Top 10 in your Region" icon={Star} />
                <div className="flex gap-3 overflow-x-auto px-4 mb-6 hide-scroll">
                  {top10.map((movie, idx) => (
                    <div key={movie.id} className="relative w-[130px] shrink-0" onClick={() => openMovieDetails(movie.id)}>
                      <div className="absolute -top-1 -left-1 w-9 h-9 bg-primary text-white flex items-center justify-center font-black rounded-full z-10 text-lg border-2 border-bg-main shadow-lg">
                        #{idx + 1}
                      </div>
                      <div className="aspect-[2/3] overflow-hidden rounded-md bg-[#222]">
                        <img 
                          src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} 
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <SectionHeader title={userLang === 'hi' ? 'New Hindi Releases' : 'New Releases'} icon={Flame} />
                <div className="flex gap-3 overflow-x-auto px-4 mb-8 hide-scroll">
                  {newReleases.map(movie => (
                    <div key={movie.id} className="w-[130px] shrink-0" onClick={() => openMovieDetails(movie.id)}>
                      <div className="aspect-[2/3] overflow-hidden rounded-md bg-[#222]">
                        <img src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} alt={movie.title} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 mb-2">
                  <h3 className="text-xl font-bold">Explore More</h3>
                </div>
              </>
            )}

            {(currentView === 'home' || currentView === 'cat') && (
              <div className="grid grid-cols-2 gap-3 px-4">
                <div className="flex flex-col">
                  {distributeMovies(movies).left.map((m, i) => (
                    <MovieCard key={`${m.id}-${i}`} movie={m} index={i} />
                  ))}
                </div>
                <div className="flex flex-col mt-4">
                   {distributeMovies(movies).right.map((m, i) => (
                    <MovieCard key={`${m.id}-${i}`} movie={m} index={i} />
                  ))}
                </div>
              </div>
            )}

            {(currentView === 'wl' || currentView === 'hs') && (
              <div className="px-4 pt-4">
                <h2 className="text-2xl font-bold mb-6">
                  {currentView === 'wl' ? 'My Watchlist' : 'Watch History'}
                </h2>
                { (currentView === 'wl' ? watchlist : watchHistory).length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <p>Your list is currently empty.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      {distributeMovies(currentView === 'wl' ? watchlist : watchHistory).left.map((m, i) => (
                        <MovieCard key={m.id} movie={m} index={i} />
                      ))}
                    </div>
                    <div className="flex flex-col mt-4">
                      {distributeMovies(currentView === 'wl' ? watchlist : watchHistory).right.map((m, i) => (
                        <MovieCard key={m.id} movie={m} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center p-8">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            )}
          </>
        )}
      </main>

      {/* Movie Details Modal */}
      <AnimatePresence>
        {isModalOpen && selectedMovie && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 bg-bg-main z-[2000] overflow-y-auto"
          >
            <div className="relative">
              {/* Hero Image */}
              <div className="w-full h-[35vh] relative overflow-hidden">
                <img 
                  src={selectedMovie.backdrop_path ? `${TMDB_IMAGE_ORIGINAL}${selectedMovie.backdrop_path}` : `${TMDB_IMAGE_BASE}${selectedMovie.poster_path}`} 
                  alt={selectedMovie.title}
                  className="w-full h-full object-cover"
                  style={{
                    maskImage: 'linear-gradient(to bottom, black 40%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent)'
                  }}
                />
                <button 
                  className="absolute top-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white z-10"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Details Body */}
              <div className="px-4 pb-10 -mt-12 relative z-[5]">
                <h1 className="text-3xl font-black leading-tight mb-2 uppercase italic">{selectedMovie.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-400 font-bold mb-5">
                  <span className="border border-gray-500 px-1.5 py-0.5 rounded text-[10px]">HD</span>
                  <span>{(selectedMovie.release_date || '').split('-')[0]}</span>
                  <span className="flex items-center gap-1 text-yellow-500">
                    <Star size={12} fill="currentColor" /> {selectedMovie.vote_average.toFixed(1)}
                  </span>
                </div>

                {/* Trailer Toggle Button */}
                {selectedMovie.videos?.results.find(v => v.type === 'Trailer') && (
                  <button 
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 mb-4 shadow-xl transform active:scale-95 transition-all ${
                      activePlayer === 'trailer' 
                        ? 'bg-white text-black' 
                        : 'bg-surface border border-border-subtle text-white hover:bg-surface-hover'
                    }`}
                    onClick={() => {
                      if (activePlayer === 'trailer') {
                        setActivePlayer(null);
                      } else {
                        setActivePlayer('trailer');
                      }
                    }}
                  >
                    <Youtube size={20} className={activePlayer === 'trailer' ? 'text-red-600' : 'text-red-500'} /> 
                    {activePlayer === 'trailer' ? 'HIDE TRAILER' : 'WATCH TRAILER'}
                  </button>
                )}

                {/* Trailer Player Container */}
                {activePlayer === 'trailer' && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 border border-[#333]">
                    <iframe 
                      src={`https://www.youtube.com/embed/${selectedMovie.videos?.results.find(v => v.type === 'Trailer')?.key}?autoplay=1&mute=0`}
                      className="w-full h-full border-none"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Movie Player Container */}
                {activePlayer === 'movie' && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-5 border border-primary/30 shadow-[0_5px_20px_rgba(229,9,20,0.3)]">
                    <iframe 
                      src={moviePlayerUrl}
                      className="w-full h-full border-none"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Main Play Button */}
                <button 
                  className="w-full bg-primary text-white py-4 rounded-lg font-black text-lg flex items-center justify-center gap-3 mb-4 shadow-[0_4px_15px_rgba(229,9,20,0.4)] active:scale-95 transition-transform"
                  onClick={() => {
                    const ib = selectedMovie.external_ids?.imdb_id;
                    const url = ib ? `https://www.playimdb.com/title/${ib}/` : `https://moviesapi.club/movie/${selectedMovie.id}`;
                    setMoviePlayerUrl(url);
                    setActivePlayer('movie');
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                >
                  <Play size={20} fill="currentColor" /> PLAY FULL MOVIE
                </button>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-8">
                  <button 
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors ${
                      watchlist.some(m => m.id === selectedMovie.id) 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-[#222] text-white'
                    }`}
                    onClick={toggleWatchlist}
                  >
                    {watchlist.some(m => m.id === selectedMovie.id) ? <Check size={18} /> : <Plus size={18} />}
                    Watchlist
                  </button>
                  <button 
                    className="flex-1 bg-[#222] text-white py-3 rounded-lg flex items-center justify-center gap-2 font-bold"
                    onClick={() => shareContent(`🎬 Watch "${selectedMovie.title}" in HD on PikcharBaaz!\n\n👉 Download App: ${APP_DOWNLOAD_LINK}\n👉 Watch Online: ${WEB_LINK}`)}
                  >
                    <Share2 size={18} />
                    Share
                  </button>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3">Storyline</h3>
                  <p className="text-[13.5px] leading-relaxed text-gray-300">
                    {selectedMovie.overview || 'No description available for this movie.'}
                  </p>
                </div>

                {selectedMovie.credits?.cast && selectedMovie.credits.cast.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3">Top Cast</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2 hide-scroll">
                      {selectedMovie.credits.cast.slice(0, 10).map(person => (
                        person.profile_path && (
                          <div key={person.id} className="w-[65px] shrink-0 text-center">
                            <img 
                              src={`${TMDB_IMAGE_BASE}${person.profile_path}`} 
                              alt={person.name} 
                              className="w-[60px] h-[60px] rounded-full object-cover border-2 border-white/10 mx-auto"
                            />
                            <p className="mt-1 text-[10px] text-gray-400 truncate w-full">{person.name}</p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-3">Streaming Servers</h3>
                  <div className="flex flex-col gap-2">
                    {[
                      { name: 'Server 2 (Fast)', type: '1080p', url: `https://moviesapi.club/movie/${selectedMovie.id}` },
                      { name: 'Server 3 (HD)', type: 'HD', url: `https://vidlink.pro/movie/${selectedMovie.id}` },
                      { name: 'Server 4 (Backup)', type: 'Auto', url: `https://vidsrc.pm/embed/movie/${selectedMovie.id}` }
                    ].map((srv, i) => (
                      <div 
                        key={i}
                        className="bg-surface border border-border-subtle p-4 rounded-xl flex justify-between items-center cursor-pointer hover:bg-surface-hover hover:border-gray-700 active:scale-[0.98] transition-all"
                        onClick={() => {
                          setMoviePlayerUrl(srv.url);
                          setActivePlayer('movie');
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-[14px]">{srv.name}</span>
                          <span className="text-[10px] text-primary font-black uppercase tracking-widest leading-none">Ultra Streaming</span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest border border-border-subtle px-2 py-1 rounded bg-black/30">{srv.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMovie.similar?.results && selectedMovie.similar.results.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-4">More Like This</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedMovie.similar.results.slice(0, 6).map((movie, idx) => (
                        movie.poster_path && (
                          <MovieCard 
                            key={movie.id} 
                            movie={movie} 
                            index={idx} 
                            isShort={idx % 2 === 0} 
                          />
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
            className="fixed inset-0 bg-black/85 z-[3000] flex items-center justify-center p-5 backdrop-blur-sm"
          >
            <div className="bg-[#0a0a0a] w-full max-w-[380px] rounded-2xl border border-border-subtle overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)]">
              <div className="bg-surface p-5 flex justify-between items-center font-black text-lg border-b border-border-subtle tracking-tight">
                SETTINGS
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                <div className="text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2 opacity-70">Preference</div>
                {[
                  { code: '', label: 'All Languages' },
                  { code: 'hi', label: 'Hindi (Bollywood)' },
                  { code: 'en', label: 'English (Hollywood)' },
                  { code: 'te', label: 'Telugu (Tollywood)' },
                  { code: 'ta', label: 'Tamil (Kollywood)' },
                  { code: 'es', label: 'Spanish' },
                  { code: 'ko', label: 'Korean (K-Drama)' },
                  { code: 'ja', label: 'Japanese (Anime)' },
                  { code: 'fr', label: 'French' },
                ].map((lang) => (
                  <button 
                    key={lang.code}
                    className={`p-4 rounded-xl text-left font-bold text-[14px] flex justify-between items-center transition-all duration-300 transform active:scale-[0.98] ${
                      userLang === lang.code 
                        ? 'bg-primary text-white shadow-[0_0_20px_rgba(229,9,20,0.3)]' 
                        : 'bg-surface border border-border-subtle text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                    onClick={() => {
                      setUserLang(lang.code);
                      localStorage.setItem('pb_lang', lang.code);
                      setIsSettingsOpen(false);
                      setCurrentView('home');
                    }}
                  >
                    {lang.label}
                    {userLang === lang.code && <Check size={18} strokeWidth={3} />}
                  </button>
                ))}
                
                <button 
                  className="mt-6 bg-[#25D366] text-white p-4 rounded-xl font-black flex items-center justify-center gap-3 shadow-xl transform active:scale-95 transition-all hover:brightness-110"
                  onClick={() => shareContent(`🔥 Download PikcharBaaz - Best App for Free Movies in HD!\n\n👉 Download App: ${APP_DOWNLOAD_LINK}\n👉 Watch Online: ${WEB_LINK}`)}
                >
                  <Share2 size={20} /> SHARE APP
                </button>
                <div className="mt-6 text-center text-[9px] text-gray-700 font-black tracking-[0.3em] uppercase opacity-50">
                  Developed by Sumit Yadav
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
