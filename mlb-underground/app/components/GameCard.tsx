import { Game } from '@/lib/types';
import Media from './Media';

const headshot = (id: number) =>
  `url(//content.mlb.com/images/headshots/current/60x60/${id}@2x.png)`;

// One game "box" — markup ported from the React games page so the styling in
// games.scss applies unchanged.
const GameCard = ({ game }: { game: Game }) => {
  const showBox = game.category === 'live' || (game.category === 'final' && game.status === 'Final');

  return (
    <div className={`game ${game.category}`}>
      <div className="game-inner">
        <h3>{game.title}</h3>
        <h4>{game.venue}</h4>
        <h5>
          {game.description !== '' ? game.description + ' - ' : ''}
          {game.status}
        </h5>

        <div className="game-live">
          {showBox && (
            <div className="box">
              <table>
                <tbody>
                  <tr>
                    <th></th>
                    <th>R</th>
                    <th>H</th>
                    <th>E</th>
                  </tr>
                  <tr>
                    <td>{game.summary.away.name}</td>
                    <td className="runs">{game.summary.away.runs}</td>
                    <td>{game.summary.away.hits}</td>
                    <td>{game.summary.away.errors}</td>
                  </tr>
                  <tr>
                    <td>{game.summary.home.name}</td>
                    <td className="runs">{game.summary.home.runs}</td>
                    <td>{game.summary.home.hits}</td>
                    <td>{game.summary.home.errors}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {game.category === 'live' && (
            <div className="game-state">
              <div className="diamond">
                <div
                  title={game.summary.first}
                  className={'base first' + (game.summary.first !== '' ? ' on' : '')}
                ></div>
                <div
                  title={game.summary.second}
                  className={'base second' + (game.summary.second !== '' ? ' on' : '')}
                ></div>
                <div
                  title={game.summary.third}
                  className={'base third' + (game.summary.third !== '' ? ' on' : '')}
                ></div>
              </div>
              <div className="outs">
                {game.summary.outs} out{game.summary.outs === 1 ? '' : 's'},&nbsp;
                {game.summary.balls}-{game.summary.strikes}
              </div>
            </div>
          )}

          {game.summary.player_1.name !== '' && (
            <div className="matchup">
              <div className="player">
                <div className="image" style={{ backgroundImage: headshot(game.summary.player_1.id) }}></div>
                <div className="name">{game.summary.player_1.name}</div>
                <div className="stats">{game.summary.player_1.stats}</div>
              </div>
              <div className="player">
                <div className="image" style={{ backgroundImage: headshot(game.summary.player_2.id) }}></div>
                <div className="name">{game.summary.player_2.name}</div>
                <div className="stats">{game.summary.player_2.stats}</div>
              </div>
            </div>
          )}
        </div>

        <div className="media-wrapper">
          <Media game={game} feedType="Video" />
          <Media game={game} feedType="Audio" />
          <Media game={game} feedType="Clips" />
        </div>
      </div>
    </div>
  );
};

export default GameCard;
