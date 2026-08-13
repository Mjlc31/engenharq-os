import React from 'react';
import { MapContainer, TileLayer, Marker as LeafletMarker } from 'react-leaflet';
import { MapPin } from 'lucide-react';

interface WorkerMapProps {
  siteName: string;
  latitude: number;
  longitude: number;
}

export function WorkerMap({ siteName, latitude, longitude }: WorkerMapProps) {
  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden relative">
      <div className="p-3 border-b border-border flex items-center gap-2 bg-surface-hover">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-muted uppercase tracking-wider">Local de Alocação: {siteName}</span>
      </div>
      <div className="h-40 w-full bg-surface">
        <MapContainer 
          center={[latitude, longitude]} 
          zoom={15} 
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={false}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <LeafletMarker position={[latitude, longitude]} />
        </MapContainer>
      </div>
    </div>
  );
}
