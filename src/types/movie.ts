export interface Movie {
  id: string;
  title: string;
  year: number;
  genre: string[];
  synopsis: string;
  posterUrl: string;
  averageRating: number;
  reviewCount: number;
  cast: CastMember[];
}

export interface CastMember {
  actorId: string;
  actorName: string;
  characterName: string;
}

export interface MovieSummary {
  id: string;
  title: string;
  year: number;
  genre: string[];
  posterUrl: string;
  averageRating: number;
  reviewCount: number;
}

export interface PaginatedMovies {
  movies: MovieSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
