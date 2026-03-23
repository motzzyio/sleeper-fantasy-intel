export interface NFLState {
  week: number;
  season: string;
  season_type: string;
  season_start_date: string;
  display_week: number;
}

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface League {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  status: string;
  total_rosters: number;
  roster_positions: string[];
  settings: LeagueSettings;
  scoring_settings: ScoringSettings;
}

export interface LeagueSettings {
  num_teams: number;
  playoff_teams: number;
  trade_deadline: number;
  best_ball: number;
  waiver_type: number;
  draft_rounds: number;
}

export interface ScoringSettings {
  rec: number;
  pass_td: number;
  rush_td: number;
  rec_td: number;
  pass_yd: number;
  rush_yd: number;
  rec_yd: number;
  [key: string]: number;
}

export interface Roster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players: string[];
  starters: string[];
  settings: RosterSettings;
}

export interface RosterSettings {
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fpts_decimal: number;
  fpts_against: number;
  fpts_against_decimal: number;
}

export interface LeagueUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface Draft {
  draft_id: string;
  league_id: string;
  season: string;
  type: string;
  status: string;
  settings: {
    rounds: number;
    teams: number;
  };
}

export interface DraftPick {
  round: number;
  roster_id: number;
  player_id: string;
  picked_by: string;
  pick_no: number;
  draft_slot: number;
  metadata: {
    first_name: string;
    last_name: string;
    position: string;
    team: string;
    years_exp: string;
  };
}

export interface Matchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  starters: string[];
  players: string[];
}

export interface Transaction {
  type: string;
  transaction_id: string;
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  roster_ids: number[];
  created: number;
}

export interface TrendingPlayer {
  player_id: string;
  count: number;
}

// Sleeper /players/nfl returns a map of player_id -> PlayerInfo
export interface PlayerInfo {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  status: string | null;
  injury_status: string | null;
}

export type PlayerMap = Record<string, PlayerInfo>;
