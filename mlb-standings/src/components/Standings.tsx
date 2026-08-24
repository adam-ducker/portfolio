import { Fragment, useCallback, useEffect, useState } from "react";

interface StandingsProps {
  teamId: number; 
  standingsType: string;
}

interface RecordSplit {
  wins: number;
  losses: number;
  pct: string;
  type: string;
};

interface TeamRecord { 
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
  leagueRecord: RecordSplit;
  records: {
    splitRecords: RecordSplit[];
  }
  sportGamesBack: string;
  leagueGamesBack: string;
  eliminationNumberSport: string;
  eliminationNumberLeague: string;
  gamesPlayed: number;
  runsScored: number;
  runsAllowed: number;
  runDifferential: number;
}

interface TeamRecordGroup {
  name: string;
  teams: TeamRecord[];
}


interface StandingsReponse {
  records: {
    teamRecords: TeamRecord[];
  }[];
}

interface SeasonGamesReponse {
  dates: {
    games: GameRecord[];
  }[];
}

interface GameRecord {
  gameDate: string;
  status: {
    statusCode: string;
  };
  teams: {
    away: {
      team: {
        id: number;
        name: string;
        score: number;
      }
    },
    home: {
      team: {
        id: number;
        name: string;
        score: number;
      }
    }
  };
}

const Standings = ({ teamId, standingsType }: StandingsProps) => {
  const [loaded, setLoaded] = useState(false);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [games, setGames] = useState<GameRecord[]>([]);

  const formatDate = (iso:string) => {
  const d = new Date(iso);
    const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d).reduce((acc:any, p) => (acc[p.type] = p.value, acc), {});
  const time = `${parts.hour}:${parts.minute}${parts.dayPeriod.toUpperCase()}`;
  return `${parts.weekday} ${parts.month} ${parts.day} @ ${time}`;
}

  const gamesFromDates = (response: SeasonGamesReponse) => {
    const games:GameRecord[] = [];
    response.dates.forEach((date) => {
		  date.games.forEach((game) => {
				games.push(game);
			});
    });
    return games;
  }

  const teamsFromStandings = (response: StandingsReponse) => {
    const teams:TeamRecord[] = [];
		response.records.forEach((division) => {
			division.teamRecords.forEach((team) => {
				teams.push(team);
			});
		});
    return teams;
  }

  const attemptToLoad = () => {
    if(teams.length) {
      setLoaded(true);
    }
  }

  const fetchStandings = useCallback(async () => {
    try {
        const response = await fetch(
          'https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&hydrate=team'
        );
        const result = await response.json();
        const teams = teamsFromStandings(result);
        setTeams(teams);
    } catch (err) {
      //  setError(err.message);
    } finally {
       //  setLoading(false);
    }
  }, []); 

  const fetchSeasonGames = useCallback(async () => {
    try {
        const year = new Date().getFullYear();
        const start = new Date().toLocaleDateString('en-CA');
        const end = `${year}-12-31`;
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?lang=en&sportId=1&season=${year}&startDate=${start}&endDate=${end}`
        );
        const result = await response.json();
        const games = gamesFromDates(result);
        setGames(games);
    } catch (err) {
      //  setError(err.message);
    } finally {
       //  setLoading(false);
    }
  }, []); 

  const groupedResults = () => {

    const groups:TeamRecordGroup[] = [];

    // sort by sport rank
    const sortedTeams = teams.sort((a,b) => a.sportRank - b.sportRank);

    if(standingsType === 'sport') {
      // exclude current team from this group
      groups.push({name: 'Team', teams: sortedTeams.filter((teamRecord) => teamRecord.team.id !== teamId)});
    } else if(standingsType === 'league') {
      ['National League', 'American League'].forEach(groupName => {
        groups.push(
          {name: groupName, teams: sortedTeams.filter((teamRecord) => teamRecord.team.league.name === groupName)}
        );
      })
    } else if(standingsType === 'division') {
      ['National League West', 'National League Central', 'National League East',
        'American League West', 'American League Central',  'American League East'].forEach(groupName => {

        const shortName = groupName.replace('National League', 'NL').replace('American League', 'AL');

        groups.push(
          {name: shortName, teams: sortedTeams.filter((teamRecord) => teamRecord.team.division.name === groupName)}
        );
      })
    }

    return groups;
  }


  const currentTeamRow = () => {
    const currentTeam = teams.find((team) => team.team.id === teamId);
    if(currentTeam) {
      return tableRow(currentTeam);
    }
  };

  const gamesBack = (teamRecord: TeamRecord) => {
    if(standingsType === 'sport') {
      return teamRecord.sportGamesBack;
    } else if(standingsType === 'league') {
      return teamRecord.leagueGamesBack;
    }
  };

  const elimination = (teamRecord: TeamRecord) => {
    if(standingsType === 'sport') {
      return teamRecord.eliminationNumberSport;
    } else if(standingsType === 'league') {
      return teamRecord.eliminationNumberLeague;
    }
  };

  const recordDisplay = (split: RecordSplit) => {
    return `${split.wins}-${split.losses} (${split.pct})`;
  }

  const findSplit = (teamRecord: TeamRecord, type: string) => {

    let wins = 0;
    let losses = 0;
    let pct = '.000';
  
    const split = teamRecord.records.splitRecords.find((s) => s.type === type);
    if(split) {
       wins = split.wins;
       losses = split.losses;
       pct = split.pct;
    } else if(type === 'losers') {
      const winners = teamRecord.records.splitRecords.find((s) => s.type === 'winners');
      if(winners) {
        wins = teamRecord.leagueRecord.wins - winners.wins;
        losses = teamRecord.leagueRecord.losses - winners.losses;
        pct = (wins / ( wins + losses)).toFixed(3).toString().substring(1);
      }
    }

    return { wins, losses, pct, type: 'none' }
  }

  const nextGame = (teamRecord: TeamRecord) => {

    if(!games.length) {
      return "";
    }

    // only scheduled, final, in progress, pregame, over
		///		['S', 'F', 'I', 'P', 'O'].includes(game.status.statusCode) && 

    console.log(teamRecord);

    console.log(games[0]);

    const game = games.find((game) => 
      ['S', 'F', 'I', 'P', 'O'].includes(game.status.statusCode) &&
      (game.teams.away.team.id === teamRecord.team.id || game.teams.home.team.id === teamRecord.team.id)
    );

    console.log(game);

    if(game) {
      const home = game.teams.home.team;
      const away = game.teams.away.team;

      if(game.status.statusCode !== 'I') {
        const homeAway = (home.id == teamRecord.team.id) ? '' : '@';
  			const otherTeam = home.id == teamRecord.team.id ? away.name : home.name;
        return formatDate(game.gameDate) + ' - ' + homeAway + otherTeam
        //} else if(game.status.statusCode == 'O') {
		    // return away.name + ' ' + (away.score || 0) + ' - ' + home.name + ' ' + (home.score || 0) + ' (Game over)';
      } else {
			  return away.name + ' ' + (away.score || 0) + ' - ' + home.name + ' ' + (home.score || 0) + ' ( ??? )';
      }
    }

    return "???";
  }

  const tableHeader = (groupName: string) => (
    <thead><tr>
      <th>{groupName}</th>
      <th>Record</th>
      <th>Home</th>
      <th>Away</th>
      <th>GB</th>
      <th>E</th>
      <th>Remaining</th>
      <th>RS</th>
      <th>RA</th>
      <th>Dif</th>
      <th>A500</th>
      <th>B500</th>
      <th>T</th>
      <th>Streak</th>
      <th>Next</th>
    </tr></thead>
  );

  const tableRow = (teamRecord: TeamRecord) => (
    <tr key={teamRecord.team.id}>
      <td>{teamRecord.team.clubName}</td>
      <td>{recordDisplay(teamRecord.leagueRecord)}</td>
      <td>{recordDisplay(findSplit(teamRecord, 'home'))}</td>
      <td>{recordDisplay(findSplit(teamRecord, 'away'))}</td>
      <td>{gamesBack(teamRecord)}</td>
      <td>{elimination(teamRecord)}</td>
      <td>{162 - teamRecord.gamesPlayed}</td>
      <td>{teamRecord.runsScored}</td>
      <td>{teamRecord.runsAllowed}</td>
      <td>{teamRecord.runDifferential}</td>
      <td>{recordDisplay(findSplit(teamRecord, 'winners'))}</td>
      <td>{recordDisplay(findSplit(teamRecord, 'losers'))}</td>
      <td>???</td>
      <td>???</td>
      <td>{nextGame(teamRecord)}</td>
    </tr>
  )

  const groupTables = () => {
    const groups = groupedResults();
    return groups.map((group) => (
        <table key={group.name} cellSpacing="0">
          {tableHeader(group.name)}
          <tbody>{group.teams.map((teamRecord) => tableRow(teamRecord))}</tbody>
        </table>
      )
    )
  };

  useEffect(() => {
    fetchStandings();
    fetchSeasonGames();
  }, [fetchStandings]);

  useEffect(() => {
    attemptToLoad();
  }, [teams]);

  return (
    <Fragment>
      {loaded && ( 
        <div>
          {standingsType === 'sport' && (
            <table cellSpacing="0">
              {tableHeader('Team')}
              <tbody>{currentTeamRow()}</tbody>
            </table> 
          )}
          { groupTables() }
        </div>
    )}
    </Fragment>
  );
}

export default Standings;