import React from 'react';
import { ProjectItem } from '../types';
import { X, ExternalLink, BarChart2, CheckCircle, Cpu, Download } from 'lucide-react';

interface ProjectModalProps {
  project: ProjectItem | null;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[20px] shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2 pr-8">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {project.category}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            {project.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {project.description}
          </p>
        </div>

        {/* Live Mock Graphic Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 p-4 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] ml-2 text-slate-400">Power BI Service Report View</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">Star Schema Verified</span>
          </div>

          <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {project.kpis.map((kpi, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400">{kpi.label}</p>
                <p className="text-xl font-black text-amber-400 mt-0.5">{kpi.value}</p>
                <p className="text-[10px] font-bold text-emerald-400 mt-1">{kpi.change} vs prior period</p>
              </div>
            ))}
          </div>

          {/* Simulated Chart Controls */}
          <div className="mt-4 h-36 bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 flex items-end justify-between gap-2">
            <div className="w-full bg-purple-600/70 rounded-t h-[35%] flex items-center justify-center text-[10px] text-white">Q1</div>
            <div className="w-full bg-purple-600/80 rounded-t h-[60%] flex items-center justify-center text-[10px] text-white">Q2</div>
            <div className="w-full bg-purple-600/90 rounded-t h-[50%] flex items-center justify-center text-[10px] text-white">Q3</div>
            <div className="w-full bg-gradient-to-t from-purple-600 to-amber-500 rounded-t h-[95%] flex items-center justify-center text-[10px] text-white font-bold">Q4 (Target)</div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-600" /> Project Architecture & Overview
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {project.fullDescription}
          </p>

          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Tools & Technologies Used
            </h4>
            <div className="flex flex-wrap gap-2">
              {project.toolsUsed.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* What You Learn From This Project */}
          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Key Skills Developed
            </h4>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li>Building star schema data models with fact and dimension tables</li>
              <li>Writing advanced DAX measures for time intelligence and dynamic filters</li>
              <li>Designing user-friendly dashboard layouts with slicers and bookmark navigation</li>
              <li>Automating daily refresh dataflows with Power Query M scripts</li>
            </ul>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <a
            href="https://youtube.com/@probitian"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-radius px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-soft flex items-center gap-2 transition-all"
          >
            <span>Watch Full Project Tutorial</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={onClose}
            className="btn-radius px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
