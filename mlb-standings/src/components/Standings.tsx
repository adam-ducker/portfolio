import { Fragment, useCallback, useEffect, useState } from "react";
import type { GameRecord, RecordSplit, SeasonGamesReponse, StandingsProps, StandingsReponse, TeamRecord, TeamRecordGroup } from "../lib/types";

const Standings = ({ teamId, standingsType }: StandingsProps) => {
  const [loaded, setLoaded] = useState(false);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  const [games, setGames] = useState<GameRecord[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(false);

  const [linescores, setLinescores] = useState<GameRecord[]>([]);
  const [linescoresLoaded, setLinescoresLoaded] = useState(false);

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
    if(teamsLoaded && gamesLoaded && linescoresLoaded) {
      setLoaded(true); // fully loaded
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
        setTeamsLoaded(true);
    } catch (err) {
      //  setError(err.message);
    } finally {
       //  setLoading(false);
    }
  }, []); 

  const fetchSeasonGames = useCallback(async () => {
    try {
        const year = new Date().getFullYear();
        const date = new Date();
        date.setDate(date.getDate() - 30);
        const start = date.toLocaleDateString('en-CA');
        const end = `${year}-12-31`;
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?lang=en&sportId=1&season=${year}&startDate=${start}&endDate=${end}`
        );
        const result = await response.json();
        const games = gamesFromDates(result);
        setGames(games);
        setGamesLoaded(true);
    } catch (err) {
      //  setError(err.message);
    } finally {
       //  setLoading(false);
    }
  }, []); 

  const fetchLinescores = useCallback(async () => {
    try {
        const today = new Date().toLocaleDateString('en-CA');
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?language=&sportId=1&date=${today}&hydrate=linescore`
        );
        const result = await response.json();
        const linescores = gamesFromDates(result);
        setLinescores(linescores);
        setLinescoresLoaded(true);
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
      // top row for current team
      groups.push({name: 'Team', key: 'group1', teams: sortedTeams.filter((team) => team.team.id === teamId)});
      // all other teams
      groups.push({name: 'Team', key: 'group2', teams: sortedTeams.filter((teamRecord) => teamRecord.team.id !== teamId)});
    } else if(standingsType === 'league') {
      ['National League', 'American League'].forEach(groupName => {
        groups.push(
          {name: groupName, key: groupName, teams: sortedTeams.filter((teamRecord) => teamRecord.team.league.name === groupName)}
        );
      })
    } else if(standingsType === 'division') {
      ['National League West', 'National League Central', 'National League East',
        'American League West', 'American League Central',  'American League East'].forEach(groupName => {
        const shortName = groupName.replace('National League', 'NL').replace('American League', 'AL');
        groups.push(
          {name: shortName, key: groupName, teams: sortedTeams.filter((teamRecord) => teamRecord.team.division.name === groupName)}
        );
      })
    } else if(standingsType === 'wildcard') {
      groups.push(
        {name: "NL Leaders", key: "NL Leaders", teams: sortedTeams.filter((team) => team.team.league.name == 'National League' && team.divisionRank === "1")}
      );
      groups.push(
        {name: "NL Wildcard", key: "NL Wildcard", teams: sortedTeams.filter((team) => team.team.league.name == 'National League' && team.divisionRank !== "1")}
      );
      groups.push(
        {name: "AL Leaders", key: "AL Leaders", teams: sortedTeams.filter((team) => team.team.league.name == 'American League' && team.divisionRank === "1")}
      );
      groups.push(
        {name: "AL Wildcard", key: "AL Wildcard", teams: sortedTeams.filter((team) => team.team.league.name == 'American League' && team.divisionRank !== "1")}
      );
    }

    return groups;
  }

  const gamesBack = (teamRecord: TeamRecord) => {
    if(standingsType === 'sport') {
      return teamRecord.sportGamesBack;
    } else if(standingsType === 'league') {
      return teamRecord.leagueGamesBack;
    } else if(standingsType === 'division') {
      return teamRecord.divisionGamesBack;
    } else if(standingsType === 'wildcard') {
      return teamRecord.wildCardGamesBack;
    }
  };

  const elimination = (teamRecord: TeamRecord) => {
    if(standingsType === 'sport') {
      return teamRecord.eliminationNumberSport;
    } else if(standingsType === 'league') {
      return teamRecord.eliminationNumberLeague;
    } else if(standingsType === 'division') {
      return teamRecord.eliminationNumberDivision;
    } else if(standingsType === 'wildcard') {
      return teamRecord.wildCardEliminationNumber;
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

  const toughness = (teamRecord: TeamRecord) => {
    const scheduled = games.filter((game) => 
      ['S'].includes(game.status.statusCode) &&
      (game.teams.away.team.id === teamRecord.team.id || game.teams.home.team.id === teamRecord.team.id)
    ); 
    let toughness = 0;
    scheduled.forEach((game) => {
      const vsTeam = teams.find((team) => team.team.id !== teamRecord.team.id && (team.team.id == game.teams.home.team.id || team.team.id == game.teams.away.team.id));
      if(vsTeam) {
        toughness += (vsTeam.leagueRecord.wins - vsTeam.leagueRecord.losses);
      }
    });
    return toughness;
  }

  const streak = (teamRecord: TeamRecord) => {
    const played = games.filter((game) => 
      ['F', 'O'].includes(game.status.statusCode) &&
      (game.teams.away.team.id === teamRecord.team.id || game.teams.home.team.id === teamRecord.team.id)
    ); 
    let streak = '';
  	played.forEach((game) => {
      streak += ((teamRecord.team.id == game.teams.home.team.id && game.teams.home.isWinner) || (teamRecord.team.id == game.teams.away.team.id && game.teams.away.isWinner)) ? 'W' : 'L';
    });
    streak = streak.slice(-20);
  	const w = (streak.match(/W/g) || []).length;
		const l = (streak.match(/L/g) || []).length; 
		return streak + ' (' + w + '-' + l + ')';
  }

  const nextGame = (teamRecord: TeamRecord) => {

    if(!games.length) {
      return "";
    }

    const sortedGames = games.sort((a, b) => a.gameDate.localeCompare(b.gameDate));

    const game = sortedGames.find((game) => 
      ['S', 'I', 'P', 'O'].includes(game.status.statusCode) &&
      (game.teams.away.team.id === teamRecord.team.id || game.teams.home.team.id === teamRecord.team.id)
    );

    if(game) {
      const home = game.teams.home;
      const away = game.teams.away;
      if(game.status.statusCode !== 'I') {  
        const homeAway = (home.team.id == teamRecord.team.id) ? '' : '@';
  			const otherTeam = home.team.id == teamRecord.team.id ? teamName(away.team.id) : teamName(home.team.id);
        return formatDate(game.gameDate) + ' - ' + homeAway + otherTeam
      } else {
        const live = linescores.find((linescore) => linescore.gamePk === game.gamePk);
        let gameState = '';
        if(live && live.linescore) {
          gameState = ` (${live.linescore.inningHalf.slice(0, 3)} ${live.linescore.currentInningOrdinal})`
        }

			  return teamName(away.team.id) + ' ' + (away.score || 0) + ' - ' + teamName(home.team.id) + ' ' + (home.score || 0) + gameState;
      }
    }
    return "";
  }

  const teamName = (id: number ) => {
    const team = teams.find((team) => team.team.id === id)

    if(team) {
      return team.team.clubName;
    }
    return '';
  }

  const tableHeader = (groupName: string) => (
    <thead><tr>
      <th>{groupName}</th>
      <th>Record</th>
      <th>Home</th>
      <th>Away</th>
      <th>GB</th>
      <th>E</th>
      <th>Rem</th>
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
      <td className="winners">{recordDisplay(findSplit(teamRecord, 'winners'))}</td>
      <td className="losers">{recordDisplay(findSplit(teamRecord, 'losers'))}</td>
      <td className="toughness">{toughness(teamRecord)}</td>
      <td className="mono">{streak(teamRecord)}</td>
      <td className="next">{nextGame(teamRecord)}</td>
    </tr>
  )

  const groupTables = () => {
    const groups = groupedResults();
    return groups.map((group) => (
        <table key={group.key} cellSpacing="0">
          {tableHeader(group.name)}
          <tbody>{group.teams.map((teamRecord) => tableRow(teamRecord))}</tbody>
        </table>
      )
    )
  };

  useEffect(() => {
    fetchStandings();
    fetchSeasonGames();
    fetchLinescores();
  }, [fetchStandings]);

  useEffect(() => {
    attemptToLoad();
  }, [teamsLoaded, gamesLoaded, linescoresLoaded]);

  return (
    <Fragment>
      {loaded && ( 
        <div>
          { groupTables() }
        </div>
    )}
    </Fragment>
  );
}

export default Standings;