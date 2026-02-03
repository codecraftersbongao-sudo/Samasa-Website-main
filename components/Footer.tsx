
import React from 'react';
import { Facebook, Twitter, Instagram, Mail, MapPin, ShieldCheck, Github } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-samasa-black text-slate-400 pt-24 pb-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-20">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-samasa-blue rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-samasa-blue/20">
                S
              </div>
              <div>
                <span className="text-2xl font-black tracking-tighter text-white block">SAMASA</span>
                <span className="text-[8px] font-black text-samasa-yellow uppercase tracking-[0.4em]">Strategic Hub</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-500 font-medium italic">
              "The sovereign student government of the College of Arts and Social Sciences. Empowering through transparency and strategic leadership."
            </p>
          </div>

          <div>
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-10 border-b border-white/5 pb-4">Strategic Map</h3>
            <ul className="space-y-5 text-[11px] font-black uppercase tracking-widest">
              <li><a href="#/about" className="hover:text-samasa-yellow transition-colors flex items-center">Mission Archive</a></li>
              <li><a href="#/officers" className="hover:text-samasa-yellow transition-colors flex items-center">Personnel Directory</a></li>
              <li><a href="#/budget" className="hover:text-samasa-yellow transition-colors flex items-center">Financial Registry</a></li>
              <li><a href="#/proposals" className="hover:text-samasa-yellow transition-colors flex items-center">Legislative Ledger</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-10 border-b border-white/5 pb-4">Command Contact</h3>
            <ul className="space-y-6 text-[11px] font-bold">
              <li className="flex items-start space-x-4">
                <Mail className="w-5 h-5 text-samasa-red shrink-0" />
                <span className="leading-tight">samasa.cass@university.edu.ph</span>
              </li>
              <li className="flex items-start space-x-4">
                <MapPin className="w-5 h-5 text-samasa-blue shrink-0" />
                <span className="leading-tight text-slate-500 uppercase tracking-widest text-[10px]">SAMASA HQs, Level 2<br />CASS Administrative Wing</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.3em] mb-10 border-b border-white/5 pb-4">Broadcast Channels</h3>
            <div className="flex space-x-4">
              <a href="#" className="p-3 bg-white/5 rounded-2xl hover:bg-samasa-blue hover:text-white transition-all active:scale-90">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-3 bg-white/5 rounded-2xl hover:bg-samasa-red hover:text-white transition-all active:scale-90">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-3 bg-white/5 rounded-2xl hover:bg-samasa-yellow hover:text-samasa-black transition-all active:scale-90">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-samasa-blue" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Official Gov Channel</span>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">
          <p>© {new Date().getFullYear()} SAMASA CASS. RATIFIED SYSTEM ARCHITECTURE.</p>
          <div className="flex items-center space-x-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Protocals</a>
            <a href="#" className="hover:text-white transition-colors">System Status</a>
            <div className="flex items-center space-x-2 text-slate-400">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <span>Secure Session</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
