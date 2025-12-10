import React, { useEffect, useRef } from 'react';
import { User, Friend } from '../types';

// Declare L globalmente já que estamos usando via CDN
declare const L: any;

interface MapViewProps {
  currentUser: User | null;
  friends: Friend[];
}

export const MapView: React.FC<MapViewProps> = ({ currentUser, friends }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  // Inicializar o mapa
  useEffect(() => {
    if (!mapContainerRef.current || !currentUser?.location) return;

    if (!mapInstanceRef.current) {
      const { latitude, longitude } = currentUser.location;
      
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([latitude, longitude], 15);

      // Usando tiles do CartoDB Dark Matter para o tema escuro
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd',
      }).addTo(map);

      mapInstanceRef.current = map;
    }
  }, [currentUser]); // Inicializa apenas quando temos a localização inicial

  // Atualizar marcadores
  useEffect(() => {
    if (!mapInstanceRef.current || !currentUser?.location) return;

    const map = mapInstanceRef.current;
    const allEntities = [currentUser, ...friends];
    const currentIds = new Set(allEntities.map(e => e.id));

    // Remover marcadores antigos
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    // Atualizar ou criar marcadores
    allEntities.forEach(entity => {
      if (!entity.location) return;

      const { latitude, longitude } = entity.location;
      const isSelf = entity.id === currentUser.id;
      const borderColor = isSelf ? '#3b82f6' : '#22c55e'; // Azul para eu, Verde para amigos

      // Criar ícone HTML personalizado com a foto
      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="
            width: 40px; 
            height: 40px; 
            border-radius: 50%; 
            border: 3px solid ${borderColor}; 
            box-shadow: 0 0 15px ${borderColor};
            overflow: hidden; 
            background: #000;
            position: relative;
          ">
            <img src="${entity.avatar}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          <div style="
            position: absolute;
            bottom: -20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            white-space: nowrap;
            font-weight: bold;
          ">${isSelf ? 'VOCÊ' : entity.name}</div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      if (markersRef.current[entity.id]) {
        // Mover marcador existente suavemente
        const marker = markersRef.current[entity.id];
        const oldLatLng = marker.getLatLng();
        
        // Simples interpolação se a distância for pequena, ou setLatLng direto
        marker.setLatLng([latitude, longitude]);
        marker.setIcon(customIcon); // Atualiza caso avatar mude
      } else {
        // Criar novo marcador
        const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
        
        // Adicionar popup
        if (!isSelf) {
            const friend = entity as Friend;
            marker.bindPopup(`
                <div class="font-sans">
                    <strong>${friend.name}</strong><br/>
                    <span class="text-xs opacity-75">${friend.statusMessage || "Sem status"}</span>
                </div>
            `);
        }
        
        markersRef.current[entity.id] = marker;
      }
    });

    // Opcional: Centralizar no usuário se ele se mover muito longe? 
    // Por enquanto deixamos o usuário controlar o zoom/pan, 
    // mas na inicialização já centralizamos.

  }, [currentUser, friends]);

  return (
    <div className="w-full h-full relative">
       <div ref={mapContainerRef} className="w-full h-full z-0" />
       
       {/* Botão de recentralizar */}
       <button 
         onClick={() => {
            if(currentUser?.location && mapInstanceRef.current) {
                mapInstanceRef.current.setView([currentUser.location.latitude, currentUser.location.longitude], 16);
            }
         }}
         className="absolute bottom-6 right-6 z-[400] bg-gray-800 text-white p-3 rounded-full shadow-lg border border-gray-600 hover:bg-gray-700 transition-colors"
         title="Centralizar em mim"
       >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>
       </button>
    </div>
  );
};