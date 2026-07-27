import { WrapDetails } from '@/lib/types';

type WrapProps = {
  wrap: WrapDetails;
};

const Wrap = (props: WrapProps) => {
  const { wrap } = props;

  return (
    <div className="tab tab-preview">
      <h3>{wrap.title}</h3>
      {wrap.winnerId === '' && wrap.loserId === '' && (
        <div className="sidebar-item">The only losers today are the fans.</div>
      )}
      {wrap.winnerId !== '' && (
        <div className="sidebar-item sidebar-item-player">
          <div
            className="image"
            style={{
              backgroundImage:
                'url(//content.mlb.com/images/headshots/current/60x60/' + wrap.winnerId + '@2x.png)',
            }}
          ></div>
          {wrap.winner}
        </div>
      )}
      {wrap.loserId !== '' && (
        <div className="sidebar-item sidebar-item-player">
          <div
            className="image"
            style={{
              backgroundImage:
                'url(//content.mlb.com/images/headshots/current/60x60/' + wrap.loserId + '@2x.png)',
            }}
          ></div>
          {wrap.loser}
        </div>
      )}
    </div>
  );
};

export default Wrap;
