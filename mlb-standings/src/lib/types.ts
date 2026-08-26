export interface StandingsProps {
  teamId: number; 
  standingsType: string;
}

export interface RecordSplit {
  wins: number;
  losses: number;
  pct: string;
  type: string;
};

export interface TeamRecord { 
  team: {
    id: number;
    clubName: string;
    league: { 
      id: number; 
      name: string;
    };
    division: { 
      id: number; 
      name: string;
    };
  };
  sportRank: number;
  divisionRank: string;
  leagueRecord: RecordSplit;
  records: {
    splitRecords: RecordSplit[];
  }
  sportGamesBack: string;
  leagueGamesBack: string;
  divisionGamesBack: string;
  wildCardGamesBack: string;
  eliminationNumberSport: string;
  eliminationNumberLeague: string;
  eliminationNumberDivision: string;
  wildCardEliminationNumber: string;
  gamesPlayed: number;
  runsScored: number;
  runsAllowed: number;
  runDifferential: number;
}

export interface TeamRecordGroup {
  name: string;
  key: string;
  teams: TeamRecord[];
}


export interface StandingsReponse {
  records: {
    teamRecords: TeamRecord[];
  }[];
}

export interface SeasonGamesReponse {
  dates: {
    games: GameRecord[];
  }[];
}

export interface GameRecordTeam {
  isWinner: boolean;
  score: number;
  team: {
    id: number;
    name: string;
    score: number;
  }
}

export interface GameRecord {
  gamePk: number;
  gameDate: string;
  status: {
    statusCode: string;
  };
  teams: {
    away: GameRecordTeam
    home: GameRecordTeam
  };
  linescore: {
    inningHalf: string;
    currentInningOrdinal: string;
  }
}
