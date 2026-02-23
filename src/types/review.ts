export interface Review {
  id: string;
  movieId: string;
  userId: string;
  authorDisplayName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

export interface CreateReviewInput {
  rating: number;
  title: string;
  body: string;
}
