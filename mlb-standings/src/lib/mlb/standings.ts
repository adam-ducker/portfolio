import { Game, RemainingGame, Team } from './models';
import type {
	LinescoreGame,
	RawScheduleGame,
	ScheduleResponse,
	StandingsResponse,
	View
} from './types';

export interface StandingsConfig {
	currentTeamId: number;
	view: View;
	year: string;
	/** Today, YYYY-MM-DD. */
	date: string;
	/** ~30 days ago, YYYY-MM-DD. Start of the window used for streaks. */
	backDate: string;
}

export interface TeamGroup {
	title: string;
	teams: Team[];
}

export interface StandingsData {
	teams: Team[];
	remaining: RemainingGame[];
}

const ALL_STAR_TEAM_IDS = [159, 160];

/** Build the default runtime config from the URL params, mirroring the original inline script. */
export function buildConfig(currentTeamId: number, view: View, now: Date): StandingsConfig {
	const iso = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
			d.getDate()
		).padStart(2, '0')}`;
	const back = new Date(now);
	back.setDate(back.getDate() - 30);
	return {
		currentTeamId,
		view,
		year: String(now.getFullYear()),
		date: iso(now),
		backDate: iso(back)
	};
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	return (await response.json()) as T;
}

function teamById(teams: Team[], id: number): Team | { name: string } {
	const matches = teams.filter((team) => team.id === id);
	return matches.length === 1 ? matches[0] : { name: 'Unknown' };
}

function saveTeams(standings: StandingsResponse): Team[] {
	const teams: Team[] = [];
	standings.records.forEach((division) => {
		division.teamRecords.forEach((team) => {
			teams.push(new Team(team));
		});
	});
	return teams;
}

function saveGames(
	teams: Team[],
	schedule: ScheduleResponse,
	linescores: LinescoreGame[]
): Game[] {
	const games: Game[] = [];
	schedule.dates.forEach((date) => {
		date.games.forEach((game) => {
			if (
				// not spring or exhibition
				!['S', 'E'].includes(game.gameType) &&
				// only scheduled, final, in progress, pregame, over
				['S', 'F', 'I', 'P', 'O'].includes(game.status.statusCode) &&
				// skip all star teams
				!ALL_STAR_TEAM_IDS.includes(game.teams.home.team.id) &&
				!ALL_STAR_TEAM_IDS.includes(game.teams.away.team.id)
			) {
				const linescore = linescores.filter((live) => live.gamePk === game.gamePk)[0];

				let live = '';
				if (linescore && linescore.linescore && linescore.linescore.inningHalf) {
					live =
						linescore.linescore.inningHalf.slice(0, 3) +
						' ' +
						(linescore.linescore.currentInningOrdinal ?? '');
				}

				games.push(
					new Game(
						game.gamePk,
						game.gameDate,
						game.teams.home.team.id,
						game.teams.away.team.id,
						teamById(teams, game.teams.home.team.id).name,
						teamById(teams, game.teams.away.team.id).name,
						game.teams.home.score || 0,
						game.teams.away.score || 0,
						game.status.statusCode,
						live
					)
				);
			}
		});
	});
	return games;
}

function saveRemainingGames(
	teams: Team[],
	schedule: ScheduleResponse,
	currentTeamId: number
): RemainingGame[] {
	const remaining: RemainingGame[] = [];
	schedule.dates.forEach((date) => {
		date.games.forEach((game: RawScheduleGame) => {
			if (
				// not spring or exhibition
				!['S', 'E'].includes(game.gameType) &&
				// games that aren't final
				game.status.statusCode !== 'F' &&
				game.status.statusCode !== 'O' &&
				// skip all star teams
				!ALL_STAR_TEAM_IDS.includes(game.teams.home.team.id) &&
				!ALL_STAR_TEAM_IDS.includes(game.teams.away.team.id)
			) {
				const vsId =
					game.teams.home.team.id === currentTeamId
						? game.teams.away.team.id
						: game.teams.home.team.id;
				const vsName = game.teams.home.team.id === currentTeamId ? '' : '@';

				let homePitcher = 'TBD';
				if (game.teams.home.probablePitcher) {
					const pitcher = game.teams.home.probablePitcher;
					homePitcher = pitcher.fullName + ' (' + pitcher.pitchHand.code + ')';
				}

				let awayPitcher = 'TBD';
				if (game.teams.away.probablePitcher) {
					const pitcher = game.teams.away.probablePitcher;
					awayPitcher = pitcher.fullName + ' (' + pitcher.pitchHand.code + ')';
				}

				let probables = homePitcher + ' vs ' + awayPitcher;
				if (probables === 'TBD vs TBD') {
					probables = '';
				}

				const vsTeam = teamById(teams, vsId);
				const record = vsTeam instanceof Team ? vsTeam.record('all') : '';
				const runDifferential = vsTeam instanceof Team ? vsTeam.runDifferential : 0;

				remaining.push(
					new RemainingGame(game.gameDate, vsName + vsTeam.name, record, runDifferential, probables)
				);
			}
		});
	});
	return remaining;
}

function addGamesToTeams(teams: Team[], games: Game[]): void {
	if (games.length > 0 && teams.length > 0) {
		teams.forEach((team) => {
			team.setGames = games.filter((game) => game.homeId === team.id || game.awayId === team.id);
		});
	}
}

/** Fetch all four StatsAPI datasets and assemble the standings view model. */
export async function loadStandings(config: StandingsConfig): Promise<StandingsData> {
	const base = 'https://statsapi.mlb.com/api/v1';

	const teamsUrl = `${base}/standings?leagueId=103,104&hydrate=team`;
	const gamesUrl = `${base}/schedule?lang=en&sportId=1&season=${config.year}&startDate=${config.backDate}&endDate=${config.year}-11-10`;
	const remainingUrl = `${base}/schedule?lang=en&sportId=1&season=${config.year}&startDate=${config.date}&endDate=${config.year}-12-31&eventTypes=primary&scheduleTypes=games,events,xref&hydrate=team,person,probablePitcher&teamId=${config.currentTeamId}`;
	const linescoresUrl = `${base}/schedule?language=&sportId=1&date=${config.date}&hydrate=linescore`;

	const [teamsJson, gamesJson, remainingJson, linescoresJson] = await Promise.all([
		fetchJson<StandingsResponse>(teamsUrl),
		fetchJson<ScheduleResponse>(gamesUrl),
		fetchJson<ScheduleResponse>(remainingUrl),
		fetchJson<ScheduleResponse>(linescoresUrl)
	]);

	const teams = saveTeams(teamsJson);
	const linescoreGames: LinescoreGame[] = linescoresJson.dates[0] ? linescoresJson.dates[0].games : [];
	const games = saveGames(teams, gamesJson, linescoreGames);
	const remaining = saveRemainingGames(teams, remainingJson, config.currentTeamId);
	addGamesToTeams(teams, games);

	return { teams, remaining };
}

/** Group and sort teams for the selected view — mirrors the original groupByRank(). */
export function groupByRank(teams: Team[], view: View, currentTeamId: number): TeamGroup[] {
	if (view === 'all') {
		const sorted = teams.slice().sort((a, b) => a.ranking.sport.rank - b.ranking.sport.rank);
		return [{ title: 'Team', teams: sorted }];
	} else if (view === 'sport') {
		const sorted = teams.slice().sort((a, b) => a.ranking.sport.rank - b.ranking.sport.rank);
		return [
			{ title: 'Team', teams: sorted.filter((team) => team.id === currentTeamId) },
			{ title: 'Team', teams: sorted.filter((team) => team.id !== currentTeamId) }
		];
	} else if (view === 'league') {
		const sorted = teams.slice().sort((a, b) => a.ranking.league.rank - b.ranking.league.rank);
		return [
			{ title: 'National League', teams: sorted.filter((t) => t.league === 'National League') },
			{ title: 'American League', teams: sorted.filter((t) => t.league === 'American League') }
		];
	} else if (view === 'division') {
		const sorted = teams.slice().sort((a, b) => a.ranking.division.rank - b.ranking.division.rank);
		return [
			{ title: 'NL West', teams: sorted.filter((t) => t.division === 'National League West') },
			{ title: 'NL Central', teams: sorted.filter((t) => t.division === 'National League Central') },
			{ title: 'NL East', teams: sorted.filter((t) => t.division === 'National League East') },
			{ title: 'AL West', teams: sorted.filter((t) => t.division === 'American League West') },
			{ title: 'AL Central', teams: sorted.filter((t) => t.division === 'American League Central') },
			{ title: 'AL East', teams: sorted.filter((t) => t.division === 'American League East') }
		];
	} else if (view === 'wildcard') {
		const sorted = teams.slice().sort((a, b) => a.ranking.sport.rank - b.ranking.sport.rank);
		return [
			{
				title: 'NL Leaders',
				teams: sorted.filter((t) => t.league === 'National League' && t.ranking.division.rank === 1)
			},
			{
				title: 'NL Wildcard',
				teams: sorted.filter((t) => t.league === 'National League' && t.ranking.division.rank > 1)
			},
			{
				title: 'AL Leaders',
				teams: sorted.filter((t) => t.league === 'American League' && t.ranking.division.rank === 1)
			},
			{
				title: 'AL Wildcard',
				teams: sorted.filter((t) => t.league === 'American League' && t.ranking.division.rank > 1)
			}
		];
	}
	// 'playoffs' was never implemented on the original site.
	return [];
}
