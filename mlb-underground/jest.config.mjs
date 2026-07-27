import nextJest from 'next/jest.js';

// next/jest wires up SWC (so TS/JSX + the `@/*` path alias just work), stubs
// CSS/SCSS imports, and loads next.config + .env the same way the app does.
const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  // jsdom by default so component tests get a DOM. Node-only suites (stats,
  // auth, config, mlbAuth, videos) opt out with a `@jest-environment node`
  // docblock at the top of the file.
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/**/*.{ts,tsx}',
    // Exclude things there's nothing meaningful to unit-test in:
    '!**/*.d.ts',
    '!app/layout.tsx', // just composes providers + global CSS imports
    '!app/loading.tsx', // static skeleton
    '!app/**/page.tsx', // thin server wrappers (session gate + redirect)
    '!app/api/**', // route handlers — exercised via lib tests / integration
    '!lib/useInterval.ts', // trivial setInterval wrapper
    // video.js drives a real <video> + media APIs jsdom doesn't implement, so
    // these can't be meaningfully unit-tested; they're covered by manual QA.
    '!app/components/VideoPlayer.tsx',
    '!app/components/Player.tsx',
  ],
  // Everything collected above is fully covered — hold the line so a future
  // change can't silently drop coverage.
  coverageThreshold: {
    global: { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
};

export default createJestConfig(config);
