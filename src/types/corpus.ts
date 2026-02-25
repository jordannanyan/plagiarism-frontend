export type CorpusItem = {
  id: number;
  title: string;
  filename?: string;
  mime?: string;
  size?: number;
  is_active: 0 | 1;
  created_at?: string;
  updated_at?: string;
};

export type ApiListResponse<T> = {
  ok?: boolean;
  data: T;
  message?: string;
};