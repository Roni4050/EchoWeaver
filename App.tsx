
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DreamscapeDisplay } from './components/DreamscapeDisplay';
import { DreamInput } from './components/DreamInput';
import { LoadingSpinner } from './components/LoadingSpinner';
import { weaveNarrative, generateDreamImage } from './services/geminiService';
import type { DreamState } from './types';

const App: React.FC = () => {
  const [dreamState, setDreamState] = useState<DreamState>({
    narrative: "",
    imageUrl: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyOk, setApiKeyOk] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  useEffect(() => {
    // Directly use process.env.REACT_APP_API_KEY or process.env.API_KEY based on setup.
    // The prompt implies process.env.API_KEY.
    if (process.env.API_KEY && process.env.API_KEY.trim() !== "") {
      setApiKeyOk(true);
    } else {
      setError("API Key not configured. Please set the API_KEY environment variable.");
      setApiKeyOk(false);
    }
  }, []);

  const handleWeaveFragment = useCallback(async (fragment: string) => {
    if (!apiKeyOk || !fragment.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const narrativeResponse = await weaveNarrative(dreamState.narrative, fragment);
      
      let newFullNarrative: string;
      let imagePromptSegment: string;

      if (!dreamState.narrative) { // Initial fragment
        newFullNarrative = narrativeResponse;
        imagePromptSegment = narrativeResponse; // Use the whole initial narrative for image
      } else { // Subsequent fragment
        newFullNarrative = `${dreamState.narrative}\n\n${narrativeResponse}`;
        imagePromptSegment = narrativeResponse; // Use the newly added part for image
      }
      
      setDreamState(prevState => ({ ...prevState, narrative: newFullNarrative }));
      setShowWelcome(false); // Hide welcome screen after first successful weave

      // Generate image based on the new narrative segment
      try {
        const base64Image = await generateDreamImage(imagePromptSegment);
        setDreamState(prevState => ({ ...prevState, imageUrl: `data:image/png;base64,${base64Image}` }));
      } catch (imgError) {
        console.error("Image generation error:", imgError);
        setError(imgError instanceof Error ? imgError.message : "Image generation failed. The dream's vision flickers.");
        // Keep the old image or set to null if desired
        // setDreamState(prevState => ({ ...prevState, imageUrl: null })); 
      }

    } catch (narrativeError) {
      console.error("Narrative weaving error:", narrativeError);
      setError(narrativeError instanceof Error ? narrativeError.message : "Narrative weaving failed. The dream's thread is lost.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyOk, dreamState.narrative]);


  if (!apiKeyOk && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-pink-950 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center w-full max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-red-300 mb-4">Configuration Error</h2>
          <p className="text-red-400">{error}</p>
          <p className="mt-4 text-sm text-slate-400">This application requires a valid Gemini API key to be configured in the environment variables (API_KEY).</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 text-gray-100 flex flex-col items-center p-4 font-sans">
      <Header />
      <main className="flex-grow flex flex-col items-center w-full max-w-3xl mt-8 mb-16">
        {isLoading && <LoadingSpinner />}
        {error && !isLoading && (
          <div className="my-4 p-4 bg-red-800/50 border border-red-700 text-red-200 rounded-lg shadow-md w-full text-center">
            <p><strong>An Error Occurred:</strong> {error}</p>
          </div>
        )}
        
        {!isLoading && (showWelcome || !dreamState.narrative) && (
           <div className="text-center p-8 bg-slate-800/60 backdrop-blur-md rounded-xl shadow-xl border border-purple-700/50">
             <h2 className="text-3xl font-serif text-purple-300 mb-4">Welcome to EchoWeaver</h2>
             <p className="text-indigo-300 mb-6 text-lg">
               Begin the dream. Cast your first thought into the loom of imagination.
             </p>
             <DreamInput onSubmitFragment={handleWeaveFragment} isLoading={isLoading} placeholder="Whisper your first dream fragment here..." />
           </div>
        )}

        {!showWelcome && dreamState.narrative && (
          <>
            <DreamscapeDisplay narrative={dreamState.narrative} imageUrl={dreamState.imageUrl} />
            <DreamInput onSubmitFragment={handleWeaveFragment} isLoading={isLoading} />
          </>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default App;
