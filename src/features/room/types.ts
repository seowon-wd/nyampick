/** Supabase 행 그대로의 모양 (함께 고르기). */
export interface Room {
  id: string;
  code: string;
  host_id: string;
  closed_at: string | null;
  winner_menu_id: string | null;
}

export interface Member {
  user_id: string;
  nickname: string;
}

export interface Candidate {
  id: number;
  menu_id: string;
  created_at: string;
}

export interface Vote {
  user_id: string;
  candidate_id: number;
}

export interface RoomSnapshot {
  room: Room;
  members: Member[];
  candidates: Candidate[];
  votes: Vote[];
}
