import React from 'react';
import { Friend, User } from '../types';

interface RadarViewProps {
  currentUser: User | null;
  friends: Friend[];
}

export const RadarView: React.FC<RadarViewProps> = ({ currentUser, friends }) => {
  // Helper to map lat/long diff to x/y percentage on radar
  // This is a pseudo-projection for visual effect
  const calculatePosition = (friend: Friend) => {
    if (!currentUser?.location || !friend.location) return { x: 50, y: 50 };

    // Scale factor (higher = zoomed out)
    const scale = 0.01; 
    
    const latDiff = friend.location.latitude - currentUser.location.latitude;
    const lngDiff = friend.location.longitude - currentUser.location.longitude;

    // Normalize to percentage (50% is center)
    // Invert Lat because screen Y is top-down
    let x = 50 + (lngDiff / scale) * 50;
    let y = 50 - (latDiff / scale) * 50;

    // Clamp to circle
    const dx = x - 50;
    const dy = y - 50;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 45) {
        const angle = Math.atan2(dy, dx);
        x = 50 + Math.cos(angle) * 45;
        y = 50 + Math.sin(angle) * 45;
    }

    return { x, y };
  };

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto bg-slate-900 rounded-full border-4 border-slate-700 shadow-[0_0_50px_rgba(59,130,246,0.2)] overflow-hidden">
        {/* Grid Lines */}
        <div className="absolute inset-0 opacity-20">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-500"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-green-500"></div>
            <div className="absolute inset-[15%] rounded-full border border-green-500/50"></div>
            <div className="absolute inset-[35%] rounded-full border border-green-500/50"></div>
        </div>

        {/* Rotating Scanner */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent animate-radar-spin origin-center pointer-events-none z-0" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0)'}}></div>
        <div className="absolute inset-0 border-r border-green-500/30 animate-radar-spin rounded-full z-0"></div>

        {/* Current User (Center) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6] animate-pulse"></div>
        </div>

        {/* Friends */}
        {friends.map((friend) => {
            const pos = calculatePosition(friend);
            return (
                <div 
                    key={friend.id}
                    className="absolute z-10 flex flex-col items-center group transition-all duration-1000 ease-linear"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                    <div className="relative">
                         <img 
                            src={friend.avatar} 
                            alt={friend.name}
                            className="w-8 h-8 rounded-full border-2 border-green-500 shadow-[0_0_10px_#22c55e]"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-black"></div>
                    </div>
                    <span className="mt-1 text-[10px] font-bold text-green-400 bg-black/50 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {friend.name}
                    </span>
                </div>
            );
        })}
        
        {/* Decor */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-green-500/50 font-mono pointer-events-none">
            ESCANEANDO...
        </div>
    </div>
  );
};