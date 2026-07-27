import Lineup from './Lineup';
import { Team } from '@/lib/types';

type RosterProps = {
  team: Team;
};

const Roster = (props: RosterProps) => {
  const { team } = props;
  return (
    <div className="rosters">
      <Lineup title="Batting" roster={team.batting} />
      <Lineup title="Pitching" roster={team.pitching} />
      <Lineup title="Bench" roster={team.bench} />
      <Lineup title="Bullpen" roster={team.bullpen} />
    </div>
  );
};

export default Roster;
