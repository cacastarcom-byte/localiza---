import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Friend, Coordinates, AppState } from './types';
import { getAIStatusUpdate } from './services/geminiService';
import { Button } from './components/Button';
import { RadarView } from './components/RadarView';
import { MapView } from './components/MapView';

// --- Helper for Mock Data ---
const generateRandomCoordinates = (base: Coordinates): Coordinates => {
  return {
    latitude: base.latitude + (Math.random() - 0.5) * 0.005,
    longitude: base.longitude + (Math.random() - 0.5) * 0.005,
    accuracy: 10,
    heading: Math.random() * 360,
    speed: Math.random() * 60, // 0 to 60 m/s
  };
};

const MOCK_AVATARS = [
  "https://picsum.photos/100/100?random=1",
  "https://picsum.photos/100/100?random=2",
  "https://picsum.photos/100/100?random=3",
];

type ViewMode = 'RADAR' | 'MAP';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.AUTH);
  const [username, setUsername] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('RADAR');
  const pendingTrackIdRef = useRef<string | null>(null); // Armazena ID da URL

  // --- Check URL for invites on mount ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    if (trackId) {
      pendingTrackIdRef.current = trackId;
    }
  }, []);

  // --- Geolocation Logic ---
  const updateLocation = useCallback((position: GeolocationPosition) => {
    const coords: Coordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    };

    setCurrentUser(prev => prev ? { ...prev, location: coords, lastUpdated: new Date() } : null);
  }, []);

  useEffect(() => {
    if (appState === AppState.DASHBOARD && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        updateLocation,
        (err) => console.error("Geo Error", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [appState, updateLocation]);

  // --- Friend Simulation Logic ---
  // Simulate friends moving relative to user
  useEffect(() => {
    if (appState !== AppState.DASHBOARD || !currentUser?.location) return;

    // Se houver um ID pendente da URL e já tivermos localização, adicione-o
    if (pendingTrackIdRef.current && currentUser.location) {
        const idToAdd = pendingTrackIdRef.current;
        // Verifica se já não está na lista (evitar duplicação)
        if (!friends.find(f => f.id === idToAdd) && idToAdd !== currentUser.id) {
             const newFriend: Friend = {
              id: idToAdd,
              name: `Convidado ${idToAdd.substring(0, 4)}`,
              avatar: MOCK_AVATARS[Math.floor(Math.random() * MOCK_AVATARS.length)],
              location: generateRandomCoordinates(currentUser.location),
              lastUpdated: new Date(),
              isSelf: false,
              isTracking: true,
              statusMessage: "Conectado via Link Convite."
            };
            setFriends(prev => [...prev, newFriend]);
        }
        pendingTrackIdRef.current = null; // Limpar
    }

    const interval = setInterval(() => {
      setFriends(currentFriends => 
        currentFriends.map(f => {
          if (!f.location && currentUser.location) {
             // Initialize near user
             return { ...f, location: generateRandomCoordinates(currentUser.location) };
          } else if (f.location) {
             // Move slightly
             return { 
                ...f, 
                location: generateRandomCoordinates(f.location) 
             };
          }
          return f;
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [appState, currentUser?.location, friends]); // Incluído friends na dependência para checar duplicação corretamente


  // --- Actions ---

  const handleLogin = () => {
    if (!username.trim()) return;
    const id = `USR-${Math.floor(Math.random() * 10000)}`;
    const user: User = {
      id,
      name: username,
      avatar: `https://ui-avatars.com/api/?name=${username}&background=random`,
      location: null,
      lastUpdated: new Date(),
      isSelf: true
    };
    setCurrentUser(user);
    setAppState(AppState.DASHBOARD);
  };

  const handleAddFriend = () => {
    // Simulating adding a friend by ID
    // In a real app, this would query a DB
    if (!addFriendInput) return;
    
    const newFriend: Friend = {
      id: addFriendInput, // Using the input as ID for demo
      name: `Amigo ${addFriendInput.substring(0, 4)}`, // Mock name translated
      avatar: MOCK_AVATARS[friends.length % MOCK_AVATARS.length],
      location: currentUser?.location ? generateRandomCoordinates(currentUser.location) : null, // Spawn near user
      lastUpdated: new Date(),
      isSelf: false,
      isTracking: true,
      statusMessage: "Conectado. Aguardando sinal..."
    };

    setFriends([...friends, newFriend]);
    setAddFriendInput('');
  };

  const handleRequestAIStatus = async (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;

    setLoadingAI(friendId);
    const message = await getAIStatusUpdate(friend);
    
    setFriends(prev => prev.map(f => 
      f.id === friendId ? { ...f, statusMessage: message } : f
    ));
    setLoadingAI(null);
  };

  const handleShareProfile = async () => {
    if (!currentUser) return;
    
    const url = new URL(window.location.href);
    url.searchParams.set('track', currentUser.id);
    const shareText = `Rastreie minha localização no GeoLink AI! Meu ID: ${currentUser.id}`;
    const shareUrl = url.toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'GeoLink AI',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      // Fallback para clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('Link copiado para a área de transferência!');
      } catch (err) {
        alert('Não foi possível copiar o link.');
      }
    }
  };

  // --- Render Views ---

  if (appState === AppState.AUTH) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]"></div>

        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 relative z-10">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">GeoLink AI</h1>
            <p className="text-gray-400">Entre na rede de conexão segura.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome de usuário</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu codinome"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            
            {/* Show info if invited */}
            {pendingTrackIdRef.current && (
                <div className="bg-blue-900/30 border border-blue-500/50 p-3 rounded-lg text-sm text-blue-200 text-center">
                    Você foi convidado para rastrear o alvo <strong>{pendingTrackIdRef.current}</strong>
                </div>
            )}

            <Button 
              className="w-full py-3 text-lg" 
              onClick={handleLogin}
              disabled={!username}
            >
              Iniciar Conexão
            </Button>
            <p className="text-xs text-center text-gray-500 mt-4">
              Ao entrar, você concorda com o processamento de telemetria de localização em tempo real.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center z-20">
         <h1 className="font-bold text-lg flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            GeoLink
         </h1>
         <div className="flex items-center gap-2">
             <button onClick={handleShareProfile} className="p-2 bg-gray-700 rounded-full text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
             </button>
             <div className="text-xs text-gray-400 font-mono">{currentUser?.id}</div>
         </div>
      </div>

      {/* Main Map Area (Radar OR Map) */}
      <div className="flex-1 relative flex flex-col bg-black/50 overflow-hidden">
         
         {/* Toggle View Buttons */}
         <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gray-800/90 rounded-full p-1 border border-gray-600 flex shadow-xl">
            <button 
              onClick={() => setViewMode('RADAR')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'RADAR' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              RADAR
            </button>
            <button 
              onClick={() => setViewMode('MAP')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === 'MAP' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              MAPA
            </button>
         </div>

         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-10"></div>
         
         {viewMode === 'RADAR' ? (
           <div className="flex-1 flex items-center justify-center p-6 relative">
               <RadarView currentUser={currentUser} friends={friends} />
               
               {/* Stats Overlay (Radar Only) */}
               <div className="absolute top-6 left-6 font-mono text-xs text-green-500/80 space-y-1 hidden md:block z-20">
                  <p>LAT: {currentUser?.location?.latitude.toFixed(4) || "AGUARDANDO..."}</p>
                  <p>LNG: {currentUser?.location?.longitude.toFixed(4) || "AGUARDANDO..."}</p>
                  <p>VEL: {currentUser?.location?.speed ? (currentUser.location.speed * 3.6).toFixed(1) + " KM/H" : "0 KM/H"}</p>
               </div>
           </div>
         ) : (
           <div className="flex-1 w-full h-full relative z-0">
               <MapView currentUser={currentUser} friends={friends} />
           </div>
         )}
      </div>

      {/* Sidebar / Control Panel */}
      <div className="w-full md:w-96 bg-gray-800 border-t md:border-t-0 md:border-l border-gray-700 flex flex-col z-20 shadow-2xl">
        
        {/* User Profile */}
        <div className="p-6 bg-gray-800 border-b border-gray-700">
           <div className="flex items-center gap-4 mb-4">
              <img src={currentUser?.avatar} alt="Me" className="w-12 h-12 rounded-full border-2 border-blue-500" />
              <div className="flex-1 min-w-0">
                 <h2 className="font-bold text-lg truncate">{currentUser?.name}</h2>
                 <p className="text-xs text-blue-400 font-mono tracking-wider">{currentUser?.id}</p>
              </div>
           </div>
           
           <Button variant="primary" className="w-full text-xs py-2" onClick={handleShareProfile}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              Compartilhar Localização
           </Button>
        </div>

        {/* Friend List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Alvos Ativos ({friends.length})</h3>
           
           {friends.length === 0 && (
             <div className="text-center py-10 text-gray-600 border-2 border-dashed border-gray-700 rounded-xl">
                <p>Nenhuma conexão estabelecida.</p>
                <p className="text-sm">Envie seu link para conectar.</p>
             </div>
           )}

           {friends.map(friend => (
             <div key={friend.id} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors">
                <div className="flex justify-between items-start mb-3">
                   <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-gray-700"></div>
                      </div>
                      <div>
                         <h4 className="font-bold text-sm">{friend.name}</h4>
                         <p className="text-[10px] text-gray-400 font-mono">ID: {friend.id}</p>
                      </div>
                   </div>
                   <div className="text-right">
                       <span className="text-xs font-mono text-green-400 block">
                          {friend.location ? `${(friend.location.speed || 0 * 3.6).toFixed(0)} km/h` : 'OFFLINE'}
                       </span>
                   </div>
                </div>
                
                <div className="bg-black/30 rounded p-3 mb-3 border border-gray-600/50">
                   <p className="text-xs text-gray-300 italic">
                     "{friend.statusMessage}"
                   </p>
                </div>

                <div className="flex gap-2">
                   <Button 
                      variant="secondary" 
                      className="flex-1 text-xs py-1"
                      onClick={() => handleRequestAIStatus(friend.id)}
                      isLoading={loadingAI === friend.id}
                   >
                     Análise IA
                   </Button>
                </div>
             </div>
           ))}
        </div>

        {/* Add Friend Input */}
        <div className="p-4 bg-gray-900 border-t border-gray-700">
           <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Digite o ID do amigo..." 
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 text-sm focus:outline-none focus:border-blue-500"
                value={addFriendInput}
                onChange={(e) => setAddFriendInput(e.target.value)}
              />
              <Button onClick={handleAddFriend} disabled={!addFriendInput}>
                 Rastrear
              </Button>
           </div>
        </div>
      </div>

    </div>
  );
};

export default App;