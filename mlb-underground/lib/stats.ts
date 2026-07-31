import { EventInning, Feed, Game, GameData, Line, MatchupDetails, PreviewDetails, RosterBatter, RosterPitcher, Summary, TeamsDetails, WrapDetails, GameJson, GamesJson, LivePlayerJson, PlayerJson } from "./types";
import { format } from 'date-fns';
import slugify from 'slugify';

const gameState = (game: GameJson) => {
    const detailedState = game.status.detailedState;
    const abstractGameState = game.status.abstractGameState;
    const reason =  game.status.reason;
    const inning = game.linescore ? (game.linescore.inningState + ' ' + game.linescore.currentInningOrdinal) : '';

    let status = '';
    let category = '';

    if (detailedState === 'Postponed') {
        status = detailedState + ': ' + reason
        category = 'final';
     } else if (abstractGameState === 'Final' || abstractGameState === 'Final: Tied') {
        status = 'Final';
        category = 'final';
     } else if (detailedState.indexOf(':') > 0) {
        status = detailedState;
        category = 'live';
     } else if (abstractGameState === 'Live') {
        status = 'In Progress - ' + inning
        category = 'live';
     } else if (game.gameNumber === 2) {
        status = 'Game 2';
        category = 'game-two';
    } else {
        const gameDate = game.gameDate ? game.gameDate : game.datetime.dateTime
        const dateString = !game.status.startTimeTBD && gameDate ? format(gameDate, 'h:mm aa') : 'TBD'; 
        status = 'First pitch at ' + dateString;
        category = 'scheduled';
    }

    return {status: status, category: category};
};

const gameSummary = (game: GameJson, category:string, status:string) => {

    const summary:Summary = {
        home: {
            name: '',
            runs: 0,
            hits: 0,
            errors: 0
        },
        away: {
            name: '',
            runs: 0,
            hits: 0,
            errors: 0
        },
        player_1: {
            name: '',
            stats: '',
            id: 0
        },
        player_2: {
            name: '',
            stats: '',
            id: 0
        },
        first: '',
        second: '',
        third: '',
        balls: 0,
        strikes: 0,
        outs: 0
    }

    if (!game.linescore) {
        return summary;
    }

    summary.home.name = game.teams.home.team.abbreviation;
    summary.away.name = game.teams.away.team.abbreviation;

    game.linescore.innings.forEach(inning => {
        summary.home.runs += inning.home.runs ? inning.home.runs : 0;
        summary.home.hits += inning.home.hits ? inning.home.hits : 0;
        summary.home.errors += inning.home.errors ? inning.home.errors : 0;
        summary.away.runs += inning.away.runs ? inning.away.runs : 0;
        summary.away.hits += inning.away.hits ? inning.away.hits : 0;
        summary.away.errors += inning.away.errors ? inning.away.errors : 0;
    });

    if (category === 'scheduled' || category === 'game-two') {
        if (game.teams.home.probablePitcher) {
            const pitcher = game.teams.home.probablePitcher;

            summary.player_1.name = game.teams.home.team.abbreviation + ': ' + pitcher.fullName + ' - ' + pitcher.pitchHand.code + 'HP'
            summary.player_1.id = pitcher.id

            pitcher.stats.forEach(stat => {
                if (stat.group.displayName === 'pitching' && stat.type.displayName === 'statsSingleSeason') {
                    summary.player_1.stats = stat.stats.summary;
                }
            });
        } else {
            summary.player_1.name = game.teams.home.team.abbreviation + ": TBD";
            summary.player_1.stats = "No pitcher named yet";
        }

        if (game.teams.away.probablePitcher) {
            const pitcher = game.teams.away.probablePitcher;

            summary.player_2.name = game.teams.away.team.abbreviation + ': ' + pitcher.fullName + ' - ' + pitcher.pitchHand.code + 'HP'
            summary.player_2.id = pitcher.id

            pitcher.stats.forEach(stat => {
                if (stat.group.displayName === 'pitching' && stat.type.displayName === 'statsSingleSeason') {
                    summary.player_2.stats = stat.stats.summary;
                }
            });
        } else {
            summary.player_2.name = game.teams.away.team.abbreviation + ": TBD";
            summary.player_2.stats = "No pitcher named yet";
        }
    }

    if (category === 'live') {
        const pitcher = game.linescore.defense.pitcher;
        const batter = game.linescore.offense.batter;

        summary.player_1.name = pitcher.fullName + ' - ' + pitcher.pitchHand.code + 'HP'
        summary.player_1.id = pitcher.id

        pitcher.stats.forEach(stat => {
            if (stat.group.displayName === 'pitching' && stat.type.displayName === 'gameLog') {
                summary.player_1.stats = stat.stats.summary + ", " + stat.stats.numberOfPitches + ' pitches';
            }
        });

        summary.player_2.name = batter.fullName + ' - ' + batter.batSide.code
        summary.player_2.id = batter.id

        batter.stats.forEach(stat => {
            if (stat.group.displayName === 'hitting' && stat.type.displayName === 'gameLog') {
                summary.player_2.stats = stat.stats.summary;
            }
        });

        summary.outs = game.linescore.outs ? game.linescore.outs : 0;   
        summary.balls = game.linescore.balls ? game.linescore.balls : 0;    
        summary.strikes = game.linescore.strikes ? game.linescore.strikes : 0;

        if (game.linescore.offense.first) {
            summary.first = game.linescore.offense.first.fullName;
        }

        if (game.linescore.offense.second) {
            summary.second = game.linescore.offense.second.fullName;
        }

        if (game.linescore.offense.third) {
            summary.third = game.linescore.offense.third.fullName;
        }
    }

    if (category === 'final' && status === 'Final') {

        if (game.decisions) {
                const winner = game.decisions.winner;

                summary.player_1.name = 'W: ' + winner.fullName + ' - ' + winner.pitchHand.code + 'HP'
                summary.player_1.id = winner.id
    
                winner.stats.forEach(stat => {
                    if (stat.group.displayName === 'pitching' && stat.type.displayName === 'gameLog') {
                        summary.player_1.stats = stat.stats.summary;
                    }
                });

                const loser = game.decisions.loser;

                summary.player_2.name = 'L: ' + loser.fullName + ' - ' + loser.pitchHand.code + 'HP'
                summary.player_2.id = loser.id
    
                loser.stats.forEach(stat => {
                    if (stat.group.displayName === 'pitching' && stat.type.displayName === 'gameLog') {
                        summary.player_2.stats = stat.stats.summary;
                    }
                });
        }
    }

    return summary;
};

const switchVenues = (venue: string) => {
    if(venue === 'UNIQLO Field at Dodger Stadium') {
        return 'Dodger Stadium';
    } else if (venue === 'Rate Field') {
        return 'Comiskey Park';
    } else {
        return venue;
    }
};

export const gamesData = (json: GamesJson) => {
    const games:Game[] = [];

    json.dates.forEach(date => {
        date.games.forEach(game => {
            const gameId = game.gamePk;
            const title = game.teams.away.team.name + ' @ ' + game.teams.home.team.name
            const venue = switchVenues(game.venue.name);
            const gameDate = game.gameDate;

            const feeds:Feed[] = [];
        
            if(game.broadcasts) {
                game.broadcasts.forEach(broadcast => {
                    if(broadcast.availableForStreaming) {
                        const teamId = broadcast.homeAway === 'away' ? game.teams.away.team.id : game.teams.home.team.id;
                        const feedType = broadcast.type === 'TV' ? 'Video' : 'Audio';
                        const callLetters = feedType === 'Video' ? broadcast.callSign : broadcast.callSign + ' (' + broadcast.language + ')';
                        const mediaId = broadcast.mediaId;
                        feeds.push({
                            mediaId: mediaId,
                            feedType: feedType,
                            teamId: teamId,
                            location: broadcast.homeAway,
                            callLetters: callLetters
                        });
                    }
                });
            };

            feeds.push({
                mediaId: slugify(game.teams.home.team.name, {lower: true}),
                feedType: 'Clips',
                teamId: game.teams.home.team.id,
                location: '',
                callLetters: ''
            }); 
            
            feeds.push({
                mediaId: slugify(game.teams.away.team.name, {lower: true}),
                feedType: 'Clips',
                teamId: game.teams.away.team.id,
                location: '',
                callLetters: ''
            });


            const state = gameState(game);
            const summary = gameSummary(game, state.category, state.status); // self.game_summary(game, state[:category], state[:status])

            const description = game.description ? game.description : '';

            games.push({
                gameId: gameId,
                gameDate: gameDate, 
                title: title, 
                description: description,
                venue: venue, 
                status: state.status, 
                category: state.category,
                feeds: feeds,
                summary: summary, 
            }) 

        });
    });

    return games;
}


export const gameDataDefault:GameData = {
    title: '',
    gameId: '',
    status: '',
    linescore: {
      gameState: '', currentInning: 1, inningState: 'Top', labels: [], top: [], bottom: []
    },
    preview: {
      title: '',
      description: '',
      home: '',
      homeId: '',
      away: '',
      awayId: '',
    },
    wrap: {
      title: '',
      winner: '',
      winnerId: '',
      loser: '',
      loserId: '',
    },
    teams: {
      away: {
        id: '', 
        name: '', 
        abbreviation: '', 
        batting: {key: '', players: []},
        pitching: {key: '', players: []},
        bench: {key: '', players: []},
        bullpen: {key: '', players: []}
      },
      home: {
        id: '', 
        name: '', 
        abbreviation: '', 
        batting: {key: '', players: []},
        pitching: {key: '', players: []},
        bench: {key: '', players: []},
        bullpen: {key: '', players: []}
      }
    },
    matchup: {
      pitcher: {id: '', title: '', stats: ''},
      batter: {id: '', title: '', stats: ''},
      onDeck: {id: '', title: '', stats: ''},
      inHole: {id: '', title: '', stats: ''},
    },
    events: []
};

type BoxscoreTeam = {
    players: {
        [key: string]: LivePlayerJson
    },
    pitchers: number[],
    batters: number[],
    bench: number[],
    bullpen: number[]
}

export type LiveJson = {
    gamePk: string,
    liveData: {
        linescore: {
            inningState: string,
            currentInningOrdinal: number,
            scheduledInnings: number,
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
                num: number,
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
            }[],
            teams: {
                home: {
                    runs: number,
                    hits: number,
                    errors: number,
                    leftOnBase: number
                },
                away: {
                    runs: number,
                    hits: number,
                    errors: number,
                    leftOnBase: number
                }  
            }
        },
        boxscore: {
            teams: {
                home: BoxscoreTeam,
                away: BoxscoreTeam
            }
        },
        plays: {
            allPlays: {
                result: {
                    description: string
                },
                about: {
                    inning: number,
                    halfInning: string,
                    isTopInning: boolean,
                },
                matchup: {
                    batter: {
                        id: string
                    }
                }
            }[],
            currentPlay: {
                matchup: {
                    pitcher: {
                        id: number,
                    },
                    batter: {
                        id: number,
                    },
                    pitchHand: {
                        code: string
                    },
                    batSide: {
                        description: string
                    }
                }
            },
            playsByInning: {

            },
            scoringPlays: number[]
        },
        decisions: {
            winner: {
                id: number,
                fullName: string
            },
            loser: {
                id: number,
                fullName: string
            }
        }
    },
    gameData: {
        doubleHeader: string,
        datetime: {
            dateTime: string
        },
        status: {
            abstractGameState: string,
            codedGameState: string,
            detailedState: string,  
            statusCode: string,
            startTimeTBD: boolean,
            abstractGameCode: string,
            reason: string
        },
        teams: {
            away: {
                name: string,
                id: string,
                abbreviation: string,
                clubName: string,
                record: {
                    wins: number,
                    losses: number
                }
            },
            home: {
                name: string,
                id: string,
                abbreviation: string,
                clubName: string,
                record: {
                    wins: number,
                    losses: number
                }
            }
        },
        players: {
            [key: string]: PlayerJson
        },
        venue: {
            name: string,
            location: { 
                city: string,
                stateAbbrev: string
            }  
        },
        probablePitchers: {
            home: PlayerJson,
            away: PlayerJson
        }
    }
}

const liveGameTitle = (json: LiveJson) => {
    const gameData = json.gameData; 
    const linescore = json.liveData.linescore;
    const detailedState = gameData.status.detailedState
    const abstractGameState = gameData.status.abstractGameState;
    const reason = gameData.status.reason;
    let inning = '';

    if (linescore && linescore.inningState && linescore.currentInningOrdinal) {
        inning = linescore.inningState + ' ' + linescore.currentInningOrdinal;
    }

    let status = '';

    if (detailedState === 'Postponed') {
        status = detailedState + ': ' + reason;
    } else if (abstractGameState === 'Final' || abstractGameState === 'Final: Tied') {
        status = 'Final';
    } else if (detailedState.indexOf(':') > 0) {
        status = detailedState;
    } else if (abstractGameState === 'Live') {
        status = 'In Progress - ' + inning;
    } else {
        let dateString = 'TBD';
        const gameDate = gameData.datetime.dateTime;
        if (!gameData.status.startTimeTBD && gameDate) {
            dateString = format(gameDate, 'h:mm aa');
        }
        status = 'First pitch at ' + dateString;
        if (gameData.doubleHeader === 'Y') {
            status = 'Game 1 - ' + status;
        }   
    }

    return json.gameData.teams.away.name + " @ " +  json.gameData.teams.home.name + " - " + status;
};

const liveGameLinescore = (json: LiveJson) => {
    const linescore = json.liveData.linescore;
    const topTotals = {runs: 0, hits: 0, errors: 0};
    const bottomTotals = {runs: 0, hits: 0, errors: 0};
    const labels = [''];
    const top = [json.gameData.teams.away.abbreviation];
    const bottom = [json.gameData.teams.home.abbreviation];
    let counter = 0;
    const gameStatus = json.gameData.status.abstractGameCode;
    
    linescore.innings.forEach(inning => {
        counter = counter + 1;
        labels.push(inning.num.toString());

        if (inning.away.runs >= 0) {
            topTotals.runs += inning.away.runs;
            top.push(inning.away.runs.toString());
        } else {
            top.push('');
        }   
        if (inning.away.hits) {
            topTotals.hits += inning.away.hits;
        }
        if (inning.away.errors) {
            topTotals.errors += inning.away.errors;
        }
        if (inning.home.runs >= 0) {
            bottomTotals.runs += inning.home.runs;
            bottom.push(inning.home.runs.toString());
        } else {
            bottom.push((gameStatus === 'F') ? 'x' : '');
        }
        if (inning.home.hits) {
            bottomTotals.hits += inning.home.hits;
        }
        if (inning.home.errors) {
            bottomTotals.errors += inning.home.errors;
        }
    });

    if (gameStatus !== 'F') {
        for (let index = counter + 1; index <= linescore.scheduledInnings; index++) {
            labels.push(index.toString());
            top.push('');
            bottom.push('');
        }
    }

    labels.push('R');
    labels.push('H');
    labels.push('E');
    top.push(topTotals.runs.toString());
    top.push(topTotals.hits.toString());
    top.push(topTotals.errors.toString());
    bottom.push(bottomTotals.runs.toString());
    bottom.push(bottomTotals.hits.toString());
    bottom.push(bottomTotals.errors.toString());

    const result: Line = {
        gameState: json.gameData.status.abstractGameState,
        currentInning: linescore.currentInningOrdinal,
        inningState: linescore.inningState,
        labels: labels, top: top, bottom: bottom
    };

    return result;
}

const liveGamePlayers = (json: LiveJson) => {
    const players = [];
    for (const key in json.gameData.players) {
        const player = json.gameData.players[key];
        players[player.id] = player;
    }
    return players;
}

const liveGameLivePlayers = (json: LiveJson) => {
    const players = [];  
    for (const key in json.liveData.boxscore.teams.home.players) {
        const player = json.liveData.boxscore.teams.home.players[key];
        players[player.person.id] = player;
    }

    for (const key in json.liveData.boxscore.teams.away.players) {
        const player = json.liveData.boxscore.teams.away.players[key];
        players[player.person.id] = player;
    }
    return players;
}

const liveGamePreview = (json: LiveJson) => {
    const venue = json.gameData.venue;
    const homeTeam = json.gameData.teams.home;
    const awayTeam = json.gameData.teams.away;
    const probables = json.gameData.probablePitchers;
    const title = switchVenues(venue.name) + ' - ' + venue.location.city + (venue.location.stateAbbrev ? ', ' + venue.location.stateAbbrev : '');
    const dateString = !json.gameData.status.startTimeTBD ? format(json.gameData.datetime.dateTime, 'h:mm aa') : 'TBD'; 
    const description = 'First pitch is scheduled for ' + dateString + '.';
    const players = liveGamePlayers(json);
    const livePlayers = liveGameLivePlayers(json);

    const noPitcher = 'No starting pitcher has been announced yet.';
    const goPitcher = 'The starting pitcher is ';

    let awayId = '';
    let awayPitcher = noPitcher;

    if (probables.away) {
        awayId = probables.away.id.toString();
        const player = players[probables.away.id];
        const livePlayer = livePlayers[probables.away.id];
        const stats = livePlayer.seasonStats.pitching;
        const statLine = ' (' + player.pitchHand.code + 'HP with a ' + stats.era + ' ERA after ' + stats.inningsPitched + ' innings pitched in ' + stats.gamesPlayed.toString() + ' games)';
        awayPitcher = goPitcher + probables.away.fullName + statLine;
    }

    let homeId = '';
    let homePitcher = noPitcher;

    if (probables.home) {
        homeId = probables.home.id.toString();
        const player = players[probables.home.id];
        const livePlayer = livePlayers[probables.home.id];
        const stats = livePlayer.seasonStats.pitching;
        const statLine = ' (' + player.pitchHand.code + 'HP with a ' + stats.era + ' ERA after ' + stats.inningsPitched + ' innings pitched in ' + stats.gamesPlayed.toString() + ' games)';
        homePitcher = goPitcher + probables.home.fullName + statLine;
    }

    const home = 'The ' + homeTeam.name + ' have a record of ' + homeTeam.record.wins + '-' + homeTeam.record.losses + '. ' + homePitcher + '.'
    const away = 'The ' + awayTeam.name + ' have a record of ' + awayTeam.record.wins + '-' + awayTeam.record.losses + '. ' + awayPitcher + '.'

    const preview: PreviewDetails = {
        title: title,
        description: description,
        home: home,
        away: away,
        homeId: homeId,
        awayId: awayId,
    }

    return preview;
};

const liveGameBatting = (players: { [key: string]: LivePlayerJson }) => {
    const lineup = [];

    for (const key in players) {
        const player = players[key];

        if(player.battingOrder) {
            const stats = player.stats.batting;
            const season = player.seasonStats.batting;
            lineup.push({
                title: player.person.fullName + (player.jerseyNumber ? ' - ' + player.jerseyNumber : '') + ' - ' + player.position.abbreviation,
                order: player.battingOrder,
                depth: player.battingOrder.toString().slice(-1),
                ab: stats.atBats,
                r: stats.runs,
                h: stats.hits,
                rbi: stats.rbi,
                bb: stats.baseOnBalls,
                so: stats.strikeOuts,
                lob: stats.leftOnBase,
                avg: season.avg,
                ops: season.ops
             }); 
        }
    };

    return  {key: 'ab,r,h,rbi,bb,so,lob,avg,ops', players: lineup.sort((a, b) => a.order - b.order)};
};

const liveGamePitching = (team: BoxscoreTeam, players: { [key: string]: PlayerJson }) => {
   const lineup:RosterPitcher[] = [];

   team.pitchers.forEach(id => {
        const player = team.players['ID' + id];
        const playerAlt = players['ID' + id];
        const stats = player.stats.pitching
        const season = player.seasonStats.pitching
        lineup.push({
            title: player.person.fullName + (player.jerseyNumber ? ' - ' + player.jerseyNumber : '') + ' - ' + playerAlt.pitchHand.code + 'HP', 
            depth: '0',
            ip: stats ? stats.inningsPitched : '',
            h: stats ? stats.hits : 0,
            r: stats ? stats.runs : 0,
            er: stats ? stats.earnedRuns : 0,
            bb: stats ? stats.baseOnBalls : 0,
            so: stats ? stats.strikeOuts : 0,
            hr: stats ? stats.homeRuns : 0,
            era: season ? season.era : '' 
        });
   });

   return {key: 'ip,h,r,er,bb,so,hr,era', players: lineup};
};

const liveGameBench = (team: BoxscoreTeam, players: { [key: string]: PlayerJson }) => {

   const lineup:RosterBatter[] = [];

   team.bench.forEach(id => {
        const player = team.players['ID' + id];
        const season = player.seasonStats.batting;
        lineup.push({
            title: player.person.fullName + (player.jerseyNumber ? ' - ' + player.jerseyNumber : '') + ' - ' + player.position.abbreviation,
            depth: '0',
            ab: season.atBats,
            r: season.runs,
            h: season.hits,
            rbi: season.rbi,
            bb: season.baseOnBalls,
            so: season.strikeOuts,
            lob: season.leftOnBase,
            avg: season.avg,
            ops: season.ops
        });
    });

    return {key: 'ab,r,h,rbi,bb,so,lob,avg,ops', players: lineup};
};

const liveGameBullpen = (team: BoxscoreTeam, players: { [key: string]: PlayerJson }) => {
   const lineup:RosterPitcher[] = [];

   team.bullpen.forEach(id => {
        const player = team.players['ID' + id];
        const playerAlt = players['ID' + id];
        const season = player.seasonStats.pitching;
        lineup.push({
            title: player.person.fullName + (player.jerseyNumber ? ' - ' + player.jerseyNumber : '') + ' - ' + playerAlt.pitchHand.code + 'HP', 
            depth: '0',
            ip: season.inningsPitched,
            h: season.hits,
            r: season.runs,
            er: season.earnedRuns,
            bb: season.baseOnBalls,
            so: season.strikeOuts,
            hr: season.homeRuns,
            era: season.era
        });
   });

   return {key: 'ip,h,r,er,bb,so,hr,era', players: lineup};
};

const liveGameTeams = (json: LiveJson) => {
    const homeTeam = json.gameData.teams.home;
    const awayTeam = json.gameData.teams.away;
    const homeData = json.liveData.boxscore.teams.home;
    const awayData = json.liveData.boxscore.teams.away; 
    const allPlayers = json.gameData.players;

    const teams: TeamsDetails = {
        away: {
            id: awayTeam.id,
            name: awayTeam.clubName,
            abbreviation: awayTeam.abbreviation,
            batting: liveGameBatting(awayData.players),
            pitching: liveGamePitching(awayData, allPlayers),
            bench: liveGameBench(awayData, allPlayers),
            bullpen: liveGameBullpen(awayData, allPlayers)
        },
        home: {
            id: homeTeam.id,
            name: homeTeam.clubName,
            abbreviation: homeTeam.abbreviation,
            batting: liveGameBatting(homeData.players),
            pitching: liveGamePitching(homeData, allPlayers),
            bench: liveGameBench(homeData, allPlayers),
            bullpen: liveGameBullpen(homeData, allPlayers)
        }
    }

    return teams;
};

// Build a team's current batting order: the active occupant of each lineup
// slot, in slot order, with anyone no longer in the game filtered out.
// battingOrder encodes the slot in its hundreds and the substitution depth in
// its units (400 = slot-4 starter, 401 = the pinch hitter who replaced them),
// so within a slot the highest battingOrder is whoever is currently batting.
const activeBattingOrder = (players: { [key: string]: LivePlayerJson }): number[] => {
    const batters = Object.values(players)
        .filter((player) => player.battingOrder)
        .sort((a, b) => a.battingOrder - b.battingOrder);

    // Ascending order means a slot's deeper substitutes overwrite the players
    // they replaced, so each slot is left holding its current occupant; the Map
    // preserves first-seen (slot) order for the values.
    const currentBySlot = new Map<number, number>();
    for (const player of batters) {
        currentBySlot.set(Math.floor(player.battingOrder / 100), player.person.id);
    }
    return [...currentBySlot.values()];
};

const liveNextBatterIndexes = (json: LiveJson, playerId: number): number[] => {
    const awayOrder = activeBattingOrder(json.liveData.boxscore.teams.away.players);
    const homeOrder = activeBattingOrder(json.liveData.boxscore.teams.home.players);

    const awayIndex = awayOrder.indexOf(playerId);
    const order = awayIndex >= 0 ? awayOrder : homeOrder;
    const batterIndex = awayIndex >= 0 ? awayIndex : homeOrder.indexOf(playerId);
    if (batterIndex < 0) {
        return [];
    }

    // On-deck and in-the-hole are the next two active batters, wrapping around.
    return [order[(batterIndex + 1) % order.length], order[(batterIndex + 2) % order.length]];
};

const livePitcherStats = (pitcher: LivePlayerJson) => {
    const gameStats = pitcher.stats.pitching || {} as LivePlayerJson['stats']['pitching'];
    const seasonStats = pitcher.seasonStats.pitching || {} as LivePlayerJson['seasonStats']['pitching'];
    const ip = gameStats.inningsPitched ?? '0.0';
    const pitches = gameStats.pitchesThrown ?? 0;
    const strikes = gameStats.strikes ?? 0;
    const era = seasonStats.era ?? '-.--';
    return ip + ' IP (' + pitches + 'P ' + strikes + 'S), ' + era + ' ERA';
};

const liveBatterStats = (batter: LivePlayerJson) => {
    const gameStats = batter.stats.batting || {} as LivePlayerJson['stats']['batting'];
    const seasonStats = batter.seasonStats.batting || {} as LivePlayerJson['seasonStats']['batting'];
    const hits = gameStats.hits ?? 0;
    const atBats = gameStats.atBats ?? 0;
    const avg = seasonStats.avg ?? '.---';
    const ops = seasonStats.ops ?? '.---';
    const homeRuns = seasonStats.homeRuns ?? 0;
    return hits.toString() + '-' + atBats.toString() + ', '
        + avg + ' AVG, ' + ops + ' OPS, ' + homeRuns.toString() + ' HR';
};

const emptyMatchupPlayer = { id: '', title: '', stats: '' };

const liveGameMatchup = (json: LiveJson) => {
        const players = liveGameLivePlayers(json);
        const currentPlay = json.liveData.plays.currentPlay;
        const matchup = currentPlay && currentPlay.matchup;

        if (!matchup || !matchup.pitcher || !matchup.batter) {
            return {
                pitcher: emptyMatchupPlayer,
                batter: emptyMatchupPlayer,
                onDeck: emptyMatchupPlayer,
                inHole: emptyMatchupPlayer,
            } as MatchupDetails;
        }

        const pitcher = players[matchup.pitcher.id];
        const batter = players[matchup.batter.id];
        const nextBatters = liveNextBatterIndexes(json, matchup.batter.id);
        const onDeck = players[nextBatters[0]];
        const inHole = players[nextBatters[1]];

        const pitchHand = (matchup.pitchHand && matchup.pitchHand.code) ? matchup.pitchHand.code + 'HP' : '';
        const batSide = (matchup.batSide && matchup.batSide.description) ? 'Batting ' + matchup.batSide.description : '';

        const buildTitle = (player: LivePlayerJson, suffix: string) => {
            const parts = [player.person.fullName];
            if (player.jerseyNumber) parts.push('#' + player.jerseyNumber);
            if (suffix) parts.push(suffix);
            return parts.join(' | ');
        };

        const results: MatchupDetails = {
            pitcher: pitcher ? {
                id: pitcher.person.id.toString(),
                title: buildTitle(pitcher, pitchHand),
                stats: livePitcherStats(pitcher),
            } : emptyMatchupPlayer,
            batter: batter ? {
                id: batter.person.id.toString(),
                title: buildTitle(batter, batSide),
                stats: liveBatterStats(batter),
            } : emptyMatchupPlayer,
            onDeck: onDeck ? {
                id: onDeck.person.id.toString(),
                title: buildTitle(onDeck, ''),
                stats: liveBatterStats(onDeck),
            } : emptyMatchupPlayer,
            inHole: inHole ? {
                id: inHole.person.id.toString(),
                title: buildTitle(inHole, ''),
                stats: liveBatterStats(inHole),
            } : emptyMatchupPlayer,
        }

        return results;
};

const liveGameWrap = (json: LiveJson) => {

    let wrap: WrapDetails = {
            title: '',
            winner: '',
            loser: '',
            winnerId: '',
            loserId: ''
        }

    if (json.gameData.status.abstractGameCode === 'F') {

        const home = json.liveData.linescore.teams.home;
        const away = json.liveData.linescore.teams.away;

        if (home.runs === away.runs) {
            wrap.title = 'Ended in a tie ' + away.runs.toString() + '-' + home.runs.toString();
        } else {
            const homeTeam = json.gameData.teams.home;
            const awayTeam = json.gameData.teams.away;

            if (home.runs > away.runs) {
                wrap.title = homeTeam.name + ' win ' + home.runs.toString() + '-' + away.runs.toString();
            } else {
                wrap.title = awayTeam.name + ' win ' + away.runs.toString() + '-' + home.runs.toString();
            }

            const winner = json.liveData.decisions.winner;
            const loser = json.liveData.decisions.loser;

            wrap.winnerId = winner.id.toString();
            wrap.loserId = loser.id.toString();

            const players = liveGameLivePlayers(json);

            const winnerStats = players[winner.id].seasonStats.pitching;
            const winnerStatLine = winnerStats.wins.toString() + '-' + winnerStats.losses.toString() + ' on the season with a ' + winnerStats.era + ' ERA';
            wrap.winner = 'The winning pitcher was ' + winner.fullName + 
                ' whose record is now ' + winnerStatLine + '.';

            const loserStats = players[loser.id].seasonStats.pitching;
            const loserStatLine = loserStats.wins.toString() + '-' + loserStats.losses.toString() + ' on the season with a ' + loserStats.era + ' ERA';
            wrap.loser =  'The losing pitcher was ' + loser.fullName + 
                ' whose record is now ' + loserStatLine + '.';  
        }
    }

    return wrap;
};

const liveGameEvents = (json: LiveJson) => {
    const plays = json.liveData.plays.allPlays.slice().reverse();
    const inningHalves: string[] = [];
    const innings:EventInning[] = [];

    plays.forEach(play => {
        if (play.result.description) {
            const key = play.about.halfInning + play.about.inning.toString();

            if(!inningHalves.includes(key)) {
                inningHalves.push(key);
            }

            const index = inningHalves.indexOf(key);

            if (!innings[index]) {
                innings[index] = {
                    title: play.about.halfInning.charAt(0).toUpperCase() + play.about.halfInning.slice(1) + ' ' + play.about.inning.toString(),
                    events: []
                }
            }

            innings[index].events.push({
                title: play.result.description,
                playerId: play.matchup.batter.id
            });
        }
     });

     return innings;
};

export const buildGameData = (json: LiveJson) => {
    const data:GameData = {
        title: liveGameTitle(json),
        gameId: json.gamePk, 
        status: json.gameData.status.abstractGameCode,
        linescore: liveGameLinescore(json),
        preview: liveGamePreview(json),
        wrap: liveGameWrap(json),
        teams: liveGameTeams(json),
        matchup: liveGameMatchup(json),
        events: liveGameEvents(json)
    };
    return data;
}
// Order: live first, then upcoming, then game-two, then finals — same as the
// React games page. (Next.js addition, not in the React lib.)
export const sortGames = (games: Game[]): Game[] => {
  const order = ['live', 'scheduled', 'game-two', 'final'];
  return order.flatMap((category) => games.filter((game) => game.category === category));
};
