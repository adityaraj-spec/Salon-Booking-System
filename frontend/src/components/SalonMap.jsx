import React, { useState } from 'react';
import Map, { Marker, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox';
import { MapPin } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export function SalonMap({ salons = [], center = [77.2090, 28.6139], zoom = 12 }) {
    const [viewState, setViewState] = useState({
        longitude: center[0],
        latitude: center[1],
        zoom: zoom
    });

    // If there are salons, adjust center to the first one if available
    React.useEffect(() => {
        if (salons.length > 0 && salons[0].location?.coordinates) {
            setViewState(prev => ({
                ...prev,
                longitude: salons[0].location.coordinates[0],
                latitude: salons[0].location.coordinates[1]
            }));
        }
    }, [salons]);

    return (
        <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-inner border border-gray-100">
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                <FullscreenControl position="top-right" />
                <NavigationControl position="top-right" />

                {salons.map((salon) => (
                    salon.location?.coordinates && (
                        <Marker
                            key={salon._id}
                            longitude={salon.location.coordinates[0]}
                            latitude={salon.location.coordinates[1]}
                            anchor="bottom"
                        >
                            <div className="cursor-pointer group">
                                <MapPin 
                                    className="text-red-600 fill-white group-hover:scale-125 transition-transform" 
                                    size={32} 
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white px-3 py-1 rounded-full shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-semibold text-gray-800">
                                    {salon.name}
                                </div>
                            </div>
                        </Marker>
                    )
                ))}
            </Map>
        </div>
    );
}
