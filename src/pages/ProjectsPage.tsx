import React, { useState, useEffect } from 'react';
import { ProjectItem } from '../types';
import { PROJECTS } from '../data/mockData';
import { cmsService } from '../services/cmsService';
import { ExternalLink, Filter, Search } from 'lucide-react';

interface ProjectsPageProps {
  onSelectProject: (project: ProjectItem) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject }) => {
  const [projectsList, setProjectsList] = useState<ProjectItem[]>(PROJECTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await cmsService.getProjects();
      if (data && data.length > 0) {
        setProjectsList(data);
      }
    } catch (err) {
      console.error('Error fetching projects from cmsService:', err);
    }
  };

  const categories = ['All', 'Sales & Operations', 'Retail & E-commerce', 'Human Resources', 'Corporate Finance', 'Digital Marketing', 'Supply Chain'];

  const filteredProjects = projectsList.filter((proj) => {
    if (proj.published === false) return false;
    const matchesCategory = selectedCategory === 'All' || proj.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch = proj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          proj.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          proj.toolsUsed.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-12 pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          Portfolio Showcase
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Real-World <span className="text-gradient">BI Dashboard Projects</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium">
          Explore executive-ready dashboards built with Power BI, SQL, Power Query, and DAX. Click any card for architecture details and KPIs.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-soft">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dashboards or tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            className="card-radius bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between group"
          >
            <div className="relative h-52 overflow-hidden bg-slate-950">
              <img
                src={project.imagePlaceholder}
                alt={project.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
              />
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-md border border-slate-700">
                {project.category}
              </span>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* KPIs Row */}
              <div className="grid grid-cols-3 gap-2 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800">
                {project.kpis.slice(0, 3).map((kpi, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-[9px] text-slate-400 font-medium truncate">{kpi.label}</p>
                    <p className="text-xs font-black text-amber-500 dark:text-amber-400">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex flex-wrap gap-1.5">
                  {project.toolsUsed.map((tool) => (
                    <span
                      key={tool}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    >
                      {tool}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => onSelectProject(project)}
                  className="btn-radius w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>View Full Architecture</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
