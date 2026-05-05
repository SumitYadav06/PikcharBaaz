/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  overview?: string;
  genres?: { id: number; name: string }[];
  runtime?: number;
}

export interface CastMember {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface Video {
  key: string;
  type: string;
}

export interface MovieDetails extends Movie {
  credits?: {
    cast: CastMember[];
  };
  videos?: {
    results: Video[];
  };
  similar?: {
    results: Movie[];
  };
  external_ids?: {
    imdb_id: string | null;
  };
}
