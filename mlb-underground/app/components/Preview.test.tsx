import { render, screen } from '@testing-library/react';
import Preview from './Preview';
import { PreviewDetails } from '@/lib/types';

const samplePreview: PreviewDetails = {
  title: 'Dodger Stadium - Los Angeles, CA',
  description: 'First pitch is scheduled for 7:10 PM.',
  home: 'The Dodgers have a record of 30-15. The starting pitcher is Clayton Kershaw.',
  homeId: '477132',
  away: 'The White Sox have a record of 18-27. The starting pitcher is Garrett Crochet.',
  awayId: '676979',
};

const previewWithoutPitchers: PreviewDetails = {
  title: 'Dodger Stadium - Los Angeles, CA',
  description: 'First pitch is scheduled for 7:10 PM.',
  home: 'The Dodgers have a record of 30-15. No starting pitcher has been announced yet.',
  homeId: '',
  away: 'The White Sox have a record of 18-27. No starting pitcher has been announced yet.',
  awayId: '',
};

describe('<Preview />', () => {
  it('renders the venue title in an h3', () => {
    render(<Preview preview={samplePreview} />);
    expect(
      screen.getByRole('heading', { level: 3, name: samplePreview.title })
    ).toBeInTheDocument();
  });

  it('renders the first-pitch description', () => {
    render(<Preview preview={samplePreview} />);
    expect(screen.getByText(samplePreview.description)).toBeInTheDocument();
  });

  it('renders the home and away team blurbs', () => {
    render(<Preview preview={samplePreview} />);
    expect(screen.getByText(samplePreview.home)).toBeInTheDocument();
    expect(screen.getByText(samplePreview.away)).toBeInTheDocument();
  });

  it('uses homeId and awayId in the headshot background images', () => {
    render(<Preview preview={samplePreview} />);
    const images = screen.getAllByTestId('preview-headshot');
    expect(images).toHaveLength(2);

    // The first headshot is the home block, the second is away — the
    // component renders them in that order.
    const [homeImage, awayImage] = images;
    expect(homeImage).toHaveStyle({
      backgroundImage: expect.stringContaining(
        `/60x60/${samplePreview.homeId}@2x.png`
      ),
    });
    expect(awayImage).toHaveStyle({
      backgroundImage: expect.stringContaining(
        `/60x60/${samplePreview.awayId}@2x.png`
      ),
    });
  });

  it('degrades gracefully when no probable pitcher is set', () => {
    render(<Preview preview={previewWithoutPitchers} />);
    // Both team blurbs still render — no crash and no "undefined" anywhere.
    expect(screen.getByText(previewWithoutPitchers.home)).toBeInTheDocument();
    expect(screen.getByText(previewWithoutPitchers.away)).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });
});
