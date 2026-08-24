import React, { useState, useEffect } from 'react';
import { LearnTopic } from '../types';
import { LEARN_TOPICS } from '../data/mockData';
import { cmsService } from '../services/cmsService';
import { BarChart3, Database, Table, Cpu, Play, CheckCircle2, BookOpen, Clock, Download, Sparkles, ExternalLink } from 'lucide-react';
import { trackCourseClick, trackSocialClick, trackCtaClick, trackEvent } from '../lib/analytics';

export const LearnPage: React.FC = () => {
  const [topicsList, setTopicsList] = useState<LearnTopic[]>(LEARN_TOPICS);
  const [selectedTopic, setSelectedTopic] = useState<LearnTopic>(LEARN_TOPICS[0]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await cmsService.getCourses();
      if (data && data.length > 0) {
        setTopicsList(data);
        setSelectedTopic(data[0]);
      }
    } catch (err) {
      console.error('Error fetching courses from cmsService:', err);
    }
  };

  const categories = [
    { name: 'Power BI', id: 'pbi-foundations' },
    { name: 'SQL', id: 'sql-analytics' },
    { name: 'Excel', id: 'excel-advanced' },
    { name: 'Power Query', id: 'pbi-foundations' },
    { name: 'DAX', id: 'dax-pro' },
    { name: 'AI', id: 'dax-pro' },
    { name: 'Career', id: 'sql-analytics' },
  ];

  return (
    <div className="space-y-12 pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          Structured Learning Pathways
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Master Data <span className="text-gradient">Step-by-Step</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium">
          Select a domain below to view complete course syllabi, downloadable datasets, and practical video modules.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-soft">
        {topicsList.map((topic) => (
          <button
            key={topic.id}
            onClick={() => {
              trackCourseClick(topic.title, topic.level);
              setSelectedTopic(topic);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedTopic.id === topic.id
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {topic.title}
          </button>
        ))}
      </div>

      {/* Main Selected Pathway Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Course Overview */}
        <div className="lg:col-span-5 card-radius bg-white dark:bg-slate-800/90 p-6 md:p-8 border border-slate-200 dark:border-slate-700/80 shadow-soft space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {selectedTopic.level} Level
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-600" /> {selectedTopic.duration}
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {selectedTopic.title}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedTopic.description}
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Key Learning Outcomes
            </h3>
            <div className="space-y-2">
              {selectedTopic.keyTakeaways.map((takeaway, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <a
              href="https://youtube.com/@probitian"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackSocialClick('youtube', 'https://youtube.com/@probitian');
                trackCtaClick(`Start Course: ${selectedTopic.title}`, 'https://youtube.com/@probitian');
              }}
              className="btn-radius w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-soft flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 text-amber-400 fill-current" />
              <span>Start Course on ProBItian YouTube</span>
            </a>

            <button
              onClick={() => {
                trackEvent('dataset_download_click', { course_title: selectedTopic.title });
                alert('Starter Datasets & Exercise Workbook files downloaded!');
              }}
              className="btn-radius w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-purple-600" />
              <span>Download Course Files & Datasets (.pbix / .sql)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Module Syllabus Timeline */}
        <div className="lg:col-span-7 card-radius bg-white dark:bg-slate-800/90 p-6 md:p-8 border border-slate-200 dark:border-slate-700/80 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Course Modules & Syllabus</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{selectedTopic.modulesCount} Modules • Step-by-Step Hands-on</p>
            </div>
            <BookOpen className="w-6 h-6 text-purple-600" />
          </div>

          <div className="space-y-3">
            {selectedTopic.syllabus.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-4 group hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {item.type === 'project' ? '🚀 Portfolio Project' : '📹 Video Tutorial'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                    {item.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
