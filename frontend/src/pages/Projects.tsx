import { useState } from 'react';
import {
    Droplets,
    Wind,
    ArrowUpRight,
    ExternalLink,
    PlayCircle,
    Activity,
    ShieldCheck,
    Box,
    Globe
} from 'lucide-react';

export const Projects = () => {
    const [activeCategory, setActiveCategory] = useState('Water & Irrigation');

    const categories = [
        'Water & Irrigation',
        'Infrastructure',
        'Energy',
        'Urban Planning'
    ];

    const waterProjects = [
        {
            title: 'Nambul River Conservation',
            location: 'Manipur, India',
            description: 'A comprehensive river rejuvenation and landscape development project focusing on pollution control and urban waterfront transformation.',
            videoSrc: '/videos/nambul-river.mp4',
            status: 'Ongoing',
            efficiency: '94%'
        },
        {
            title: 'Smart Irrigation Network',
            location: 'Regional Agriculture Zone',
            description: 'Implementing automated sensor-based irrigation systems for sustainable water management and crop optimization.',
            videoSrc: null,
            status: 'Completed',
            efficiency: '88%'
        }
    ];

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        Strategic Projects
                    </h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Global Portfolio & Resource Management</p>
                </div>
                <div className="flex items-center bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Project Display */}
            {activeCategory === 'Water & Irrigation' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {waterProjects.map((project, idx) => (
                        <div key={idx} className="app-card overflow-hidden group">
                            {/* Visual Asset Container */}
                            <div className="aspect-video bg-gray-900 relative flex items-center justify-center overflow-hidden">
                                {project.videoSrc ? (
                                    <video
                                        controls
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                        src={project.videoSrc}
                                        poster="/logo.png"
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                ) : (
                                    <div className="flex flex-col items-center text-center p-10">
                                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                                            <Droplets className="w-8 h-8" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Media Asset Pending</p>
                                    </div>
                                )}

                                <div className="absolute top-6 left-6 flex gap-2">
                                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest border border-white/20">
                                        Project ID: WP-00{idx + 1}
                                    </span>
                                </div>
                            </div>

                            {/* Content Branding */}
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{project.status}</span>
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{project.title}</h3>
                                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase flex items-center gap-2">
                                            <Globe className="w-3 h-3" /> {project.location}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resource Score</p>
                                        <p className="text-xl font-black text-blue-600 tracking-tighter">{project.efficiency}</p>
                                    </div>
                                </div>

                                <p className="text-sm font-bold text-gray-600 leading-relaxed border-l-2 border-blue-500/20 pl-4 py-2 bg-gray-50/50 rounded-r-2xl">
                                    {project.description}
                                </p>

                                <div className="grid grid-cols-3 gap-4 pt-4">
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Impact</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-sm font-black text-gray-800">High</span>
                                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Compliance</p>
                                        <div className="flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3 text-blue-500" />
                                            <span className="text-sm font-black text-gray-800">ISO</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center flex items-center justify-center group/btn cursor-pointer hover:bg-black hover:text-white transition-all">
                                        <ExternalLink className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="app-card p-24 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-[32px] mx-auto mb-6 flex items-center justify-center text-gray-300">
                        <Box className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-gray-800 tracking-tight">Portfolio Under Synchronization</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Connecting to Global Project Ledger...</p>
                </div>
            )}

            {/* Project Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111827] rounded-[32px] p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Irrigation Spread</p>
                        <h4 className="text-4xl font-black tracking-tighter">1,240 <span className="text-lg opacity-50 uppercase">Hectares</span></h4>
                        <div className="mt-8 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Reclamation</span>
                        </div>
                    </div>
                    <div className="absolute -bottom-6 -right-6 opacity-10">
                        <Droplets className="w-40 h-40" />
                    </div>
                </div>

                <div className="bg-blue-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-4">Environmental Impact</p>
                        <h4 className="text-4xl font-black tracking-tighter">88% <span className="text-lg opacity-50 uppercase">Positive</span></h4>
                        <div className="mt-8 flex items-center gap-2">
                            <Wind className="w-4 h-4 text-blue-100" />
                            <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Air Quality Improvement</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex flex-col justify-center text-center">
                    <h5 className="text-2xl font-black text-gray-800 tracking-tighter">Join Our Mission</h5>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest mb-6 leading-relaxed">Shape the future of <br /> sustainable infrastructure</p>
                    <button className="bg-gray-50 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-900 hover:bg-black hover:text-white transition-all">
                        Project Documents
                    </button>
                </div>
            </div>
        </div>
    );
};
