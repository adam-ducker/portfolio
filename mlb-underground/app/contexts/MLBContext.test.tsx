import { render, screen, act, waitFor } from '@testing-library/react';
import { MLBContextProvider, useMLBContext } from './MLBContext';

// A tiny consumer that surfaces the context values as text for assertions.
const Consumer = () => {
  const { title, status } = useMLBContext();
  return <div data-testid="ctx">{`${status}|${title}`}</div>;
};

const readCtx = () => screen.getByTestId('ctx').textContent;

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('MLBContextProvider', () => {
  it('does not call the refresh route when inactive', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <MLBContextProvider active={false}>
        <Consumer />
      </MLBContextProvider>
    );

    expect(fetchMock).not.toHaveBeenCalled();
    // Initial state: status 'normal', empty title.
    expect(readCtx()).toBe('normal|');
  });

  it('pings /api/mlb/refresh on mount and exposes the returned title/status', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ json: async () => ({ title: 'Signed in as mlbuser', status: 'normal' }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <MLBContextProvider active>
        <Consumer />
      </MLBContextProvider>
    );

    await waitFor(() => expect(readCtx()).toBe('normal|Signed in as mlbuser'));
    expect(fetchMock).toHaveBeenCalledWith('/api/mlb/refresh', { method: 'POST' });
  });

  it('falls back to error status when the response has no status field', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({}) }) as unknown as typeof fetch;

    render(
      <MLBContextProvider active>
        <Consumer />
      </MLBContextProvider>
    );

    await waitFor(() => expect(readCtx()).toBe('error|'));
  });

  it('sets error status when the refresh request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    render(
      <MLBContextProvider active>
        <Consumer />
      </MLBContextProvider>
    );

    await waitFor(() => expect(readCtx()).toBe('error|'));
  });

  it('re-checks on the 5-minute interval', async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ json: async () => ({ title: 't', status: 'normal' }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <MLBContextProvider active>
        <Consumer />
      </MLBContextProvider>
    );

    // Mount fetch.
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance 5 minutes -> one more refresh.
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
