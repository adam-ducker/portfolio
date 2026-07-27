import { MatchupDetails, MatchupDetailsPlayer } from '@/lib/types';

type MatchupProps = {
  matchup: MatchupDetails;
};

const Matchup = (props: MatchupProps) => {
  const { matchup } = props;

  const buildPlayer = (label: string, player: MatchupDetailsPlayer) => (
    <div className="sidebar-item sidebar-item-player">
      <div className="matchup-label">{label}</div>
      <div className="matchup-name">{player.title}</div>
      <div className="matchup-status">{player.stats}</div>
      <div
        className="image"
        data-testid="matchup-headshot"
        style={{
          backgroundImage:
            'url(//content.mlb.com/images/headshots/current/60x60/' + player.id + '@2x.png)',
        }}
      ></div>
    </div>
  );

  return (
    <div className="matchup-wrapper">
      <h3>Current Inning</h3>
      <div className="matchup">
        {buildPlayer('Pitching', matchup.pitcher)}
        {buildPlayer('Batting', matchup.batter)}
        {buildPlayer('On Deck', matchup.onDeck)}
        {buildPlayer('In Hole', matchup.inHole)}
      </div>
    </div>
  );
};

export default Matchup;
