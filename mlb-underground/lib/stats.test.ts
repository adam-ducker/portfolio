/**
 * @jest-environment node
 */
import { gamesData, buildGameData, sortGames, LiveJson } from './stats';
import { GamesJson, Game } from './types';

// These functions transform large MLB StatsAPI payloads, so the fixtures below
// are partial — only the fields each code path reads — cast to the full type.
// startTimeTBD is kept true throughout so no path calls date-fns format() with
// a raw string (which the app does at runtime but jsdom/date-fns can't parse here).

describe('gamesData', () => {
  const scheduledGame = {
    gamePk: 745001,
    gameDate: '2026-07-25T23:05:00Z',
    description: '',
    datetime: { dateTime: '2026-07-25T23:05:00Z' },
    gameNumber: 1,
    doubleHeader: 'N',
    status: {
      detailedState: 'Scheduled',
      abstractGameState: 'Preview',
      reason: '',
      startTimeTBD: true,
    },
    teams: {
      away: {
        team: { name: 'Chicago White Sox', id: 145, abbreviation: 'CWS' },
        probablePitcher: {
          id: 5001,
          fullName: 'Away Ace',
          pitchHand: { code: 'L' },
          stats: [
            {
              group: { displayName: 'pitching' },
              type: { displayName: 'statsSingleSeason' },
              stats: { summary: '3.10 ERA' },
            },
          ],
        },
      },
      home: {
        team: { name: 'Chicago Cubs', id: 112, abbreviation: 'CHC' },
        probablePitcher: {
          id: 6001,
          fullName: 'Home Ace',
          pitchHand: { code: 'R' },
          stats: [
            {
              group: { displayName: 'pitching' },
              type: { displayName: 'statsSingleSeason' },
              stats: { summary: '2.80 ERA' },
            },
          ],
        },
      },
    },
    venue: { name: 'Rate Field' },
    linescore: { innings: [] },
  };

  const finalGame = {
    gamePk: 745002,
    gameDate: '2026-07-24T23:05:00Z',
    description: '',
    datetime: { dateTime: '2026-07-24T23:05:00Z' },
    gameNumber: 1,
    doubleHeader: 'N',
    status: {
      detailedState: 'Final',
      abstractGameState: 'Final',
      reason: '',
      startTimeTBD: false,
    },
    teams: {
      away: { team: { name: 'Away Team', id: 1, abbreviation: 'AWY' } },
      home: { team: { name: 'Home Team', id: 2, abbreviation: 'HOM' } },
    },
    venue: { name: 'Generic Park' },
    linescore: {
      innings: [
        { home: { runs: 1, hits: 2, errors: 0 }, away: { runs: 0, hits: 1, errors: 1 } },
        { home: { runs: 2, hits: 3, errors: 0 }, away: { runs: 0, hits: 0, errors: 0 } },
      ],
    },
    decisions: {
      winner: {
        id: 700,
        fullName: 'Win Pitcher',
        pitchHand: { code: 'R' },
        stats: [
          {
            group: { displayName: 'pitching' },
            type: { displayName: 'gameLog' },
            stats: { summary: '7.0 IP, 1 ER' },
          },
        ],
      },
      loser: {
        id: 800,
        fullName: 'Lose Pitcher',
        pitchHand: { code: 'L' },
        stats: [
          {
            group: { displayName: 'pitching' },
            type: { displayName: 'gameLog' },
            stats: { summary: '6.0 IP, 3 ER' },
          },
        ],
      },
    },
  };

  const json = {
    dates: [{ games: [scheduledGame, finalGame] }],
  } as unknown as GamesJson;

  it('returns one entry per game with the away @ home title', () => {
    const games = gamesData(json);
    expect(games).toHaveLength(2);
    expect(games[0].title).toBe('Chicago White Sox @ Chicago Cubs');
    expect(games[1].title).toBe('Away Team @ Home Team');
  });

  it('maps renamed venues via switchVenues', () => {
    const [scheduled] = gamesData(json);
    expect(scheduled.venue).toBe('Comiskey Park'); // 'Rate Field' -> 'Comiskey Park'
  });

  it('derives status/category for a scheduled game and its probable pitchers', () => {
    const [scheduled] = gamesData(json);
    expect(scheduled.category).toBe('scheduled');
    expect(scheduled.status).toBe('First pitch at TBD');
    expect(scheduled.summary.home.name).toBe('CHC');
    expect(scheduled.summary.player_1.name).toBe('CHC: Home Ace - RHP');
    expect(scheduled.summary.player_1.stats).toBe('2.80 ERA');
    expect(scheduled.summary.player_2.name).toBe('CWS: Away Ace - LHP');
  });

  it('adds two Clips feeds per game keyed by slugified team name', () => {
    const [scheduled] = gamesData(json);
    expect(scheduled.feeds).toHaveLength(2);
    expect(scheduled.feeds.map((f) => f.feedType)).toEqual(['Clips', 'Clips']);
    expect(scheduled.feeds[0].mediaId).toBe('chicago-cubs');
    expect(scheduled.feeds[1].mediaId).toBe('chicago-white-sox');
  });

  it('totals R/H/E and names the decision pitchers for a final game', () => {
    const finalResult = gamesData(json)[1];
    expect(finalResult.status).toBe('Final');
    expect(finalResult.category).toBe('final');
    expect(finalResult.summary.home.runs).toBe(3); // 1 + 2
    expect(finalResult.summary.home.hits).toBe(5); // 2 + 3
    expect(finalResult.summary.away.runs).toBe(0);
    expect(finalResult.summary.away.errors).toBe(1);
    expect(finalResult.summary.player_1.name).toBe('W: Win Pitcher - RHP');
    expect(finalResult.summary.player_1.stats).toBe('7.0 IP, 1 ER');
    expect(finalResult.summary.player_2.name).toBe('L: Lose Pitcher - LHP');
  });
});

describe('buildGameData', () => {
  const makeBatter = (
    id: number,
    fullName: string,
    jerseyNumber: string,
    battingOrder: number,
    game: { hits: number; atBats: number },
    season: { avg: string; ops: string; homeRuns: number }
  ) => ({
    jerseyNumber,
    battingOrder,
    batSide: { code: 'R' },
    position: { abbreviation: 'CF' },
    person: { id, fullName },
    stats: { batting: { hits: game.hits, atBats: game.atBats }, pitching: {} },
    seasonStats: {
      batting: { avg: season.avg, ops: season.ops, homeRuns: season.homeRuns },
      pitching: {},
    },
  });

  const pitcher = {
    jerseyNumber: '45',
    battingOrder: 0,
    batSide: { code: 'R' },
    position: { abbreviation: 'P' },
    person: { id: 200, fullName: 'Ace Pitcher' },
    stats: { batting: {}, pitching: { inningsPitched: '6.0', pitchesThrown: 88, strikes: 60 } },
    seasonStats: { batting: {}, pitching: { era: '2.50' } },
  };

  const homePlayers = {
    ID100: makeBatter(100, 'Lead Off', '9', 100, { hits: 2, atBats: 4 }, { avg: '.305', ops: '.850', homeRuns: 12 }),
    ID101: makeBatter(101, 'Second Bat', '10', 200, { hits: 1, atBats: 3 }, { avg: '.280', ops: '.790', homeRuns: 8 }),
    ID102: makeBatter(102, 'Third Bat', '11', 300, { hits: 0, atBats: 2 }, { avg: '.312', ops: '.900', homeRuns: 20 }),
    ID103: makeBatter(103, 'Cleanup', '12', 400, { hits: 1, atBats: 4 }, { avg: '.270', ops: '.760', homeRuns: 15 }),
    ID104: makeBatter(104, 'Fifth', '13', 500, { hits: 0, atBats: 3 }, { avg: '.250', ops: '.700', homeRuns: 5 }),
    ID105: makeBatter(105, 'Sixth', '14', 600, { hits: 2, atBats: 3 }, { avg: '.290', ops: '.810', homeRuns: 10 }),
    ID106: makeBatter(106, 'Seventh', '15', 700, { hits: 1, atBats: 2 }, { avg: '.240', ops: '.680', homeRuns: 3 }),
    ID107: makeBatter(107, 'Eighth', '16', 800, { hits: 0, atBats: 4 }, { avg: '.220', ops: '.640', homeRuns: 2 }),
    ID108: makeBatter(108, 'Ninth', '17', 900, { hits: 1, atBats: 3 }, { avg: '.260', ops: '.720', homeRuns: 7 }),
  };

  const json = {
    gamePk: '745100',
    liveData: {
      linescore: {
        inningState: 'Bottom',
        currentInningOrdinal: 1,
        scheduledInnings: 9,
        innings: [
          {
            num: 1,
            away: { runs: 0, hits: 1, errors: 0 },
            home: { runs: 1, hits: 2, errors: 0 },
          },
        ],
        teams: {
          home: { runs: 1, hits: 2, errors: 0, leftOnBase: 1 },
          away: { runs: 0, hits: 1, errors: 0, leftOnBase: 2 },
        },
        defense: { pitcher: {} },
        offense: { batter: {}, first: null, second: null, third: null },
        balls: 0,
        strikes: 0,
        outs: 0,
      },
      boxscore: {
        teams: {
          home: { players: homePlayers, pitchers: [], batters: [100, 101, 102, 103, 104, 105, 106, 107, 108], bench: [], bullpen: [] },
          away: { players: { ID200: pitcher }, pitchers: [], batters: [], bench: [], bullpen: [] },
        },
      },
      plays: {
        allPlays: [
          {
            result: { description: 'Single to left' },
            about: { inning: 1, halfInning: 'bottom', isTopInning: false },
            matchup: { batter: { id: '100' } },
          },
        ],
        currentPlay: {
          matchup: {
            pitcher: { id: 200 },
            batter: { id: 100 },
            pitchHand: { code: 'R' },
            batSide: { description: 'Right' },
          },
        },
        playsByInning: {},
        scoringPlays: [],
      },
      decisions: { winner: { id: 0, fullName: '' }, loser: { id: 0, fullName: '' } },
    },
    gameData: {
      doubleHeader: 'N',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      status: {
        abstractGameState: 'Live',
        codedGameState: 'I',
        detailedState: 'In Progress',
        statusCode: 'I',
        startTimeTBD: true,
        abstractGameCode: 'L',
        reason: '',
      },
      teams: {
        away: { name: 'Away Club', id: '1', abbreviation: 'AWY', clubName: 'Aways', record: { wins: 50, losses: 40 } },
        home: { name: 'Home Club', id: '2', abbreviation: 'HOM', clubName: 'Homes', record: { wins: 55, losses: 35 } },
      },
      players: {},
      venue: { name: 'Home Park', location: { city: 'Hometown', stateAbbrev: 'ST' } },
      probablePitchers: {},
    },
  } as unknown as LiveJson;

  it('builds the title, game id, and status', () => {
    const data = buildGameData(json);
    expect(data.title).toBe('Away Club @ Home Club - In Progress - Bottom 1');
    expect(data.gameId).toBe('745100');
    expect(data.status).toBe('L');
  });

  it('builds the linescore with padded innings and R/H/E totals', () => {
    const { linescore } = buildGameData(json);
    expect(linescore.currentInning).toBe(1);
    expect(linescore.inningState).toBe('Bottom');
    expect(linescore.labels.slice(-3)).toEqual(['R', 'H', 'E']);
    // away (top) scored 0 with 1 hit, home (bottom) scored 1 with 2 hits.
    expect(linescore.top.slice(-3)).toEqual(['0', '1', '0']);
    expect(linescore.bottom.slice(-3)).toEqual(['1', '2', '0']);
    // 1 played inning + padding out to 9 scheduled + 3 R/H/E labels.
    expect(linescore.labels).toHaveLength(1 + 9 + 3);
  });

  it('builds the matchup with current batter, on-deck, and in-hole', () => {
    const { matchup } = buildGameData(json);

    expect(matchup.pitcher.id).toBe('200');
    expect(matchup.pitcher.title).toBe('Ace Pitcher | #45 | RHP');
    expect(matchup.pitcher.stats).toBe('6.0 IP (88P 60S), 2.50 ERA');

    expect(matchup.batter.id).toBe('100');
    expect(matchup.batter.title).toBe('Lead Off | #9 | Batting Right');
    expect(matchup.batter.stats).toBe('2-4, .305 AVG, .850 OPS, 12 HR');

    // Batter is slot 1, so on-deck is slot 2 and in-hole is slot 3 (current occupants).
    expect(matchup.onDeck.id).toBe('101');
    expect(matchup.onDeck.title).toBe('Second Bat | #10');
    expect(matchup.onDeck.stats).toBe('1-3, .280 AVG, .790 OPS, 8 HR');
    expect(matchup.inHole.id).toBe('102');
    expect(matchup.inHole.title).toBe('Third Bat | #11');
  });

  it('builds events newest-half-inning-first from the play log', () => {
    const { events } = buildGameData(json);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Bottom 1');
    expect(events[0].events[0].title).toBe('Single to left');
    expect(events[0].events[0].playerId).toBe('100');
  });

  it('assembles the home batting lineup ordered by batting order', () => {
    const { teams } = buildGameData(json);
    expect(teams.home.name).toBe('Homes');
    expect(teams.home.batting.players).toHaveLength(9);
    expect(teams.home.batting.players[0].title).toContain('Lead Off');
    // away only had a pitcher (battingOrder 0), so no batters.
    expect(teams.away.batting.players).toHaveLength(0);
  });

  it('leaves the wrap empty for a game that is not final', () => {
    expect(buildGameData(json).wrap.title).toBe('');
  });
});

// Additional fixtures aimed at the remaining branches: the various game-state
// strings, the live/summary paths, broadcasts, preview pitcher lines, rosters,
// on-deck wraparound, and the final-game wrap. Fixtures use `any` so tests can
// freely add/override nested fields.
describe('stats.ts branch coverage', () => {
  const scheduleWith = (game: unknown) =>
    gamesData({ dates: [{ games: [game] }] } as unknown as GamesJson)[0];

  const baseTeams = {
    away: { team: { name: 'Away', id: 1, abbreviation: 'AWY' } },
    home: { team: { name: 'Home', id: 2, abbreviation: 'HOM' } },
  };

  it('marks a postponed game as final with an early empty summary (no linescore)', () => {
    const g = scheduleWith({
      gamePk: 1,
      gameDate: '2026-07-25T23:05:00Z',
      description: '',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      gameNumber: 1,
      doubleHeader: 'N',
      status: { detailedState: 'Postponed', abstractGameState: 'Preview', reason: 'Rain', startTimeTBD: false },
      teams: baseTeams,
      venue: { name: 'Some Park' },
    });
    expect(g.status).toBe('Postponed: Rain');
    expect(g.category).toBe('final');
    expect(g.summary.home.name).toBe(''); // early return before names are set
  });

  it('treats a colon in detailedState as a live status', () => {
    const g = scheduleWith({
      gamePk: 2,
      gameDate: '2026-07-25T23:05:00Z',
      description: '',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      gameNumber: 1,
      doubleHeader: 'N',
      status: { detailedState: 'Delayed Start: Rain', abstractGameState: 'Preview', reason: '', startTimeTBD: false },
      teams: baseTeams,
      venue: { name: 'Some Park' },
    });
    expect(g.status).toBe('Delayed Start: Rain');
    expect(g.category).toBe('live');
  });

  it('formats first-pitch time for a scheduled game with a known start', () => {
    const g = scheduleWith({
      gamePk: 5,
      gameDate: '2026-07-25T23:05:00Z',
      description: '',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      gameNumber: 1,
      doubleHeader: 'N',
      status: { detailedState: 'Scheduled', abstractGameState: 'Preview', reason: '', startTimeTBD: false },
      teams: baseTeams,
      venue: { name: 'Some Park' },
      linescore: { innings: [] },
    });
    expect(g.category).toBe('scheduled');
    expect(g.status).toMatch(/^First pitch at \d{1,2}:\d{2} (AM|PM)$/);
  });

  it('summarizes a live game (pitcher/batter, count, baserunners), UNIQLO venue, and a stream feed', () => {
    const g = scheduleWith({
      gamePk: 3,
      gameDate: '2026-07-25T23:05:00Z',
      description: '',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      gameNumber: 1,
      doubleHeader: 'N',
      status: { detailedState: 'In Progress', abstractGameState: 'Live', reason: '', startTimeTBD: false },
      teams: baseTeams,
      venue: { name: 'UNIQLO Field at Dodger Stadium' },
      broadcasts: [
        { availableForStreaming: true, homeAway: 'home', type: 'TV', callSign: 'SNLA', language: 'en', mediaId: 'm1' },
      ],
      linescore: {
        inningState: 'Top',
        currentInningOrdinal: 4,
        innings: [{ num: 1, away: { runs: 0, hits: 1, errors: 0 }, home: { runs: 1, hits: 1, errors: 0 } }],
        defense: {
          pitcher: {
            id: 10,
            fullName: 'Pitch Man',
            pitchHand: { code: 'R' },
            stats: [{ group: { displayName: 'pitching' }, type: { displayName: 'gameLog' }, stats: { summary: '5.0 IP', numberOfPitches: 70 } }],
          },
        },
        offense: {
          batter: {
            id: 11,
            fullName: 'Bat Man',
            batSide: { code: 'L' },
            stats: [{ group: { displayName: 'hitting' }, type: { displayName: 'gameLog' }, stats: { summary: '1-2' } }],
          },
          first: { fullName: 'Runner One' },
          second: { fullName: 'Runner Two' },
          third: { fullName: 'Runner Three' },
        },
        outs: 2,
        balls: 3,
        strikes: 1,
      },
    });
    expect(g.category).toBe('live');
    expect(g.status).toBe('In Progress - Top 4');
    expect(g.venue).toBe('Dodger Stadium');
    expect(g.feeds).toHaveLength(3); // one stream + two clips
    expect(g.feeds[0].feedType).toBe('Video');
    expect(g.summary.player_1.name).toBe('Pitch Man - RHP');
    expect(g.summary.player_1.stats).toBe('5.0 IP, 70 pitches');
    expect(g.summary.player_2.name).toBe('Bat Man - L');
    expect(g.summary.outs).toBe(2);
    expect(g.summary.balls).toBe(3);
    expect(g.summary.first).toBe('Runner One');
    expect(g.summary.third).toBe('Runner Three');
  });

  it('labels game two and falls back to TBD pitchers', () => {
    const g = scheduleWith({
      gamePk: 4,
      gameDate: '2026-07-25T23:05:00Z',
      description: '',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      gameNumber: 2,
      doubleHeader: 'Y',
      status: { detailedState: 'Scheduled', abstractGameState: 'Preview', reason: '', startTimeTBD: true },
      teams: baseTeams,
      venue: { name: 'Some Park' },
      linescore: { innings: [] },
    });
    expect(g.status).toBe('Game 2');
    expect(g.category).toBe('game-two');
    expect(g.summary.player_1.name).toBe('HOM: TBD');
    expect(g.summary.player_1.stats).toBe('No pitcher named yet');
    expect(g.summary.player_2.name).toBe('AWY: TBD');
  });

  // ---- buildGameData branch fixtures ----

  const makeBatter = (id: number, fullName: string, jerseyNumber: string, battingOrder: number) => ({
    jerseyNumber,
    battingOrder,
    batSide: { code: 'R' },
    position: { abbreviation: 'CF' },
    person: { id, fullName },
    stats: { batting: { hits: 1, atBats: 3 }, pitching: {} },
    seasonStats: {
      batting: { avg: '.300', ops: '.800', homeRuns: 10 },
      pitching: { era: '2.00', inningsPitched: '10.0', gamesPlayed: 3, wins: 2, losses: 1 },
    },
  });

  const makePitcher = (id: number, fullName: string, jerseyNumber: string) => ({
    jerseyNumber,
    battingOrder: 0,
    batSide: { code: 'R' },
    position: { abbreviation: 'P' },
    person: { id, fullName },
    stats: { batting: {}, pitching: { inningsPitched: '6.0', pitchesThrown: 90, strikes: 62 } },
    seasonStats: { batting: {}, pitching: { era: '3.00', inningsPitched: '120.0', gamesPlayed: 20, wins: 8, losses: 5 } },
  });

  // A complete live, home-batting game. Each call returns fresh objects.
  const liveGame = (): any => ({
    gamePk: '900001',
    liveData: {
      linescore: {
        inningState: 'Bottom',
        currentInningOrdinal: 3,
        scheduledInnings: 9,
        innings: [{ num: 1, away: { runs: 0, hits: 1, errors: 0 }, home: { runs: 1, hits: 2, errors: 0 } }],
        teams: {
          home: { runs: 1, hits: 2, errors: 0, leftOnBase: 1 },
          away: { runs: 0, hits: 1, errors: 0, leftOnBase: 2 },
        },
        defense: { pitcher: {} },
        offense: { batter: {}, first: null, second: null, third: null },
        balls: 0,
        strikes: 0,
        outs: 0,
      },
      boxscore: {
        teams: {
          home: {
            players: {
              ID100: makeBatter(100, 'Lead Off', '9', 100),
              ID101: makeBatter(101, 'Second Bat', '10', 200),
              ID102: makeBatter(102, 'Third Bat', '11', 300),
            },
            pitchers: [],
            batters: [100, 101, 102],
            bench: [],
            bullpen: [],
          },
          away: {
            players: { ID200: makePitcher(200, 'Ace Pitcher', '45') },
            pitchers: [],
            batters: [],
            bench: [],
            bullpen: [],
          },
        },
      },
      plays: {
        allPlays: [],
        currentPlay: {
          matchup: { pitcher: { id: 200 }, batter: { id: 100 }, pitchHand: { code: 'R' }, batSide: { description: 'Right' } },
        },
        playsByInning: {},
        scoringPlays: [],
      },
      decisions: { winner: { id: 0, fullName: '' }, loser: { id: 0, fullName: '' } },
    },
    gameData: {
      doubleHeader: 'N',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      status: {
        abstractGameState: 'Live',
        codedGameState: 'I',
        detailedState: 'In Progress',
        statusCode: 'I',
        startTimeTBD: true,
        abstractGameCode: 'L',
        reason: '',
      },
      teams: {
        away: { name: 'Away Club', id: '1', abbreviation: 'AWY', clubName: 'Aways', record: { wins: 50, losses: 40 } },
        home: { name: 'Home Club', id: '2', abbreviation: 'HOM', clubName: 'Homes', record: { wins: 55, losses: 35 } },
      },
      players: {},
      venue: { name: 'Home Park', location: { city: 'Hometown', stateAbbrev: 'ST' } },
      probablePitchers: {},
    },
  });

  const build = (j: unknown) => buildGameData(j as unknown as LiveJson);

  it('titles a postponed game', () => {
    const j = liveGame();
    j.gameData.status.detailedState = 'Postponed';
    j.gameData.status.reason = 'Rain';
    expect(build(j).title).toBe('Away Club @ Home Club - Postponed: Rain');
  });

  it('titles a game whose detailedState carries a colon', () => {
    const j = liveGame();
    j.gameData.status.abstractGameState = 'Preview';
    j.gameData.status.detailedState = 'Delayed Start: Rain';
    expect(build(j).title).toBe('Away Club @ Home Club - Delayed Start: Rain');
  });

  it('titles a scheduled doubleheader game 1 with a first-pitch time', () => {
    const j = liveGame();
    j.gameData.status.abstractGameState = 'Preview';
    j.gameData.status.detailedState = 'Scheduled';
    j.gameData.status.startTimeTBD = false;
    j.gameData.doubleHeader = 'Y';
    expect(build(j).title).toMatch(
      /^Away Club @ Home Club - Game 1 - First pitch at \d{1,2}:\d{2} (AM|PM)$/
    );
  });

  it('returns an empty matchup when there is no current-play matchup', () => {
    const j = liveGame();
    j.liveData.plays.currentPlay.matchup = {};
    const { matchup } = build(j);
    expect(matchup.pitcher.id).toBe('');
    expect(matchup.batter.id).toBe('');
    expect(matchup.onDeck.id).toBe('');
  });

  it('filters out replaced players so on-deck/in-hole reflect the current lineup', () => {
    const j = liveGame();
    // Away team batting. Slot 3's starter (302) was pinch-hit for by 305, who
    // takes the slot (battingOrder 301 > 300). The replaced starter must no
    // longer appear as on-deck / in-the-hole.
    j.liveData.boxscore.teams.away.players = {
      ID300: makeBatter(300, 'A1', '1', 100),
      ID301: makeBatter(301, 'A2', '2', 200),
      ID302: makeBatter(302, 'A3 Starter', '3', 300),
      ID305: makeBatter(305, 'A3 Pinch Hitter', '25', 301),
      ID200: makePitcher(200, 'Ace Pitcher', '45'),
    };
    j.liveData.boxscore.teams.home.players = {};
    j.liveData.plays.currentPlay.matchup.batter = { id: 301 };
    const { matchup } = build(j);
    // Batter is slot 2 (301). On-deck is slot 3's CURRENT occupant (the pinch
    // hitter 305), not the replaced starter (302); in-hole wraps to slot 1.
    expect(matchup.onDeck.id).toBe('305');
    expect(matchup.onDeck.title).toBe('A3 Pinch Hitter | #25');
    expect(matchup.inHole.id).toBe('300');
  });

  it('handles a final game: Final title, winning wrap, and x/blank in the box', () => {
    const j = liveGame();
    j.gameData.status.abstractGameState = 'Final';
    j.gameData.status.abstractGameCode = 'F';
    j.gameData.status.detailedState = 'Final';
    j.liveData.linescore.innings = [
      { num: 1, away: { runs: -1, hits: 0, errors: 0 }, home: { runs: 2, hits: 3, errors: 1 } },
      { num: 2, away: { runs: 1, hits: 2, errors: 1 }, home: { runs: -1, hits: 0, errors: 0 } },
    ];
    j.liveData.linescore.teams = {
      home: { runs: 3, hits: 5, errors: 1, leftOnBase: 4 },
      away: { runs: 1, hits: 2, errors: 1, leftOnBase: 5 },
    };
    j.liveData.decisions = {
      winner: { id: 200, fullName: 'Ace Pitcher' },
      loser: { id: 201, fullName: 'Losing Pitcher' },
    };
    j.liveData.boxscore.teams.away.players.ID201 = makePitcher(201, 'Losing Pitcher', '46');
    const data = build(j);
    expect(data.title).toBe('Away Club @ Home Club - Final');
    expect(data.wrap.title).toBe('Home Club win 3-1');
    expect(data.wrap.winnerId).toBe('200');
    expect(data.wrap.winner).toContain('Ace Pitcher');
    expect(data.wrap.loser).toContain('Losing Pitcher');
    expect(data.linescore.top[1]).toBe(''); // away didn't score (runs < 0)
    expect(data.linescore.bottom[2]).toBe('x'); // home didn't bat, game final
  });

  it('reports a tie in the wrap', () => {
    const j = liveGame();
    j.gameData.status.abstractGameState = 'Final';
    j.gameData.status.abstractGameCode = 'F';
    j.liveData.linescore.teams = {
      home: { runs: 4, hits: 8, errors: 0, leftOnBase: 6 },
      away: { runs: 4, hits: 9, errors: 1, leftOnBase: 7 },
    };
    expect(build(j).wrap.title).toBe('Ended in a tie 4-4');
  });

  it('builds preview pitcher lines and pitching/bench/bullpen rosters', () => {
    const j = liveGame();
    j.gameData.status.startTimeTBD = false; // exercise the preview date format
    j.gameData.probablePitchers = {
      home: { id: 800, fullName: 'Home Prob' },
      away: { id: 801, fullName: 'Away Prob' },
    };
    j.gameData.players = {
      '800': { id: 800, fullName: 'Home Prob', pitchHand: { code: 'R' } },
      '801': { id: 801, fullName: 'Away Prob', pitchHand: { code: 'L' } },
      ID500: { id: 500, fullName: 'Home RP', pitchHand: { code: 'R' } },
      ID700: { id: 700, fullName: 'Home BP', pitchHand: { code: 'L' } },
    };
    Object.assign(j.liveData.boxscore.teams.home.players, {
      ID800: makePitcher(800, 'Home Prob', '30'),
      ID801: makePitcher(801, 'Away Prob', '31'),
      ID500: makePitcher(500, 'Home RP', '32'),
      ID600: makeBatter(600, 'Bench Bat', '33', 0),
      ID700: makePitcher(700, 'Home BP', '34'),
    });
    j.liveData.boxscore.teams.home.pitchers = [500];
    j.liveData.boxscore.teams.home.bench = [600];
    j.liveData.boxscore.teams.home.bullpen = [700];

    const data = build(j);
    expect(data.preview.home).toContain('Home Prob');
    expect(data.preview.home).toContain('ERA');
    expect(data.preview.away).toContain('Away Prob');
    expect(data.teams.home.pitching.players).toHaveLength(1);
    expect(data.teams.home.pitching.players[0].title).toContain('Home RP');
    expect(data.teams.home.bench.players).toHaveLength(1);
    expect(data.teams.home.bullpen.players).toHaveLength(1);
  });

  it('reports an away win in the wrap', () => {
    const j = liveGame();
    j.gameData.status.abstractGameState = 'Final';
    j.gameData.status.abstractGameCode = 'F';
    j.liveData.linescore.teams = {
      home: { runs: 2, hits: 6, errors: 1, leftOnBase: 5 },
      away: { runs: 5, hits: 9, errors: 0, leftOnBase: 4 },
    };
    j.liveData.decisions = {
      winner: { id: 200, fullName: 'Ace Pitcher' },
      loser: { id: 201, fullName: 'Losing Pitcher' },
    };
    j.liveData.boxscore.teams.away.players.ID201 = makePitcher(201, 'Losing Pitcher', '46');
    expect(build(j).wrap.title).toBe('Away Club win 5-2');
  });

  it('handles a pitcher with no game stats and no jersey number', () => {
    const j = liveGame();
    j.gameData.players = { ID500: { id: 500, fullName: 'No Stats RP', pitchHand: { code: 'R' } } };
    j.liveData.boxscore.teams.home.players.ID500 = {
      jerseyNumber: '',
      battingOrder: 0,
      batSide: { code: 'R' },
      position: { abbreviation: 'P' },
      person: { id: 500, fullName: 'No Stats RP' },
      stats: { batting: {}, pitching: undefined },
      seasonStats: { batting: {}, pitching: undefined },
    };
    j.liveData.boxscore.teams.home.pitchers = [500];

    const p = build(j).teams.home.pitching.players[0];
    expect(p.title).toBe('No Stats RP - RHP'); // no jersey segment
    expect(p.ip).toBe(''); // falsy game stats -> ''
    expect(p.era).toBe(''); // falsy season stats -> ''
  });

  // ---- gamesData remaining branches ----

  it('maps an away radio broadcast, keeps a set description, and a zero count', () => {
    const g = scheduleWith({
      gamePk: 10,
      gameDate: '2026-07-25T23:05:00Z',
      description: 'Rivalry Night',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      gameNumber: 1,
      doubleHeader: 'N',
      status: { detailedState: 'In Progress', abstractGameState: 'Live', reason: '', startTimeTBD: false },
      teams: baseTeams,
      venue: { name: 'Some Park' },
      broadcasts: [
        { availableForStreaming: true, homeAway: 'away', type: 'Radio', callSign: 'ESPN', language: 'es', mediaId: 'r1' },
      ],
      linescore: {
        inningState: 'Top',
        currentInningOrdinal: 1,
        innings: [{ num: 1, away: { runs: 0, hits: 0, errors: 0 }, home: { runs: 0, hits: 0, errors: 0 } }],
        defense: { pitcher: { id: 1, fullName: 'P', pitchHand: { code: 'R' }, stats: [] } },
        offense: { batter: { id: 2, fullName: 'B', batSide: { code: 'L' }, stats: [] }, first: null, second: null, third: null },
        outs: 0,
        balls: 0,
        strikes: 0,
      },
    });
    expect(g.description).toBe('Rivalry Night');
    const audio = g.feeds.find((f) => f.feedType === 'Audio');
    expect(audio?.callLetters).toBe('ESPN (es)'); // Audio path adds the language
    expect(audio?.location).toBe('away'); // homeAway 'away' -> away.team.id
    expect(g.summary.outs).toBe(0);
    expect(g.summary.balls).toBe(0);
  });

  it('totals a final game where the home team is shut out but commits errors', () => {
    // home runs/hits 0 (falsy side of those totals) but home errors > 0 and
    // away runs > 0 (truthy side of those totals) — the complements of the
    // existing final-game fixture.
    const g = scheduleWith({
      gamePk: 11,
      gameDate: '2026-07-24T23:05:00Z',
      description: '',
      datetime: { dateTime: '2026-07-24T23:05:00Z' },
      gameNumber: 1,
      doubleHeader: 'N',
      status: { detailedState: 'Final', abstractGameState: 'Final', reason: '', startTimeTBD: false },
      teams: baseTeams,
      venue: { name: 'Some Park' },
      linescore: { innings: [{ home: { runs: 0, hits: 0, errors: 2 }, away: { runs: 3, hits: 0, errors: 0 } }] },
    });
    expect(g.summary.home.runs).toBe(0);
    expect(g.summary.home.errors).toBe(2);
    expect(g.summary.away.runs).toBe(3);
  });

  it('falls back to datetime.dateTime when a scheduled game has no gameDate', () => {
    const g = scheduleWith({
      gamePk: 12,
      // no gameDate field -> uses datetime.dateTime
      description: '',
      datetime: { dateTime: '2026-07-25T23:05:00Z' },
      gameNumber: 1,
      doubleHeader: 'N',
      status: { detailedState: 'Scheduled', abstractGameState: 'Preview', reason: '', startTimeTBD: false },
      teams: baseTeams,
      venue: { name: 'Some Park' },
      linescore: { innings: [] },
    });
    expect(g.status).toMatch(/^First pitch at \d{1,2}:\d{2} (AM|PM)$/);
  });

  // ---- buildGameData remaining branches ----

  it('omits the state abbreviation in the preview when the venue has none', () => {
    const j = liveGame();
    j.gameData.venue.location.stateAbbrev = '';
    expect(build(j).preview.title).toBe('Home Park - Hometown');
  });

  it('omits the jersey segment across batting, bench, and bullpen', () => {
    const j = liveGame();
    j.liveData.boxscore.teams.home.players.ID100.jerseyNumber = ''; // batting order #1
    j.gameData.players = {
      ID500: { id: 500, fullName: 'RP Arm', pitchHand: { code: 'R' } },
      ID700: { id: 700, fullName: 'BP Arm', pitchHand: { code: 'L' } },
    };
    Object.assign(j.liveData.boxscore.teams.home.players, {
      ID500: makePitcher(500, 'RP Arm', ''),
      ID600: makeBatter(600, 'Bench Bat', '', 0),
      ID700: makePitcher(700, 'BP Arm', ''),
    });
    j.liveData.boxscore.teams.home.pitchers = [500];
    j.liveData.boxscore.teams.home.bench = [600];
    j.liveData.boxscore.teams.home.bullpen = [700];

    const home = build(j).teams.home;
    expect(home.batting.players[0].title).toBe('Lead Off - CF'); // no ' - 9'
    expect(home.pitching.players[0].title).toBe('RP Arm - RHP');
    expect(home.bench.players[0].title).toBe('Bench Bat - CF');
    expect(home.bullpen.players[0].title).toBe('BP Arm - LHP');
  });

  it('leaves the home cell blank for an un-batted inning in a non-final game', () => {
    const j = liveGame();
    j.liveData.linescore.innings = [
      { num: 1, away: { runs: 0, hits: 0, errors: 0 }, home: { runs: -1, hits: 0, errors: 0 } },
    ];
    // index 0 is the team abbreviation; index 1 is the 1st inning.
    expect(build(j).linescore.bottom[1]).toBe(''); // not 'x' because game isn't final
  });

  it('renders matchup stat fallbacks and no pitch-hand/bat-side suffix', () => {
    const j = liveGame();
    // Resolvable pitcher/batter, but with missing stat objects.
    j.liveData.boxscore.teams.away.players.ID200 = {
      jerseyNumber: '45',
      battingOrder: 0,
      batSide: { code: 'R' },
      position: { abbreviation: 'P' },
      person: { id: 200, fullName: 'Ace Pitcher' },
      stats: { batting: {}, pitching: undefined },
      seasonStats: { batting: {}, pitching: undefined },
    };
    // Off-order pinch hitter (battingOrder 0 -> not in the batting lineup, so
    // liveGameBatting skips it) that the matchup resolves to, with no stats.
    j.liveData.boxscore.teams.home.players.ID150 = {
      jerseyNumber: '99',
      battingOrder: 0,
      batSide: { code: 'R' },
      position: { abbreviation: 'PH' },
      person: { id: 150, fullName: 'Pinch Hitter' },
      stats: { batting: undefined, pitching: {} },
      seasonStats: { batting: undefined, pitching: {} },
    };
    // Matchup present but with no pitchHand / batSide.
    j.liveData.plays.currentPlay.matchup = { pitcher: { id: 200 }, batter: { id: 150 } };

    const { matchup } = build(j);
    expect(matchup.pitcher.stats).toBe('0.0 IP (0P 0S), -.-- ERA');
    expect(matchup.batter.stats).toBe('0-0, .--- AVG, .--- OPS, 0 HR');
    expect(matchup.pitcher.title).toBe('Ace Pitcher | #45'); // no RHP suffix
    expect(matchup.batter.title).toBe('Pinch Hitter | #99'); // no Batting Right suffix
  });

  it('returns empty matchup players when the matchup ids are not in the boxscore', () => {
    const j = liveGame();
    j.liveData.plays.currentPlay.matchup = {
      pitcher: { id: 9998 },
      batter: { id: 9999 },
      pitchHand: { code: 'R' },
      batSide: { description: 'Right' },
    };
    const empty = { id: '', title: '', stats: '' };
    const { matchup } = build(j);
    expect(matchup.pitcher).toEqual(empty);
    expect(matchup.batter).toEqual(empty);
    expect(matchup.onDeck).toEqual(empty);
    expect(matchup.inHole).toEqual(empty);
  });
});

// sortGames is a Next.js-only addition (not in the React lib): it orders the
// games list live -> scheduled -> game-two -> final, dropping any game whose
// category isn't one of those four.
describe('sortGames', () => {
  const g = (gameId: string, category: string): Game =>
    ({ gameId, category } as unknown as Game);

  it('orders games live, then scheduled, then game-two, then final', () => {
    const input = [
      g('f', 'final'),
      g('s', 'scheduled'),
      g('l', 'live'),
      g('g2', 'game-two'),
    ];
    expect(sortGames(input).map((x) => x.gameId)).toEqual(['l', 's', 'g2', 'f']);
  });

  it('keeps the original relative order within a category (stable)', () => {
    const input = [g('l1', 'live'), g('l2', 'live'), g('f1', 'final'), g('l3', 'live')];
    expect(sortGames(input).map((x) => x.gameId)).toEqual(['l1', 'l2', 'l3', 'f1']);
  });

  it('drops games whose category is not one of the four known buckets', () => {
    const input = [g('l', 'live'), g('mystery', 'suspended'), g('f', 'final')];
    expect(sortGames(input).map((x) => x.gameId)).toEqual(['l', 'f']);
  });

  it('returns an empty array for no games', () => {
    expect(sortGames([])).toEqual([]);
  });
});
