import { Roster, RosterPlayer } from '@/lib/types';

type LineupProps = {
  title: string;
  roster: Roster;
};

const Lineup = (props: LineupProps) => {
  const { title, roster } = props;

  const playerValues = (player: RosterPlayer, key: string) =>
    key.split(',').map((label: string) => {
      const cell = label as keyof typeof player;
      return <td key={cell}>{player[cell]}</td>;
    });

  const labels = roster.key.split(',').map((label: string) => <th key={label}>{label}</th>);

  const rows = roster.players.map((player) => (
    <tr key={player.title}>
      <td className={`depth-${player.depth}`}>{player.title}</td>
      {playerValues(player, roster.key)}
    </tr>
  ));

  return (
    <div>
      {roster.players.length > 0 && (
        <div className="roster">
          <div>
            <h3>{title}</h3>
          </div>
          <table cellPadding="0" cellSpacing="0">
            <thead>
              <tr>
                <th></th>
                {labels}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Lineup;
