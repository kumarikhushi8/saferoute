import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f1424] text-white font-sans overflow-hidden relative flex flex-col">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accentPurple/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accentYellow/10 blur-[100px] rounded-full pointer-events-none"></div>

      <header className="p-6 relative z-10 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accentPurple flex items-center justify-center font-black text-xl shadow-lg shadow-accentPurple/30">
            S
          </div>
          <span className="text-2xl font-bold tracking-tight">SafeRoute</span>
        </div>
        <button 
          onClick={() => navigate('/app')}
          className="text-gray-300 hover:text-white font-medium transition-colors"
        >
          Open App
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 relative z-10">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            Navigate the City <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accentPurple to-accentYellow">
              Without Compromise
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            SafeRoute analyzes real-time community reports, lighting data, and historical crime stats to find you the optimal path balancing speed and security.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/app')}
              className="bg-accentPurple hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg shadow-accentPurple/30 transition-all hover:scale-105"
            >
              Get Started for Free
            </button>
            <a 
              href="https://github.com/flourishingflaws06/saferoute" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-8 rounded-full text-lg border border-white/10 transition-all backdrop-blur"
            >
              Learn More
            </a>
          </div>

          <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left opacity-80">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur">
              <div className="text-2xl mb-2">🛡️</div>
              <h3 className="font-bold mb-2">Dynamic Safety Scoring</h3>
              <p className="text-sm text-gray-400">Routes are evaluated dynamically based on multi-layered risk metrics.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur">
              <div className="text-2xl mb-2">🤝</div>
              <h3 className="font-bold mb-2">Community Driven</h3>
              <p className="text-sm text-gray-400">Real-time alerts and flagging from fellow users keep you aware of immediate dangers.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur">
              <div className="text-2xl mb-2">📡</div>
              <h3 className="font-bold mb-2">Trusted Contacts</h3>
              <p className="text-sm text-gray-400">Share your live routing with a single tap to keep loved ones in the loop.</p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-6 text-center text-gray-600 text-sm relative z-10">
        &copy; {new Date().getFullYear()} SafeRoute MVP. All rights reserved.
      </footer>
    </div>
  );
}

export default LandingPage;
