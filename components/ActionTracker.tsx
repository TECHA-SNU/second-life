
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Check, Circle, Edit2, Trash2, Search, Target, ListTodo, Home, ArrowRight, Quote, ChevronLeft, ChevronRight, RefreshCw, ChevronDown, Sparkles, Zap, Award, FileText, Clock, ChevronUp, PartyPopper, Heart, ExternalLink, Newspaper, UserCheck, Bot, X } from 'lucide-react';
import { saveUserActions, fetchUserActions, fetchGoalRoadmap, fetchUserChatLogs, saveProjectPlan, fetchProjectPlan, upsertChatLog, fetchLatestJobRecommendation } from '../services/firebase';
import { ChatLog } from '../types';
import { searchRoleModelArticles, generateShortTermProjects, generateDetailedProjectPlan } from '../services/geminiService';

interface ActionItem {
  id: number;
  title: string;
  dateRange: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
}

interface ProjectPlan {
  projectName: string;
  duration: string;
  content: string;
  keyPoints: string;
  gasLevels?: {
    '-2': string;
    '-1': string;
    '0': string;
    '1': string;
    '2': string;
  };
}

interface Article {
  title: string;
  uri: string;
}

interface AiProjectSuggestion {
  title: string;
  description: string;
}

type ViewMode = 'MAIN' | 'ARTICLE_EXPLORATION' | 'FORM' | 'CELEBRATION';

export const ActionTracker: React.FC<{ userName: string; onClose: () => void; onNext: () => void; }> = ({ userName, onClose, onNext }) => {
  const [mainGoal, setMainGoal] = useState({ title: '', desc: '' });
  const [items, setItems] = useState<ActionItem[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isSearchingArticles, setIsSearchingArticles] = useState(false);
  const [newActionText, setNewActionText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Gemini 추천 관련 상태
  const [isGeneratingAiProjects, setIsGeneratingAiProjects] = useState(false);
  const [aiProjectSuggestions, setAiProjectSuggestions] = useState<AiProjectSuggestion[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isGeneratingFullPlan, setIsGeneratingFullPlan] = useState(false);

  // 1주일 단기 프로젝트 성취 기준 상태 (분리)
  const [shortTermGasLevels, setShortTermGasLevels] = useState({
    '-2': '', '-1': '', '0': '', '1': '', '2': ''
  });

  // 화면 모드 관리
  const [viewMode, setViewMode] = useState<ViewMode>('MAIN');

  // 계획서 상태
  const [plan, setPlan] = useState<ProjectPlan>({
    projectName: '',
    duration: '1주일',
    content: '',
    keyPoints: '',
    gasLevels: {
      '-2': '',
      '-1': '',
      '0': '',
      '1': '',
      '2': ''
    }
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const trackerContentRef = useRef<HTMLDivElement>(null);
  const planReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0);
  }, [viewMode]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [chatLogs, savedActionsData, roadmap, savedPlan, jobData] = await Promise.all([
        fetchUserChatLogs(userName),
        fetchUserActions(userName),
        fetchGoalRoadmap(userName),
        fetchProjectPlan(userName),
        fetchLatestJobRecommendation(userName)
      ]);

      if (jobData && jobData.jobs) {
        setRecommendedJobs(jobData.jobs.slice(0, 3));
      }

      const syncedMainTitle = roadmap?.vision || savedActionsData?.mainGoal?.title || "비전이 설정되지 않았습니다.";
      setMainGoal({ title: syncedMainTitle, desc: '' });

      if (savedActionsData && savedActionsData.items && savedActionsData.items.length > 0) {
        setItems(savedActionsData.items);
      }

      if (savedActionsData && savedActionsData.gasLevels) {
        setShortTermGasLevels(savedActionsData.gasLevels);
      }

      if (savedPlan) {
        setPlan(savedPlan as ProjectPlan);
      } else if (items.length > 0) {
        setPlan(prev => ({ ...prev, projectName: items[0].title }));
      }

    } catch (err) {
      console.error("Load data error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHelpFromGemini = async () => {
    setIsGeneratingAiProjects(true);
    setShowAiSuggestions(true);
    try {
      const [chatLogs, roadmap, jobData] = await Promise.all([
        fetchUserChatLogs(userName),
        fetchGoalRoadmap(userName),
        fetchLatestJobRecommendation(userName)
      ]);
      
      const strengthsLog = (chatLogs as ChatLog[]).find(l => l.type === 'STRENGTHS');
      const strengths = strengthsLog?.summary || "강점이 충분히 기록되지 않았습니다.";
      const vision = roadmap?.vision || "비전이 설정되지 않았습니다.";
      const jobs = jobData?.jobs || [];

      const suggestions = await generateShortTermProjects(userName, { strengths, vision, jobs });
      setAiProjectSuggestions(suggestions);
    } catch (error) {
      console.error(error);
      alert("AI 추천을 생성하는 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingAiProjects(false);
    }
  };

  const handleFullPlanHelp = async () => {
    setIsGeneratingFullPlan(true);
    try {
      const [chatLogs, roadmap, jobData] = await Promise.all([
        fetchUserChatLogs(userName),
        fetchGoalRoadmap(userName),
        fetchLatestJobRecommendation(userName)
      ]);
      
      const strengthsLog = (chatLogs as ChatLog[]).find(l => l.type === 'STRENGTHS');
      const strengths = strengthsLog?.summary || "전문성과 문제 해결 능력";
      const vision = roadmap?.vision || "새로운 커리어 도전";
      const jobs = jobData?.jobs || [];

      const result = await generateDetailedProjectPlan(userName, { strengths, vision, jobs });
      if (result) {
        setPlan(result);
      }
    } catch (error) {
      console.error(error);
      alert("계획서를 생성하는 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingFullPlan(false);
    }
  };

  const addSuggestedProject = (title: string) => {
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem: ActionItem = {
      id: newId,
      title: title,
      dateRange: "Gemini 추천",
      status: 'PENDING'
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    saveUserActions(userName, updatedItems, mainGoal, shortTermGasLevels);
    setShowAiSuggestions(false);
  };

  const handleJobSelect = async (job: string) => {
    setSelectedJob(job);
    setIsSearchingArticles(true);
    setArticles([]); 
    try {
      const foundArticles = await searchRoleModelArticles(job);
      setArticles(foundArticles);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearchingArticles(false);
    }
  };

  const handleAddAction = () => {
    if (!newActionText.trim()) return;
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem: ActionItem = {
      id: newId,
      title: newActionText,
      dateRange: "1주일 프로젝트",
      status: 'PENDING'
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setNewActionText('');
    saveUserActions(userName, updatedItems, mainGoal, shortTermGasLevels);
    const planningSummary = updatedItems.map(i => `- ${i.title}`).join('\n');
    upsertChatLog(userName, 'PLANNING', planningSummary);
  };

  const handleRemoveAction = (id: number) => {
    const updatedItems = items.filter(i => i.id !== id);
    setItems(updatedItems);
    saveUserActions(userName, updatedItems, mainGoal, shortTermGasLevels);
  };

  const toggleStatus = (id: number) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const nextStatus: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' = item.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
        return { ...item, status: nextStatus };
      }
      return item;
    });
    setItems(updatedItems);
    saveUserActions(userName, updatedItems, mainGoal, shortTermGasLevels);
  };

  const handleSavePlanAndExecute = async () => {
    if (!plan.projectName.trim() || !plan.content.trim()) {
      alert("프로젝트명과 내용을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      await saveProjectPlan(userName, plan);
      alert("프로젝트 계획이 저장되었습니다! 1주일 후에 달성 정도를 함께 체크해 봅시다!");
      setViewMode('CELEBRATION');
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (viewMode === 'ARTICLE_EXPLORATION') setViewMode('MAIN');
    else if (viewMode === 'FORM') setViewMode('ARTICLE_EXPLORATION');
    else if (viewMode === 'CELEBRATION') setViewMode('FORM');
    else onClose();
  };

  const handleMainActionButton = () => {
    if (viewMode === 'MAIN') setViewMode('ARTICLE_EXPLORATION');
    else if (viewMode === 'ARTICLE_EXPLORATION') setViewMode('FORM');
    else if (viewMode === 'FORM') handleSavePlanAndExecute();
    else onNext();
  };

  const progressPercentage = items.length > 0 
    ? Math.round((items.filter(i => i.status === 'COMPLETED').length / items.length) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <RefreshCw size={32} className="text-emerald-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-400">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in relative">
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 border-b border-white/5 sticky top-0 z-40 backdrop-blur-md">
        <button onClick={handleBack} className="p-2 text-gray-400 hover:text-white transition-colors">
          {viewMode === 'MAIN' ? <Home size={24} /> : <ChevronLeft size={24} />}
        </button>
        <div className="flex items-center gap-2">
           <Zap size={18} className="text-yellow-400 fill-yellow-400" />
           <h1 className="text-lg font-bold">
             {viewMode === 'MAIN' ? "행동실행" : viewMode === 'ARTICLE_EXPLORATION' ? "롤모델 기사 탐방" : viewMode === 'FORM' ? "프로젝트 계획서" : "응원의 한마디"}
           </h1>
        </div>
        <div className="w-10" />
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 pb-40 max-w-lg mx-auto w-full scrollbar-hide">
        
        {viewMode === 'MAIN' && (
          <div ref={trackerContentRef} className="animate-fade-in pt-6">
            <div className="bg-gradient-to-br from-[#1c182b] to-[#0a0911] border border-purple-500/30 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-2xl">
              <div className="absolute -right-4 -top-4 opacity-5"><Target size={80} /></div>
              <div className="flex items-center gap-2 mb-4">
                <Award size={18} className="text-purple-400" />
                <span className="text-purple-400 font-black text-[10px] uppercase tracking-widest">나의 커리어 대목표</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                   <h2 className="text-xl font-black text-white leading-tight break-keep">{mainGoal.title || "목표를 설정해주세요"}</h2>
                </div>
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30 shrink-0">
                   <span className="text-sm font-black text-purple-300">{progressPercentage}%</span>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <ListTodo size={14} /> 
                1주일 단기 프로젝트 만들기
              </h3>
              <p className="text-[11px] text-indigo-400 font-bold mb-1">프로젝트 만들기가 어렵다면 gemini의 도움을 받아보세요.</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-4 break-keep">
                구체적(Specific), 측정 가능(Measurable), 달성 가능(Achievable), 관련성(Relevant), 시간 제한(Time-bound)이 있는 SMART한 목표를 설정해 보세요.
              </p>

              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  placeholder="실천할 목표를 입력해 주세요"
                  className="flex-1 bg-[#1a1625] border border-gray-700 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-purple-500"
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter') handleAddAction();
                  }}
                />
                <button onClick={handleAddAction} className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white shrink-0 active:scale-95"><Plus size={24} /></button>
              </div>

              <button 
                onClick={handleHelpFromGemini}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 border border-yellow-300 flex items-center justify-center gap-2 group hover:from-yellow-300 hover:to-amber-400 transition-all active:scale-[0.98] animate-blink shadow-lg shadow-yellow-900/20"
              >
                <div className="bg-black/10 p-1.5 rounded-lg">
                  <Bot size={16} className="text-black" />
                </div>
                <span className="text-xs font-black text-black uppercase tracking-tight">"GEMINI 도움받기"를 눌러보세요.</span>
                <Sparkles size={14} className="text-black animate-pulse" />
              </button>

              {showAiSuggestions && (
                <div className="mb-8 animate-slide-up">
                   <div className="bg-[#0a0a0f] border border-indigo-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                      <button onClick={() => setShowAiSuggestions(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                        <X size={18} />
                      </button>
                      <div className="flex items-center gap-2 mb-6">
                        <Sparkles size={16} className="text-indigo-400" />
                        <h4 className="text-sm font-black text-indigo-100">Gemini가 제안하는 이번 주 실천 프로젝트</h4>
                      </div>

                      {isGeneratingAiProjects ? (
                        <div className="flex flex-col items-center py-10 gap-4">
                           <div className="flex gap-1.5">
                             <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                             <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                             <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                           </div>
                           <p className="text-xs text-gray-500 font-bold">내담자님의 강점과 비전을 분석하고 있습니다...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                           {aiProjectSuggestions.map((proj, i) => (
                             <div 
                               key={i} 
                               onClick={() => addSuggestedProject(proj.title)}
                               className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all cursor-pointer group animate-fade-in"
                             >
                                <h5 className="text-sm font-bold text-gray-200 group-hover:text-indigo-300 mb-1">{proj.title}</h5>
                                <p className="text-[11px] text-gray-500 leading-relaxed break-keep">{proj.description}</p>
                                <div className="mt-4 flex justify-end">
                                   <div className="px-3 py-1 bg-indigo-500/10 rounded-lg text-[10px] font-black text-indigo-400 flex items-center gap-1.5 group-hover:bg-indigo-500/20">
                                      목표에 추가하기 <Plus size={10} />
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
              )}

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${item.status === 'COMPLETED' ? 'bg-emerald-600/10 border-emerald-500/30' : 'bg-[#15121e] border-white/5'}`}>
                    <div onClick={() => toggleStatus(item.id)} className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${item.status === 'COMPLETED' ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-white/10 text-gray-500'}`}>
                      {item.status === 'COMPLETED' ? <Check size={18} strokeWidth={3} /> : <Circle size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-bold text-sm block ${item.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-white'}`}>{item.title}</span>
                    </div>
                    <button onClick={() => handleRemoveAction(item.id)} className="p-2 text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              {/* GAS Levels Section */}
              <div className="mt-10 pt-8 border-t border-white/5 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Award size={16} className="text-emerald-400" />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                    일주일 후, 이 프로젝트를 얼마나 달성했는지 함께 점검하려고 해요.<br/>
                    성취 기준 (GAS)에 대해 생각해보세요.
                  </h3>
                </div>
                <p className="text-[10px] text-gray-500 mb-6 leading-relaxed break-keep">
                  각 단계별로 도달하고 싶은 성취 수준을 정의해 보세요. (0: 기대한 수준)
                </p>
                
                <div className="space-y-3">
                  {[
                    { level: '2', label: '매우 초과 달성 (+2)', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { level: '1', label: '초과 달성 (+1)', color: 'text-emerald-300', bg: 'bg-emerald-500/5' },
                    { level: '0', label: '기대 수준 달성 (0)', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { level: '-1', label: '기대 미달 (-1)', color: 'text-orange-400', bg: 'bg-orange-500/5' },
                    { level: '-2', label: '매우 미달 (-2)', color: 'text-red-400', bg: 'bg-red-500/10' },
                  ].map((item) => (
                    <div key={item.level} className={`p-4 rounded-2xl border border-white/5 ${item.bg} flex flex-col gap-2`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${item.color}`}>{item.label}</span>
                      </div>
                      <input 
                        type="text"
                        value={shortTermGasLevels?.[item.level as keyof typeof shortTermGasLevels] || ''}
                        onChange={(e) => {
                          const newGasLevels = {
                            ...shortTermGasLevels,
                            [item.level]: e.target.value
                          };
                          setShortTermGasLevels(newGasLevels);
                          saveUserActions(userName, items, mainGoal, newGasLevels);
                        }}
                        placeholder="이 단계의 성취 기준을 입력하세요"
                        className="bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'ARTICLE_EXPLORATION' && (
          <div className="animate-fade-in pt-6">
            <div className="mb-8">
               <h2 className="text-xl font-black text-white mb-2 leading-tight">꿈실행을 위한 롤모델 기사를 탐방해보세요.</h2>
               <p className="text-sm text-gray-400 leading-relaxed break-keep">추천된 직업 중 하나를 선택하면<br/>그 분야 롤모델들의 생생한 성공 기사를 찾아드립니다.</p>
            </div>

            <div className="mb-10">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">직업 선택하기</h3>
              <div className="grid grid-cols-1 gap-3">
                {recommendedJobs.length > 0 ? recommendedJobs.map((job, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleJobSelect(job)}
                    className={`p-5 rounded-2xl border text-left transition-all flex items-center justify-between group ${selectedJob === job ? 'bg-purple-600 border-purple-500 shadow-xl shadow-purple-900/40' : 'bg-[#111] border-white/10 hover:border-purple-500/30'}`}
                  >
                    <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-xl ${selectedJob === job ? 'bg-white/20' : 'bg-purple-500/10'}`}>
                          <UserCheck size={20} className={selectedJob === job ? 'text-white' : 'text-purple-400'} />
                       </div>
                       <span className={`font-bold ${selectedJob === job ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{job}</span>
                    </div>
                    {selectedJob === job && (
                      isSearchingArticles ? <RefreshCw size={20} className="text-white animate-spin" /> : <Check size={20} className="text-white" />
                    )}
                  </button>
                )) : (
                  <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 text-gray-500 text-xs">
                     추천된 직무가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {selectedJob && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                   <Newspaper size={18} className="text-indigo-400" />
                   <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">"{selectedJob}" 관련 추천 롤모델 기사</h3>
                </div>

                {isSearchingArticles ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <div className="flex gap-1.5 mb-2">
                       <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                       <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                       <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                    <p className="text-xs text-gray-500 font-bold">Gemini AI가 실시간으로 롤모델 기사를 검색하고 있습니다...</p>
                  </div>
                ) : articles.length > 0 ? (
                  <div className="space-y-4 pb-10">
                    {articles.map((article, idx) => (
                      <a 
                        key={idx} 
                        href={article.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between p-5 bg-[#111] border border-white/5 rounded-2xl hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex-1 truncate pr-4">
                           <h4 className="text-sm font-bold text-gray-200 group-hover:text-white truncate">{article.title}</h4>
                           <span className="text-[10px] text-gray-500 mt-1 block truncate opacity-60">{article.uri}</span>
                        </div>
                        <ExternalLink size={16} className="text-gray-600 group-hover:text-white shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <p className="text-xs text-gray-500">관련 기사를 찾지 못했습니다. 다른 직업을 선택하거나 잠시 후 다시 시도해보세요.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {viewMode === 'FORM' && (
          <div className="animate-slide-up pt-8">
            <div ref={planReportRef} data-report-container="true" className="bg-black p-4 rounded-3xl overflow-visible">
              <div className="mb-8 flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30"><FileText className="text-purple-400" size={32} /></div>
                 <h2 className="text-2xl font-black text-white mb-2">꿈실행 프로젝트 계획서</h2>
                 <p className="text-sm text-gray-400 leading-relaxed break-keep">탐방한 롤모델들의 지혜를 바탕으로<br/>나만의 실천 계획을 구체적으로 디자인해보세요.</p>
              </div>

              {/* Project Help Button */}
              <div className="mb-8">
                 <button 
                   onClick={handleFullPlanHelp}
                   disabled={isGeneratingFullPlan}
                   className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 border border-indigo-400/50 flex items-center justify-center gap-3 group hover:shadow-indigo-900/40 hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
                 >
                   {isGeneratingFullPlan ? (
                     <RefreshCw className="animate-spin text-white" size={20} />
                   ) : (
                     <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30">
                        <Bot size={18} className="text-white" />
                     </div>
                   )}
                   <span className="text-sm font-black text-white uppercase tracking-widest">Gemini로 계획서 자동 완성</span>
                   {!isGeneratingFullPlan && <Sparkles size={14} className="text-yellow-400 animate-pulse" />}
                 </button>
                 <p className="text-[10px] text-gray-500 text-center mt-2 font-bold italic">내담자님의 강점과 비전을 분석하여 맞춤형 계획을 제안합니다.</p>
              </div>

              <div className="space-y-6">
                 <section className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Target size={12}/> 프로젝트명</label>
                    <input type="text" value={plan.projectName} onChange={(e) => setPlan({...plan, projectName: e.target.value})} placeholder="프로젝트 제목을 입력하세요" className="w-full bg-[#1a1625] border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-all" />
                 </section>
                 <section className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Clock size={12}/> 프로젝트 기간 설정</label>
                    <div className="relative">
                      <select value={plan.duration} onChange={(e) => setPlan({...plan, duration: e.target.value})} className="w-full bg-[#1a1625] border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none">
                        <option value="1주일">1주일</option>
                        <option value="2주일">2주일</option>
                        <option value="1개월">1개월</option>
                        <option value="직접 입력">직접 입력</option>
                        <option value={plan.duration}>{plan.duration}</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                    </div>
                 </section>
                 <section className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Edit2 size={12}/> 프로젝트 상세 내용</label>
                    <textarea value={plan.content} onChange={(e) => setPlan({...plan, content: e.target.value})} placeholder="무엇을 어떻게 실행할 것인지 구체적으로 적어주세요." className="w-full h-auto min-h-[160px] bg-[#1a1625] border border-gray-800 rounded-2xl p-5 text-sm text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed transition-all" />
                 </section>
                 <section className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Sparkles size={12}/> 프로젝트에서 중요한 점 (Tips)</label>
                    <textarea value={plan.keyPoints} onChange={(e) => setPlan({...plan, keyPoints: e.target.value})} placeholder="실행 시 유의할 점이나 스스로 지키고 싶은 원칙을 적어보세요." className="w-full h-auto min-h-[120px] bg-[#1a1625] border border-gray-800 rounded-2xl p-5 text-sm text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed transition-all" />
                 </section>
                 <section className="space-y-4 pb-10">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-1.5"><Award size={12}/> 프로젝트 성취 기준 (GAS) 탐방</label>
                    <div className="grid grid-cols-1 gap-2">
                       {[
                         { level: '2', label: '+2', color: 'text-emerald-400' },
                         { level: '1', label: '+1', color: 'text-emerald-300' },
                         { level: '0', label: '0', color: 'text-blue-400' },
                         { level: '-1', label: '-1', color: 'text-orange-400' },
                         { level: '-2', label: '-2', color: 'text-red-400' },
                       ].map((item) => (
                         <div key={item.level} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black ${item.color} shrink-0`}>
                               {item.label}
                            </div>
                            <input 
                              type="text"
                              value={plan.gasLevels?.[item.level as keyof typeof plan.gasLevels] || ''}
                              onChange={(e) => {
                                const newGasLevels = {
                                  ...(plan.gasLevels || { '-2': '', '-1': '', '0': '', '1': '', '2': '' }),
                                  [item.level]: e.target.value
                                };
                                const updatedPlan = {
                                  ...plan, 
                                  gasLevels: newGasLevels
                                };
                                setPlan(updatedPlan);
                                saveProjectPlan(userName, updatedPlan);
                              }}
                              placeholder="성취 기준 입력"
                              className="flex-1 bg-[#1a1625] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                            />
                         </div>
                       ))}
                    </div>
                 </section>
                 <div className="pt-4 pb-10 text-center">
                   <p className="text-xs font-bold text-emerald-400 leading-relaxed break-keep">
                     일주일 후, 이 프로젝트를 얼마나 달성했는지 함께 점검하려고 해요.<br/>
                     성취기준을 확인해주세요.
                   </p>
                 </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'CELEBRATION' && (
          <div className="animate-fade-in pt-12 flex flex-col items-center text-center">
             <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-[2.5rem] flex items-center justify-center mb-8 border border-emerald-500/30 shadow-2xl animate-bounce">
                <PartyPopper className="text-emerald-400" size={48} />
             </div>
             
             <div className="space-y-6 max-w-sm">
                <h2 className="text-3xl font-black text-white leading-tight break-keep">
                   {userName}님,<br/>정말 멋진 계획입니다!
                </h2>
                
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 relative overflow-hidden">
                   <div className="absolute top-4 left-4 text-white/5"><Quote size={40} /></div>
                   <div className="relative z-10 space-y-4">
                      <p className="text-lg text-gray-100 font-medium leading-relaxed break-keep">
                        수십 년의 지혜가 담긴 내담자님의 첫 발걸음을 진심으로 응원합니다. 
                      </p>
                      <p className="text-sm text-gray-400 leading-relaxed break-keep italic">
                        지금 세우신 이 계획은 새로운 인생 2막의 소중한 지도가 될 것입니다. 
                        작은 실천들이 모여 큰 결실을 맺을 때까지, 저희가 끝까지 함께하겠습니다.
                      </p>
                   </div>
                   <div className="mt-6 flex justify-center">
                      <Heart size={20} className="text-red-500 fill-red-500 animate-pulse" />
                   </div>
                </div>

                <div className="pt-4">
                   <p className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.2em]">Your second career starts now</p>
                    <p className="text-[11px] font-black text-indigo-400 mt-2">"1주일 후에 달성 정도를 함께 체크해 봅시다!"</p>
                </div>
             </div>
          </div>
        )}
      </div>
      
      <div className="p-6 bg-gradient-to-t from-black via-black/95 fixed bottom-0 left-0 right-0 border-t border-white/5 flex justify-center z-40">
        <button onClick={handleMainActionButton} className="max-w-lg w-full py-6 rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-purple-900/40 transform transition-all active:scale-95">
           {viewMode === 'MAIN' ? "롤모델 기사 탐방" : viewMode === 'ARTICLE_EXPLORATION' ? "꿈실행 프로젝트 만들기" : viewMode === 'FORM' ? "계획서 저장 및 실행하기" : "성찰 단계로 이동하기"}
           <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
};
