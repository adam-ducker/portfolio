/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { getConfig, TMP_DIR } from './config';

describe('getConfig', () => {
  const sample = {
    users: [{ id: '1', username: 'adam', password: 'hashed' }],
    mlb_username: 'mlbuser',
    mlb_password: 'mlbpass',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads and parses config.json from the project root (cwd)', () => {
    const readSpy = jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(JSON.stringify(sample));

    const config = getConfig();

    expect(config).toEqual(sample);
    // Reads from <cwd>/config.json specifically.
    expect(readSpy).toHaveBeenCalledWith(
      path.join(process.cwd(), 'config.json'),
      'utf8'
    );
  });

  it('propagates a parse error for malformed JSON', () => {
    jest.spyOn(fs, 'readFileSync').mockReturnValue('{ not valid json');
    expect(() => getConfig()).toThrow();
  });

  it('propagates a read error when config.json is missing', () => {
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(() => getConfig()).toThrow('ENOENT');
  });

  it('exposes the fixed runtime cache dir as TMP_DIR', () => {
    expect(TMP_DIR).toBe('tmp');
  });

});
