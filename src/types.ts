export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
  overview?: string;
  genres?: { id: number; name: string }[];
  credits?: {
    cast: {
      id: number;
      name: string;
      profile_path: string;
    }[];
  };
  videos?: {
    results: {
      key: string;
      type: string;
    }[];
  };
  external_ids?: {
    imdb_id: string;
  };
  similar?: {
    results: Movie[];
  };
}

export type ViewType = 'home' | 'cat' | 'search' | 'wl' | 'hs';
