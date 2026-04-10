import React from 'react';
import { Map } from 'lucide-react';

export function MapPlaceholder() {
    return (
        <div 
            id="map-canvas-container"
            className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200"
        >
            <div className="flex flex-col items-center text-center max-w-xs">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-gray-100">
                    <Map className="text-gray-300 w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Map API Container</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                    This is the designated space for your map. Add your <span className="text-[#D4AF37]">Google Maps</span> or <span className="text-[#D4AF37]">Mapbox</span> script to this container.
                </p>
                <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Ready for integration</span>
                </div>
            </div>
            
            {/* The actual placeholder div you can target with your API */}
            <div id="google-map-render" className="hidden"></div>
        </div>
    );
}
