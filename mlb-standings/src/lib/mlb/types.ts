// Minimal typings for the parts of the MLB StatsAPI responses this app consumes.
// https://statsapi.mlb.com/api/v1/...

export interface SplitRecord {
	type: string;
	wins: number;
	losses: number;
}

export interface TeamRecords {
	splitRecords: SplitRecord[];
}

/** A single team's record inside the standings response. */
export interface RawTeamRecord {
	team: {
		id: number;
		clubName: string;
		abbreviation: string;
		league: { name: string };
		division: { name: string };
	};
	gamesPlayed: number;
	// The StatsAPI returns all rank fields as strings, e.g. "1", "2".
	sportRank: string;
	sportGamesBack: string;
	eliminationNumberSport: string;
	leagueRank: string;
	leagueGamesBack: string;
	eliminationNumberLeague: string;
	divisionRank: string;
	divisionGamesBack: string;
	eliminationNumberDivision: string;
	wildCardRank?: string;
	wildCardGamesBack: string;
	wildCardEliminationNumber: string;
	runDifferential: number;
	runsAllowed: number;
	runsScored: number;
	records: TeamRecords;
	wins: number;
	losses: number;
}

export interface StandingsResponse {
	records: Array<{ teamRecords: RawTeamRecord[] }>;
}

export interface RawProbablePitcher {
	fullName: string;
	pitchHand: { code: string };
}

export interface RawScheduleTeam {
	team: { id: number };
	score?: number;
	probablePitcher?: RawProbablePitcher;
}

export interface RawLinescore {
	inningHalf?: string;
	currentInningOrdinal?: string;
}

export interface RawScheduleGame {
	gamePk: number;
	gameDate: string;
	gameType: string;
	seriesDescription?: string;
	status: { statusCode: string };
	teams: {
		home: RawScheduleTeam;
		away: RawScheduleTeam;
	};
	linescore?: RawLinescore;
}

export interface ScheduleResponse {
	dates: Array<{ games: RawScheduleGame[] }>;
}

/** A game element from the linescore hydrate, matched to a schedule game by gamePk. */
export interface LinescoreGame {
	gamePk: number;
	linescore?: RawLinescore;
}

export type View = 'sport' | 'all' | 'league' | 'division' | 'wildcard' | 'playoffs';
