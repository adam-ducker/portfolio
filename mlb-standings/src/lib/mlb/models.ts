import type { RawTeamRecord, TeamRecords, View } from './types';

/** Format an ISO date the same way the original site did: "Tue Aug 11 @ 6:15PM". */
export function formatDate(iso: string): string {
	const d = new Date(iso);
	const parts = new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
		// timeZone: 'America/New_York', // uncomment to force a zone
	})
		.formatToParts(d)
		.reduce<Record<string, string>>((acc, p) => ((acc[p.type] = p.value), acc), {});

	const time = `${parts.hour}:${parts.minute}${parts.dayPeriod.toUpperCase()}`;

	return `${parts.weekday} ${parts.month} ${parts.day} @ ${time}`;
}

interface Ranking {
	rank: number;
	gamesBack: string;
	eliminationNumber: string;
}

interface WildcardRanking {
	rank: number | string;
	gamesBack: string;
	eliminationNumber: string;
}

export class Game {
	id: number;
	date: string;
	homeId: number;
	awayId: number;
	homeName: string;
	awayName: string;
	homeScore: number;
	awayScore: number;
	status: string;
	live: string;

	constructor(
		id: number,
		date: string,
		homeId: number,
		awayId: number,
		homeName: string,
		awayName: string,
		homeScore: number,
		awayScore: number,
		status: string,
		live: string
	) {
		this.id = id;
		this.date = date;
		this.homeId = homeId;
		this.awayId = awayId;
		this.homeName = homeName;
		this.awayName = awayName;
		this.homeScore = homeScore;
		this.awayScore = awayScore;
		this.status = status;
		this.live = live;
	}

	get isFinal(): boolean {
		return this.status === 'F' || this.status === 'O';
	}

	get awayIsWinner(): boolean {
		return this.isFinal && this.homeScore < this.awayScore;
	}

	get homeIsWinner(): boolean {
		return this.isFinal && this.homeScore > this.awayScore;
	}
}

export class RemainingGame {
	date: string;
	title: string;
	record: string;
	runDifferential: number;
	probables: string;

	constructor(
		date: string,
		title: string,
		record: string,
		runDifferential: number,
		probables: string
	) {
		this.date = date;
		this.title = title;
		this.record = record;
		this.runDifferential = runDifferential;
		this.probables = probables;
	}
}

export class Team {
	id: number;
	name: string;
	abbreviation: string;
	league: string;
	division: string;
	gamesPlayed: number;
	gamesRemaining: number;
	ranking: {
		sport: Ranking;
		league: Ranking;
		division: Ranking;
		wildcard: WildcardRanking;
	};
	runDifferential: number;
	runsAllowed: number;
	runsScored: number;
	records: TeamRecords;
	wins: number;
	losses: number;
	games: Game[];

	constructor(json: RawTeamRecord) {
		this.id = json.team.id;
		this.name = json.team.clubName;
		this.abbreviation = json.team.abbreviation;
		this.league = json.team.league.name;
		this.division = json.team.division.name;
		this.gamesPlayed = json.gamesPlayed;
		this.gamesRemaining = 162 - json.gamesPlayed;
		// Ranks arrive as strings ("1", "2", …). Coerce to numbers so comparisons
		// (sort, division-leader detection) behave like the original site's loose `==`.
		this.ranking = {
			sport: {
				rank: Number(json.sportRank),
				gamesBack: json.sportGamesBack,
				eliminationNumber: json.eliminationNumberSport
			},
			league: {
				rank: Number(json.leagueRank),
				gamesBack: json.leagueGamesBack,
				eliminationNumber: json.eliminationNumberLeague
			},
			division: {
				rank: Number(json.divisionRank),
				gamesBack: json.divisionGamesBack,
				eliminationNumber: json.eliminationNumberDivision
			},
			wildcard: {
				rank: json.wildCardRank ?? '',
				gamesBack: json.wildCardGamesBack,
				eliminationNumber: json.wildCardEliminationNumber
			}
		};
		this.runDifferential = json.runDifferential;
		this.runsAllowed = json.runsAllowed;
		this.runsScored = json.runsScored;
		this.records = json.records;
		this.wins = json.wins;
		this.losses = json.losses;
		this.games = [];
	}

	private pct(wins: number, losses: number): string {
		let percent = (wins / (wins + losses)).toFixed(3);
		if (percent[0] === '0') {
			percent = percent.substring(1);
		}
		return percent;
	}

	record(recordType: 'all' | 'home' | 'away' | 'winners' | 'losers'): string {
		let wins = 0;
		let losses = 0;
		if (recordType === 'all') {
			wins = this.wins;
			losses = this.losses;
		} else if (recordType === 'losers') {
			const split = this.records.splitRecords.filter((s) => s.type === 'winners')[0];
			wins = this.wins - split.wins;
			losses = this.losses - split.losses;
		} else {
			const split = this.records.splitRecords.filter((s) => s.type === recordType)[0];
			if (split) {
				wins = split.wins;
				losses = split.losses;
			}
		}
		if (wins + losses === 0) {
			return '0-0 (.000)';
		}
		return wins + '-' + losses + ' (' + this.pct(wins, losses) + ')';
	}

	gamesBack(view: View): string {
		return this.ranking[view as 'sport' | 'league' | 'division' | 'wildcard'].gamesBack;
	}

	eleminationNumber(view: View): string {
		return this.ranking[view as 'sport' | 'league' | 'division' | 'wildcard'].eliminationNumber;
	}

	toughness(teams: Team[]): number | string {
		if (this.games.length === 0) {
			return '';
		} else {
			let toughness = 0;
			this.games.forEach((game) => {
				if (game.status === 'S') {
					const vsTeam = teams.filter(
						(team) => team.id === (game.homeId === this.id ? game.awayId : game.homeId)
					)[0];
					toughness += vsTeam.wins - vsTeam.losses;
				}
			});
			return toughness;
		}
	}

	get streak(): string {
		if (this.games.length === 0) {
			return ' ';
		} else {
			let streak = '';
			this.games.forEach((game) => {
				if (game.isFinal) {
					streak +=
						(game.homeId === this.id && game.homeIsWinner) ||
						(game.awayId === this.id && game.awayIsWinner)
							? 'W'
							: 'L';
				}
			});
			streak = streak.slice(-20);
			const w = (streak.match(/W/g) || []).length;
			const l = (streak.match(/L/g) || []).length;
			return streak + ' (' + w + '-' + l + ')';
		}
	}

	get next(): string {
		if (this.games.length === 0) {
			return '';
		}
		const game = this.games
			.slice()
			.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
			.filter((g) => g.status !== 'F' && g.status !== 'O')[0];
		if (game) {
			if (game.status !== 'I') {
				const homeAway = game.homeId === this.id ? '' : '@';
				const otherTeam = game.homeId === this.id ? game.awayName : game.homeName;
				return formatDate(game.date) + ' - ' + homeAway + otherTeam;
			} else {
				return (
					game.awayName +
					' ' +
					game.awayScore +
					' - ' +
					game.homeName +
					' ' +
					game.homeScore +
					' (' +
					game.live +
					')'
				);
			}
		}
		return '';
	}

	set setGames(games: Game[]) {
		this.games = games;
	}
}
