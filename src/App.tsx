import Palette from './palette/Palette';
import Manager from './manager/Manager';

// The palette and manager are the same renderer bundle loaded with a
// different query string (see electron/main.ts) — one Vite build, two
// windows, matching mind-map's quick-capture-window convention.
const isPalette = new URLSearchParams(window.location.search).get('palette') === '1';

export default function App() {
  return isPalette ? <Palette /> : <Manager />;
}
