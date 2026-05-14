import { Database } from '@shared/models/database.types';

// ─── Domain models ───────────────────────────────────────────


export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface Message {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  profile?: Profile;
}

export interface OnlineUser {
  user_id: string;
  username: string;
  online_at: string;
};

export interface SendMessagePayload {
  content?: string;
  imageFile?: File;
}

export type AuthError = {
  message: string;
  status?: number;
};
