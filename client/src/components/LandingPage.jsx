import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Create a custom neon green glowing dot icon
const createGlowingDot = (size, opacity, animationDelay) => {
  return L.divIcon({
    className: 'custom-neon-dot',
    html: `<div style="
      width: ${size}px; 
      height: ${size}px; 
      background-color: #2ecc71; 
      border-radius: 50%; 
      opacity: ${opacity};
      box-shadow: 0 0 ${size * 2}px #2ecc71, 0 0 ${size}px #2ecc71;
      animation: pulse-green 1s infinite alternate;
      animation-delay: ${animationDelay}s;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

function LandingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('saferoute-user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const payload = isLoginMode ? { email: formData.email, password: formData.password } : formData;
    
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      localStorage.setItem('saferoute-user', JSON.stringify(data));
      setUser(data);
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate random glowing dots over a city area (e.g. NYC)
  const mapCenter = [40.758, -73.985];
  const dots = useMemo(() => {
    const generatedDots = [];
    for (let i = 0; i < 100; i++) {
      // Clustered towards center
      const lat = mapCenter[0] + (Math.random() - 0.5) * 0.1 * (Math.random() > 0.5 ? 0.2 : 1);
      const lng = mapCenter[1] + (Math.random() - 0.5) * 0.1 * (Math.random() > 0.5 ? 0.2 : 1);
      const size = Math.random() > 0.8 ? (Math.random() * 8 + 6) : (Math.random() * 4 + 2);
      const opacity = Math.random() * 0.6 + 0.4;
      const delay = Math.random() * 1;
      generatedDots.push({ lat, lng, size, opacity, delay });
    }
    return generatedDots;
  }, []);

  useEffect(() => {
    // Inject animation CSS for the glowing dots
    if (!document.getElementById('neon-pulse')) {
      const style = document.createElement('style');
      style.id = 'neon-pulse';
      style.innerHTML = `
        @keyframes pulse-green {
          0% { transform: scale(0.7); opacity: 0.6; box-shadow: 0 0 5px #2ecc71; }
          100% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 25px #2ecc71, 0 0 15px #2ecc71; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="min-h-screen bg-dribbbleBg text-gray-300 font-sans overflow-hidden flex flex-col relative">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-8 z-50 flex justify-between items-center max-w-7xl mx-auto right-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center text-neonGreen drop-shadow-[0_0_8px_rgba(46,204,113,0.8)]">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-10 h-10">
              <defs>
                <mask id="map-cutout">
                  <rect x="0" y="0" width="100" height="100" fill="white" />
                  <path d="M10 70 Q 30 75 50 65 T 90 60" fill="none" stroke="black" strokeWidth="4" />
                  <path d="M50 15 C38.95 15 30 23.95 30 35 C30 50 46.5 68 48.5 70.3 C49.3 71.2 50.7 71.2 51.5 70.3 C53.5 68 70 50 70 35 C70 23.95 61.05 15 50 15 Z" fill="black" stroke="black" strokeWidth="3" strokeLinejoin="round" />
                </mask>
              </defs>
              <polygon points="26,55 48,55 48,85 15,85" mask="url(#map-cutout)" />
              <polygon points="52,55 74,55 85,85 52,85" mask="url(#map-cutout)" />
              <path d="M50 15 C38.95 15 30 23.95 30 35 C30 50 46.5 68 48.5 70.3 C49.3 71.2 50.7 71.2 51.5 70.3 C53.5 68 70 50 70 35 C70 23.95 61.05 15 50 15 Z M50 45 C44.48 45 40 40.52 40 35 C40 29.48 44.48 25 50 25 C55.52 25 60 29.48 60 35 C60 40.52 55.52 45 50 45 Z" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">SafeRoute</span>
        </div>
        
        <nav className="flex gap-8 text-xs font-bold tracking-wider">
          <button onClick={() => navigate('/app')} className="hover:text-neonGreen transition-colors text-white">OPEN APP</button>
        </nav>
      </header>

      {/* Main Split Layout */}
      <main className="flex-grow flex w-full relative z-10">
        
        {/* Left Content Area */}
        <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 xl:px-32 relative z-20 pointer-events-none">
          {/* Faded Background Text */}
          <div className="absolute left-4 md:left-8 top-1/2 -translate-y-[80%] text-7xl md:text-9xl font-black text-white/[0.03] select-none uppercase tracking-tighter">
            SAFEROUTE
          </div>
          
          <div className="relative pointer-events-auto mt-16">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight leading-tight">
              Navigate the City <br/>
              <span className="text-neonGreen">Without Compromise</span>
            </h1>
            
            <p className="text-gray-400 text-base leading-relaxed max-w-md mb-8">
              SafeRoute analyzes real-time community reports and crime stats to find you the optimal path balancing speed and security.
            </p>
            
            <div className="bg-[#1a1f35]/90 backdrop-blur border border-gray-800 p-6 rounded-lg max-w-md shadow-2xl">
              {user ? (
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user.name}!</h2>
                  <p className="text-gray-400 mb-6">Your emergency contacts are loaded and ready.</p>
                  <button 
                    onClick={() => navigate('/app')}
                    className="w-full bg-neonGreen hover:bg-green-500 text-white font-bold py-3 px-4 rounded transition-all shadow-[0_0_15px_rgba(46,204,113,0.4)]"
                  >
                    ENTER APP
                  </button>
                  <button onClick={() => { localStorage.removeItem('saferoute-user'); setUser(null); }} className="mt-4 text-xs text-gray-500 hover:text-white transition-colors">
                    Sign Out
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="flex flex-col gap-4">
                  <h2 className="text-xl font-bold text-white mb-2">
                    {isLoginMode ? 'Sign in to access SOS' : 'Register to set Emergency Contacts'}
                  </h2>
                  
                  {error && <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>}
                  
                  {!isLoginMode && (
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="bg-[#0f1424] border border-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:border-neonGreen"
                      required
                    />
                  )}
                  
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="bg-[#0f1424] border border-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:border-neonGreen"
                    required
                  />
                  
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="bg-[#0f1424] border border-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:border-neonGreen"
                    required
                  />
                  
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-neonGreen hover:bg-green-500 text-white font-bold py-3 px-4 rounded mt-2 transition-all shadow-[0_0_10px_rgba(46,204,113,0.2)] disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : (isLoginMode ? 'LOGIN' : 'REGISTER')}
                  </button>
                  
                  <div className="text-center text-sm text-gray-400 mt-2">
                    {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                    <span 
                      className="text-neonGreen cursor-pointer hover:underline"
                      onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
                    >
                      {isLoginMode ? 'Register here' : 'Login here'}
                    </span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Map Area */}
        <div className="absolute top-0 right-0 w-full md:w-[65%] h-full z-0 opacity-80 md:opacity-100">
          {/* Dark gradient overlay to fade map into background on the left */}
          <div className="absolute top-0 left-0 w-full md:w-1/3 h-full bg-gradient-to-r from-dribbbleBg to-transparent z-10 pointer-events-none"></div>
          
          {/* Top/Bottom vignette */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-dribbbleBg to-transparent z-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-dribbbleBg to-transparent z-10 pointer-events-none"></div>

          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            className="w-full h-full hide-attribution"
            style={{ background: '#2b2e38' }}
          >
            {/* Dark matter styled map tiles from Carto */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              opacity={0.6}
            />
            
            {/* Render Glowing Dots */}
            {dots.map((dot, idx) => (
              <Marker 
                key={idx} 
                position={[dot.lat, dot.lng]} 
                icon={createGlowingDot(dot.size, dot.opacity, dot.delay)} 
              />
            ))}
          </MapContainer>
        </div>

      </main>
    </div>
  );
}

export default LandingPage;
