import { GameData } from '@/lib/types';

type LinescoreProps = {
  gameData: GameData;
};

const Linescore = (props: LinescoreProps) => {
  const { linescore, title } = props.gameData;

  const buildLine = (
    line: string[],
    rowName: string,
    currentInning: number,
    gameState: string,
    inningState: string
  ) => {
    return line.map((value, index) => {
      const classNames = [];

      if (index === currentInning && rowName === inningState && gameState !== 'F' && gameState !== 'P') {
        classNames.push('current');
      }

      if (
        gameState === 'F' ||
        currentInning > index ||
        (currentInning === index &&
          ((inningState !== 'Top' && rowName !== 'Bottom') || inningState === 'End'))
      ) {
        classNames.push('active');

        if (value !== '0' && value !== 'x') {
          classNames.push('score');
        }
      }

      if (index === line.length - 3) {
        classNames.push('runs');
      }
      if (index >= line.length - 3) {
        classNames.push('last');
      }
      return (
        <td key={index} className={classNames.join(' ')}>
          {value}
        </td>
      );
    });
  };

  const labels = buildLine(linescore.labels, '', linescore.currentInning, linescore.gameState, linescore.inningState);
  const top = buildLine(linescore.top, 'Top', linescore.currentInning, linescore.gameState, linescore.inningState);
  const bottom = buildLine(
    linescore.bottom,
    'Bottom',
    linescore.currentInning,
    linescore.gameState,
    linescore.inningState
  );

  return (
    <div className="linescore">
      <h3>{title}</h3>
      <table cellPadding="0" cellSpacing="0">
        <tbody>
          <tr className="labels">{labels}</tr>
          <tr>{top}</tr>
          <tr>{bottom}</tr>
        </tbody>
      </table>
    </div>
  );
};

export default Linescore;
