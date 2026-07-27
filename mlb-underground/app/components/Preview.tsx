import { PreviewDetails } from '@/lib/types';

type PreviewProps = {
  preview: PreviewDetails;
};

const Preview = (props: PreviewProps) => {
  const { preview } = props;

  return (
    <div className="tab tab-preview">
      <h3>{preview.title}</h3>
      <div className="sidebar-item">{preview.description}</div>
      <div className={`sidebar-item${preview.homeId !== '' ? ' sidebar-item-player' : ''}`}>
        <div
          className="image"
          data-testid="preview-headshot"
          style={{
            backgroundImage:
              'url(//content.mlb.com/images/headshots/current/60x60/' + preview.homeId + '@2x.png)',
          }}
        ></div>
        {preview.home}
      </div>
      <div className={`sidebar-item${preview.awayId !== '' ? ' sidebar-item-player' : ''}`}>
        <div
          className="image"
          data-testid="preview-headshot"
          style={{
            backgroundImage:
              'url(//content.mlb.com/images/headshots/current/60x60/' + preview.awayId + '@2x.png)',
          }}
        ></div>
        {preview.away}
      </div>
    </div>
  );
};

export default Preview;
