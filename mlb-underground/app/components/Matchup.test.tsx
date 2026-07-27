import { render, screen } from '@testing-library/react';
import Matchup from './Matchup';
import { MatchupDetails } from '@/lib/types';

const sampleMatchup: MatchupDetails = {
  pitcher: {
    id: '111',
    title: 'Sandy Koufax | #32 | LHP',
    stats: '6.0 IP (78P 52S), 1.73 ERA',
  },
  batter: {
    id: '222',
    title: 'Mookie Betts | #50 | Batting Right',
    stats: '2-4, .307 AVG, .892 OPS, 26 HR',
  },
  onDeck: {
    id: '333',
    title: 'Freddie Freeman | #5',
    stats: '1-3, .331 AVG, .976 OPS, 29 HR',
  },
  inHole: {
    id: '444',
    title: 'Jackie Robinson | #42',
    stats: '0-3, .311 AVG, .883 OPS, 19 HR',
  },
};

const emptyPlayer = { id: '', title: '', stats: '' };

const emptyMatchup: MatchupDetails = {
  pitcher: emptyPlayer,
  batter: emptyPlayer,
  onDeck: emptyPlayer,
  inHole: emptyPlayer,
};

describe('<Matchup />', () => {
  it('renders the Current Inning heading', () => {
    render(<Matchup matchup={sampleMatchup} />);
    expect(
      screen.getByRole('heading', { level: 3, name: /current inning/i })
    ).toBeInTheDocument();
  });

  it('renders all four role labels', () => {
    render(<Matchup matchup={sampleMatchup} />);
    expect(screen.getByText('Pitching')).toBeInTheDocument();
    expect(screen.getByText('Batting')).toBeInTheDocument();
    expect(screen.getByText('On Deck')).toBeInTheDocument();
    expect(screen.getByText('In Hole')).toBeInTheDocument();
  });

  it('renders each player title', () => {
    render(<Matchup matchup={sampleMatchup} />);
    expect(screen.getByText(sampleMatchup.pitcher.title)).toBeInTheDocument();
    expect(screen.getByText(sampleMatchup.batter.title)).toBeInTheDocument();
    expect(screen.getByText(sampleMatchup.onDeck.title)).toBeInTheDocument();
    expect(screen.getByText(sampleMatchup.inHole.title)).toBeInTheDocument();
  });

  it('renders each player stat line', () => {
    render(<Matchup matchup={sampleMatchup} />);
    expect(screen.getByText(sampleMatchup.pitcher.stats)).toBeInTheDocument();
    expect(screen.getByText(sampleMatchup.batter.stats)).toBeInTheDocument();
    expect(screen.getByText(sampleMatchup.onDeck.stats)).toBeInTheDocument();
    expect(screen.getByText(sampleMatchup.inHole.stats)).toBeInTheDocument();
  });

  it('renders a headshot background image using the player id for each player', () => {
    render(<Matchup matchup={sampleMatchup} />);
    const images = screen.getAllByTestId('matchup-headshot');
    expect(images).toHaveLength(4);

    const expectedIds = ['111', '222', '333', '444'];
    images.forEach((img, idx) => {
      expect(img).toHaveStyle({
        backgroundImage: expect.stringContaining(
          `/60x60/${expectedIds[idx]}@2x.png`
        ),
      });
    });
  });

  it('lays the players out in pitcher / batter / on-deck / in-hole order', () => {
    render(<Matchup matchup={sampleMatchup} />);
    // getAllByText with a regex preserves document order, so the matching
    // elements come back in the order they appear in the DOM.
    const labels = screen
      .getAllByText(/^(Pitching|Batting|On Deck|In Hole)$/)
      .map((el) => el.textContent);
    expect(labels).toEqual(['Pitching', 'Batting', 'On Deck', 'In Hole']);
  });

  // Regression test for the "undefined in the sidebar" bug: when the game is
  // in pregame warmup and no pitch has been thrown yet, liveGameMatchup returns
  // empty MatchupDetailsPlayer objects. The component should render the empty
  // shell gracefully without throwing or printing the literal word "undefined".
  it('renders an empty matchup without crashing or showing "undefined"', () => {
    render(<Matchup matchup={emptyMatchup} />);

    // Labels still render.
    expect(screen.getByText('Pitching')).toBeInTheDocument();
    expect(screen.getByText('Batting')).toBeInTheDocument();
    expect(screen.getByText('On Deck')).toBeInTheDocument();
    expect(screen.getByText('In Hole')).toBeInTheDocument();

    // None of the rendered text should be the literal "undefined".
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });
});
