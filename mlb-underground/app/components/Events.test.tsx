import { render, screen } from '@testing-library/react';
import Events from './Events';
import { EventInning } from '@/lib/types';

// Dodgers vs White Sox — the White Sox bat in the top of the inning, the
// Dodgers bat in the bottom. Event titles use the same format the MLB Stats
// API returns under `liveData.plays.allPlays[].result.description`.
const sampleEvents: EventInning[] = [
  {
    title: 'Top 1',
    events: [
      { title: 'Andrew Vaughn flies out to right fielder Mookie Betts.', playerId: '683734' },
      { title: 'Luis Robert Jr. strikes out swinging.',                  playerId: '673357' },
      { title: 'Andrew Benintendi grounds out, shortstop to first.',     playerId: '643217' },
    ],
  },
  {
    title: 'Bottom 1',
    events: [
      { title: 'Mookie Betts singles on a line drive to right field.',   playerId: '605141' },
      { title: 'Freddie Freeman homers (10) on a fly ball to right.',    playerId: '518692' },
      { title: 'Will Smith walks.',                                       playerId: '669257' },
    ],
  },
];

describe('<Events />', () => {
  it('renders each inning heading as an h3', () => {
    render(<Events events={sampleEvents} />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Top 1' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Bottom 1' })
    ).toBeInTheDocument();
  });

  it('renders each event description', () => {
    render(<Events events={sampleEvents} />);
    sampleEvents.forEach((inning) => {
      inning.events.forEach((event) => {
        expect(screen.getByText(event.title)).toBeInTheDocument();
      });
    });
  });

  it('renders a headshot background image using each playerId', () => {
    render(<Events events={sampleEvents} />);
    const images = screen.getAllByTestId('event-headshot');

    const expectedIds = sampleEvents.flatMap((inning) =>
      inning.events.map((event) => event.playerId)
    );
    expect(images).toHaveLength(expectedIds.length);

    images.forEach((img, idx) => {
      expect(img).toHaveStyle({
        backgroundImage: expect.stringContaining(
          `/60x60/${expectedIds[idx]}@2x.png`
        ),
      });
    });
  });

  it('renders innings in the order they were provided', () => {
    render(<Events events={sampleEvents} />);
    const inningHeadings = screen
      .getAllByRole('heading', { level: 3 })
      .map((el) => el.textContent);
    expect(inningHeadings).toEqual(['Top 1', 'Bottom 1']);
  });

  // The component is rendered as part of the Game tab from the first moment a
  // game becomes Live, before any plays have completed. An empty list should
  // render an empty events container, not crash.
  it('renders nothing when there are no innings yet', () => {
    render(<Events events={[]} />);
    expect(
      screen.queryByRole('heading', { level: 3 })
    ).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('event-headshot')).toHaveLength(0);
  });

  // The liveGameEvents transformer creates an inning entry as soon as the
  // first play in that half-inning lands, so we should never get an inning
  // with zero events in practice — but the component should still degrade
  // gracefully if it ever happens.
  it('renders an inning header even when that inning has no events', () => {
    render(
      <Events
        events={[{ title: 'Top 1', events: [] }]}
      />
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Top 1' })
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('event-headshot')).toHaveLength(0);
  });
});
