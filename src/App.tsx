import { useState } from 'react';
import StartScreen from './components/StartScreen';
import ScannerView from './components/ScannerView';

export default function App() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <StartScreen onStart={() => setStarted(true)} />;
  }

  return <ScannerView />;
}
