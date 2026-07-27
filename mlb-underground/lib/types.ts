export type Feed = {
  mediaId: string;
  feedType: string;
  teamId: number;
  location: string;
  callLetters: string;
}
  
export type Game = {
  gameId: number;
  gameDate: string;
  title: string;
  description: string;
  venue: string;
  status: string;
  category: string;
  feeds: Feed[];
  summary: Summary;
}

export type Summary = {
  home: {
    name: string;
    runs: number;
    hits: number;
    errors: number;
  },
  away: {
    name: string;
    runs: number;
    hits: number;
    errors: number;
  },
  player_1: {
    name: string;
    stats: string;
    id: number;
  },
  player_2: {
    name: string;
    stats: string;
    id: number;
  },
  first: string;
  second: string;
  third: string;
  balls: number;
  strikes: number;
  outs: number;
}

export type StreamError = {
  message: string;
  data: LoginKeys;
}
  
export type Stream = {
  url: string;
  startTime: string;
  errors: StreamError[];
}
  
export interface Line {
  gameState: string;
  currentInning: number;
  inningState: string;
  labels: string[];
  top: string[];
  bottom: string[];
}

export interface PreviewDetails {
  title: string;
  description: string;
  away: string;
  awayId: string;
  home: string;
  homeId: string;
}

export interface Roster {
  key: string;
  players: RosterPlayer[];
}

export interface RosterPitchers {
  key: string;
  players: RosterPitcher[];
}
export interface RosterBatters {
  key: string;
  players: RosterBatter[];
}

export interface RosterPlayer {
  title: string;
  depth: string;
}

export interface RosterPitcher {
  title: string;
  depth: string;
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  era: string;  
}
export interface RosterBatter {
  title: string;
  depth: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  lob: number;
  avg: string;
  ops: string;
}


export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  batting: RosterBatters;
  pitching: RosterPitchers;
  bench: RosterBatters;
  bullpen: RosterPitchers;
}

export interface TeamsDetails {
  away: Team;
  home: Team;
}
export interface GameData {
  title: string;
  gameId: string;
  status: string;
  linescore: Line;
  preview: PreviewDetails;
  teams: TeamsDetails,
  matchup: MatchupDetails;
  wrap: WrapDetails;
  events: EventInning[];
}

export interface MatchupDetailsPlayer {
  id: string;
  title: string;
  stats: string; 
}

export interface MatchupDetails {
  pitcher: MatchupDetailsPlayer,
  batter: MatchupDetailsPlayer,
  onDeck: MatchupDetailsPlayer,  
  inHole: MatchupDetailsPlayer
}

export interface WrapDetails {
  title: string;
  winner: string;
  winnerId: string;
  loser: string;
  loserId: string;
}

export interface EventInningEvent {
  title: string;
  playerId: string;
}

export interface EventInning {
  title: string
  events: EventInningEvent[]
}

export type LoginKeys = {
  username: string;
  password: string;
}

export type GamesJson = {
    dates: {
        games: GameJson[]
    }[]
}

export type PlayerJson = {
    jerseyNumber: string;
    id: number,
    fullName: string,
    pitchHand: {
        code: string
    },
    batSide: {
        code: string
    }
    stats: {
        group: {
            displayName: string
        },
        type: {
            displayName: string
        },
        stats: {
            summary: string,
            numberOfPitches: number
        },
    }[],
    person: {
        id: number,
        fullName: string
    }
}

export type LivePlayerJson = {
    jerseyNumber: string;
    battingOrder: number;
    batSide: {
        code: string
    },
    position: {
        abbreviation: string
    },
    person: {
        id: number,
        fullName: string,
    },
    stats: {
        batting: {
            atBats: number,
            runs: number,
            hits: number,
            rbi: number,
            baseOnBalls: number,
            strikeOuts: number,
            leftOnBase: number,
        },
        pitching: {
            era: string,
            inningsPitched: string,
            gamesPlayed: number,
            hits: number,
            runs: number,
            earnedRuns: number,
            baseOnBalls: number,
            strikeOuts: number,
            homeRuns: number,
            pitchesThrown: number,
            strikes: number
        }
    }
    seasonStats: {    
        batting: {
            avg: string,
            ops: string,
            atBats: number,
            runs: number,
            hits: number,
            rbi: number,
            baseOnBalls: number,
            strikeOuts: number,
            leftOnBase: number,
            homeRuns: number
        },
        pitching: {
            era: string,
            inningsPitched: string,
            gamesPlayed: number,
            ip: string,
            homeRuns: number,
            hits: number,
            runs: number,
            earnedRuns: number,
            baseOnBalls: number,
            strikeOuts: number,
            wins: number,
            losses: number
        }
    }
}

type TeamJson = {
    team: {
        name: string,
        id: number,
        abbreviation: string
    },
    probablePitcher: PlayerJson
}

export type GameJson = {
    gamePk: number,
    gameDate: string,
    description: string,
    datetime: {
        dateTime: string
    }
    gameNumber: number,
    doubleHeader: string,
    status: {
        detailedState: string,
        abstractGameState: string,
        reason: string,
        startTimeTBD: boolean
    },
    teams: {
        away: TeamJson,
        home: TeamJson,
    },
    venue: {
        name: string
    }
    broadcasts: {
        mediaId: string,
        availableForStreaming: boolean,
        homeAway: string,
        type: string,
        callSign: string,
        language: string
    }[],
    linescore: {
        inningState: string,
        currentInningOrdinal: number,
        defense: {
            pitcher: PlayerJson,
        },
        offense: {
            batter: PlayerJson,
            first: PlayerJson,
            second: PlayerJson,
            third: PlayerJson
        },
        balls: number,
        strikes: number,
        outs: number,
        innings: {
            home: {
                runs: number,
                hits: number,
                errors: number
            },
            away: {
                runs: number,
                hits: number,
                errors: number
            }
        }[]
    },
    decisions: {
        winner: PlayerJson,
        loser: PlayerJson
    }
}
