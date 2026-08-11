<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { formatDate } from '$lib/mlb/models';
	import {
		buildConfig,
		groupByRank,
		loadStandings,
		type StandingsData
	} from '$lib/mlb/standings';
	import type { View } from '$lib/mlb/types';

	const DEFAULT_TEAM_ID = 119; // Dodgers, matching the original site.
	const VALID_VIEWS: View[] = ['sport', 'all', 'league', 'division', 'wildcard', 'playoffs'];

	// Captured once so the fetch window (today / 30 days back) is stable for the session.
	const now = new Date();

	let data = $state<StandingsData | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const view = $derived.by<View>(() => {
		const tab = page.url.searchParams.get('tab');
		return tab && (VALID_VIEWS as string[]).includes(tab) ? (tab as View) : 'sport';
	});

	const currentTeamId = $derived.by<number>(() => {
		const raw = page.url.searchParams.get('teamId');
		const id = raw ? parseInt(raw, 10) : NaN;
		return Number.isNaN(id) ? DEFAULT_TEAM_ID : id;
	});

	const groups = $derived(data ? groupByRank(data.teams, view, currentTeamId) : []);

	// Only the "remaining games" dataset depends on the selected team, so re-fetch on team change.
	$effect(() => {
		const teamId = currentTeamId;
		loading = true;
		error = null;
		loadStandings(buildConfig(teamId, 'sport', now))
			.then((d) => {
				data = d;
			})
			.catch((e: unknown) => {
				error = e instanceof Error ? e.message : String(e);
			})
			.finally(() => {
				loading = false;
			});
	});

	const tabs: Array<{ label: string; view: View; href: string }> = [
		{ label: 'All', view: 'sport', href: `${base}/` },
		{ label: 'League', view: 'league', href: `${base}/?tab=league` },
		{ label: 'Divisions', view: 'division', href: `${base}/?tab=division` },
		{ label: 'Wildcard', view: 'wildcard', href: `${base}/?tab=wildcard` },
		{ label: 'Playoffs', view: 'playoffs', href: `${base}/?tab=playoffs` }
	];
</script>

<div id="app">
	<div class="tabs">
		{#each tabs as tab (tab.view)}
			<div class="tab{view === tab.view ? ' selected' : ''}">
				<a href={tab.href}>{tab.label}</a>
			</div>
		{/each}
	</div>

	<div class="tab-content selected">
		<div id="table">
			{#if error}
				<p>Failed to load standings: {error}</p>
			{:else if loading && !data}
				<p>Loading…</p>
			{:else if data}
				{#each groups as group (group.title + group.teams.map((t) => t.id).join(','))}
					<table border="0" cellpadding="0" cellspacing="0">
						<tbody>
							<tr>
								<th>{group.title}</th>
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
							</tr>
							{#each group.teams as team (team.id)}
								<tr>
									<td><a href="{base}/?teamId={team.id}">{team.name}</a></td>
									<td>{team.record('all')}</td>
									<td>{team.record('home')}</td>
									<td>{team.record('away')}</td>
									<td>{team.gamesBack(view)}</td>
									<td>{team.eleminationNumber(view)}</td>
									<td>{team.gamesRemaining}</td>
									<td>{team.runsScored}</td>
									<td>{team.runsAllowed}</td>
									<td>{team.runDifferential}</td>
									<td class="winners">{team.record('winners')}</td>
									<td class="losers">{team.record('losers')}</td>
									<td class="toughness">{team.toughness(data.teams)}</td>
									<td class="mono">{team.streak}</td>
									<td class="next">{team.next}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/each}
			{/if}
		</div>
	</div>

	<div class="tab-content selected">
		<div id="games">
			{#if data && view === 'sport'}
				<table border="0" cellpadding="0" cellspacing="0">
					<tbody>
						<tr>
							<th>Date</th>
							<th>Team</th>
							<th>Record</th>
							<th>Dif</th>
							<th>Probable Pitchers</th>
						</tr>
						{#each data.remaining as game, i (i)}
							<tr>
								<td>{formatDate(game.date)}</td>
								<td>{game.title}</td>
								<td>{game.record}</td>
								<td>{game.runDifferential}</td>
								<td>{game.probables}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>
</div>
