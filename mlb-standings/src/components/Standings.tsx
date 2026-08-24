import { useCallback, useEffect, useState } from "react";

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
  }
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

const Standings = ({ teamId, standingsType }: StandingsProps) => {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  
  const teamsFromStandings = (standings: StandingsReponse) => {
    const teams:TeamRecord[] = [];
		standings.records.forEach((division) => {
			division.teamRecords.forEach((team) => {
        console.log(team);
				teams.push(team);
			});
		});
    return teams;
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
      <td>???</td>
    </tr>
  )

  const groupTables = () => {
    const groups = groupedResults();
    return groups.map((group) => (
        <table cellSpacing="0">
          {tableHeader(group.name)}
          <tbody>{group.teams.map((teamRecord) => tableRow(teamRecord))}</tbody>
        </table>
      )
    )
  };

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  return (
    <div>

      {standingsType === 'sport' && (
        <table cellSpacing="0">
          {tableHeader('Team')}
          <tbody>{currentTeamRow()}</tbody>
        </table> 
      )}

      { groupTables() }

      
    </div>
  );
}

export default Standings;