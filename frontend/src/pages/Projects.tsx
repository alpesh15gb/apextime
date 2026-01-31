import { useState } from 'react';
import {
    Droplets,
    ArrowUpRight,
    ExternalLink,
    ShieldCheck,
    Globe,
    Building2
} from 'lucide-react';

export const Projects = () => {
    // Only two categories requested: Buildings (for IIIT) and Water & Irrigation (for Nambul)
    const [activeCategory, setActiveCategory] = useState('Buildings');

    const categories = [
        'Buildings',
        'Water & Irrigation'
    ];

    const projectData: Record<string, any[]> = {
        'Buildings': [
            {
                id: 'BLD-001',
                title: 'IIIT Manipur Campus',
                location: 'Senapati, Manipur',
                description: 'Development of the IIIT Manipur academic campus and facilities.',
                videoSrc: '/videos/iiit.mp4',
                status: 'Ongoing',
                efficiency: '96%',
                icon: Building2
            }
        ],
        'Water & Irrigation': [
            {
                id: 'WIR-001',
                title: 'Nambul River Conservation',
                location: 'Imphal, India',
                description: 'River rejuvenation and landscape development project.',
                videoSrc: '/videos/nambul-river.mp4',
                status: 'Ongoing',
                efficiency: '94%',
                icon: Droplets
            }
        ]
    };

    const currentProjects = projectData[activeCategory] || [];

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        Strategic Projects
                    </h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Global Portfolio</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {currentProjects.map((project) => (
                    <div key={project.id} className="app-card overflow-hidden group">
                        <div className="aspect-video bg-gray-900 relative flex items-center justify-center overflow-hidden">
                            <video
                                controls
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                src={project.videoSrc}
                                poster="/logo.png"
                            >
                                Your browser does not support the video tag.
                            </video>
                            <div className="absolute top-6 left-6 flex gap-2">
                                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black text-white uppercase tracking-widest border border-white/20">
                                    Project ID: {project.id}
                                </span>
                            </div>
                        </div>

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
        </div>
    );
};
