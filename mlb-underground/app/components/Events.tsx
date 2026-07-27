import { EventInning, EventInningEvent } from '@/lib/types';

type EventProps = {
  events: EventInning[];
};

const Events = (props: EventProps) => {
  const { events } = props;

  const buildEvents = (innerEvents: EventInningEvent[]) =>
    innerEvents.map((event, index) => (
      <div key={index} className="sidebar-item sidebar-item-player">
        {event.title}
        <div
          className="image"
          data-testid="event-headshot"
          style={{
            backgroundImage:
              'url(//content.mlb.com/images/headshots/current/60x60/' + event.playerId + '@2x.png)',
          }}
        ></div>
      </div>
    ));

  const buildInnings = (innings: EventInning[]) =>
    innings.map((inning, index) => (
      <div key={index} className="inning">
        <h3>{inning.title}</h3>
        {buildEvents(inning.events)}
      </div>
    ));

  return <div className="events">{buildInnings(events)}</div>;
};

export default Events;
