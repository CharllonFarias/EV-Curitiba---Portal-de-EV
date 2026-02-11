import { AspectRatio } from './types';

export const EXPIRATION_OPTIONS = [
  { label: '1 Day', value: 24 * 60 * 60 * 1000 },
  { label: '2 Days', value: 2 * 24 * 60 * 60 * 1000 },
  { label: '3 Days', value: 3 * 24 * 60 * 60 * 1000 },
  { label: '1 Week', value: 7 * 24 * 60 * 60 * 1000 },
];

export const ASPECT_RATIOS: AspectRatio[] = [
  AspectRatio.Square,
  AspectRatio.Portrait23,
  AspectRatio.Landscape32,
  AspectRatio.Portrait34,
  AspectRatio.Landscape43,
  AspectRatio.Portrait916,
  AspectRatio.Landscape169,
  AspectRatio.Ultrawide219
];

export const MOCK_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; padding: 2rem; background: #f0fdf4; color: #14532d; }
  .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
  h1 { color: #166534; }
</style>
</head>
<body>
  <div class="card">
    <h1>Welcome, Client!</h1>
    <p>This is your personalized secure portal.</p>
    <p>Feel free to review the attached documents.</p>
  </div>
</body>
</html>`;
