import { useState } from 'react';
import StartScreen from './components/StartScreen';
import ScannerView from './components/ScannerView';

export default function App() {
  const [started, setStarted] = useState(false);
  const [profileContent, setProfileContent] = useState<string | null>(null);

  if (!started) {
    return <StartScreen onStart={(profile) => { setProfileContent(profile); setStarted(true); }} />;
  }

  return <ScannerView onBack={() => setStarted(false)} profileContent={profileContent} />;
}
