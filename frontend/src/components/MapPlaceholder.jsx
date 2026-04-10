import React from 'react';
import { MapPin, Navigation, Info } from 'lucide-react';

export function MapPlaceholder() {
    return (
        <div className="w-full h-full bg-[#f8f9fa] border-l border-gray-100 relative overflow-hidden flex flex-col items-center justify-center p-8">
            {/* Simple Grid Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
            </div>

            {/* Abstract Map Elements (Visual Only) */}
            <div className="relative w-full max-w-sm aspect-square bg-white rounded-[40px] shadow-2xl border border-[#D4AF37]/20 p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-700">
                <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-6">
                    <Navigation className="text-[#D4AF37] w-10 h-10 animate-pulse" />
                </div>
                
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Interactive Salon Map</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    Place your map API here to show salon locations near <span className="text-[#D4AF37] font-bold">your area</span>.
                </p>

                <div className="flex gap-2 w-full">
                    <div className="flex-1 bg-gray-50 p-3 rounded-2xl flex items-center gap-2">
                        <MapPin size={16} className="text-[#D4AF37]" />
                        <div className="h-2 w-16 bg-gray-200 rounded-full"></div>
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-6 right-6">
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ready for API</span>
                    </div>
                </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[80%] bg-[#1a1a1a] text-white p-4 rounded-3xl shadow-xl flex items-center gap-4 border border-white/10">
                <div className="bg-[#D4AF37] p-2 rounded-xl text-[#1a1a1a]">
                    <MapPin size={18} />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">Current Discovery</p>
                    <p className="text-sm font-medium leading-none">Viewing Salons in India</p>
                </div>
                <button className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors">
                    <Info size={16} />
                </button>
            </div>
        </div>
    );
}
