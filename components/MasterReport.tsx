
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Home, Star, Award, Heart, Map, Download, RefreshCw, Quote, Compass, Target, Sparkles, Fingerprint, Info, ListTodo, Mountain, UserCircle, Search, Zap, BookOpen, CheckCircle2, FileText, User } from 'lucide-react';
import { fetchLatestHollandResult, fetchUserChatLogs, fetchGoalRoadmap, fetchValuePriorities, fetchUserActions, fetchReflectionData, fetchProjectPlan, getUserProfile } from '../services/firebase';
import { ChatLog } from '../types';
import { generateCareerPersona } from '../services/geminiService';

interface MasterReportProps {
  userName: string;
  onClose: () => void;
}

export const MasterReport: React.FC<MasterReportProps> = ({ userName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllData();
  }, [userName]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        holland, 
        chatLogs, 
        roadmap, 
        values, 
        actions, 
        reflection, 
        projectPlan,
        profile
      ] = await Promise.all([
        fetchLatestHollandResult(userName),
        fetchUserChatLogs(userName),
        fetchGoalRoadmap(userName),
        fetchValuePriorities(userName),
        fetchUserActions(userName),
        fetchReflectionData(userName),
        fetchProjectPlan(userName),
        getUserProfile(userName)
      ]);

      const strengthsLog = (chatLogs as ChatLog[]).find(l => l.type === 'STRENGTHS');
      const strengthsSummary = strengthsLog?.summary || "";
      const hollandCode = holland?.topCode || "S";

      const executionLog = (chatLogs as ChatLog[]).find(l => l.type === 'ACTION_EXECUTION');
      const aiSuggestions = executionLog?.summary || "";

      // AI 페르소나 생성
      const personaStory = await generateCareerPersona(userName, hollandCode, strengthsSummary);

      setReportData({
        holland,
        strengths: strengthsSummary,
        aiSuggestions,
        roadmap,
        values,
        actions: actions.items || [],
        reflection,
        projectPlan,
        personaStory,
        profile,
        date: new Date().toLocaleDateString()
      });
    } catch (err) {
      console.error("Master report data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <RefreshCw size={32} className="text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-400">당신의 모든 커리어 여정을 하나로 묶고 있습니다...</p>
      </div>
    );
  }

  const personaLines = reportData.personaStory.split('\n').filter((l: string) => l.trim() !== "");
  const personaTitle = personaLines[0] || "당신은 준비된 전문가입니다";
  const personaContent = personaLines.slice(1).join(' ');

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black tracking-tight">커리어 마스터 리포트</h1>
          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest italic">Full Journey Portfolio</span>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
          <Home size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-10 max-w-2xl mx-auto w-full">
        {/* 리포트 본문 영역 */}
        <div ref={reportRef} data-report-master="true" className="bg-black space-y-12 pb-20">
          
          {/* Header */}
          <header className="text-center space-y-6">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[2rem] shadow-2xl">
              <Award size={48} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter mb-2 italic">CAREER MASTER</h1>
              <p className="text-indigo-400 font-bold text-xs uppercase tracking-[0.4em]">{userName} Integrated Portfolio</p>
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-indigo-500 to-transparent mx-auto mt-6" />
            </div>
          </header>

          {/* Identity Section */}
          <section className="relative p-10 rounded-[3rem] bg-gradient-to-br from-[#1a1625] via-black to-[#0d0d15] border border-purple-500/30 overflow-hidden shadow-2xl animate-slide-up">
            <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
              <Star size={200} className="text-indigo-500" />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                <UserCircle size={14} className="text-purple-400" />
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">My Identity</span>
              </div>
              
              {/* 타이틀 크기 조정 */}
              <h2 className="text-2xl sm:text-3xl font-black mb-6 text-white tracking-tight italic">"{personaTitle}"</h2>
              
              {/* 본문 크기 상향: text-[13px] sm:text-sm, 색상 text-white/90 */}
              <p className="text-[13px] sm:text-sm text-white/90 leading-relaxed break-keep font-medium italic">
                {personaContent}
              </p>

              {/* 온보딩 정보 요약 추가 */}
              {reportData.profile?.onboarding && (
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-8 border-t border-white/10">
                  <div className="text-left">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">나이</span>
                    <span className="text-xs text-white font-bold">{reportData.profile.onboarding.age}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">최종 학력</span>
                    <span className="text-xs text-white font-bold truncate block">{reportData.profile.onboarding.education}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">주요 경력</span>
                    <span className="text-[10px] text-gray-400 line-clamp-1">{reportData.profile.onboarding.career}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block mb-1">자격/기술</span>
                    <span className="text-[10px] text-gray-400 line-clamp-1">{reportData.profile.onboarding.qualifications}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 01. Career DNA (Self-Understanding) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-1 text-purple-400">
              <Fingerprint size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest">01. Career DNA</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-gray-600 uppercase">Interest Code</span>
                  <div className="text-5xl font-black text-purple-400 tracking-widest">{reportData.holland?.topCode || "---"}</div>
                </div>
                <div className="w-px h-12 bg-white/5 mx-6" />
                <p className="flex-1 text-xs text-gray-400 leading-relaxed italic break-keep">
                  성향이 돋보이는 3가지 코드가 조합된 고유한 흥미 DNA입니다.
                </p>
              </div>
              <div className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                 <div className="flex items-center gap-2 text-purple-400 font-black text-[10px] uppercase tracking-widest">
                    <Award size={14} /> <span>핵심 강점 분석 요약</span>
                 </div>
                 <p className="text-sm text-gray-300 leading-relaxed italic whitespace-pre-wrap pl-4 border-l-2 border-purple-500/30">
                    {reportData.strengths.replace(/\[.*?\]/g, '').trim() || "기록된 강점이 없습니다."}
                 </p>
              </div>
            </div>
          </section>

          {/* 02. Career Compass (Goal Setting) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-1 text-indigo-400">
              <Compass size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest">02. Career Compass</h3>
            </div>
            <div className="bg-gradient-to-br from-[#0d0d15] to-black border border-indigo-500/20 rounded-[3rem] p-10 space-y-8 shadow-2xl">
              <div className="text-center mb-2">
                <h2 className="text-2xl font-black text-white mb-1">{userName}님의 미래 지도</h2>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Career Roadmap</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mountain size={20} className="text-indigo-400" />
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Vision & Mission</span>
                </div>
                <h4 className="text-2xl font-black text-white mb-3 italic">"{reportData.roadmap?.vision || '비전 미설정'}"</h4>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">{reportData.roadmap?.mission}</p>
                
                {reportData.roadmap?.values && (
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Star size={16} className="text-yellow-400" />
                      <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Core Values</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed italic">"{reportData.roadmap.values}"</p>
                  </div>
                )}
              </div>
              <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-8">
                <div>
                  <span className="text-[10px] font-black text-gray-600 uppercase mb-3 block">Top Values</span>
                  <div className="space-y-2">
                    {reportData.values?.items.slice(0, 3).map((v: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-xs font-bold">{v.label}</span>
                        <span className="text-[9px] text-yellow-500/40 font-black italic">{i+1}st</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#1a1625] p-6 rounded-2xl border border-purple-500/10 flex flex-col justify-center text-center">
                   <p className="text-[10px] text-gray-500 italic leading-relaxed break-keep">
                     선택하신 가치들은 당신의 새로운 여정을 지탱할 단단한 뿌리가 됩니다.
                   </p>
                </div>
              </div>
            </div>
          </section>

          {/* 03. Action Plan (Execution) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-1 text-emerald-400">
              <Zap size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest">03. Action Plan</h3>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {reportData.aiSuggestions && (
                <div className="bg-[#0d1511] p-8 rounded-[2.5rem] border border-emerald-500/20 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                    <Sparkles size={14} /> <span>상담가 추천 프로젝트 요약</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed italic break-keep pl-4 border-l-2 border-emerald-500/30">
                    {reportData.aiSuggestions.split('[코치]').pop()?.trim()}
                  </p>
                </div>
              )}

              {reportData.actions && reportData.actions.length > 0 && reportData.actions.some((a: any) => a.title) && (
                <div className="bg-[#111] p-8 rounded-[2.5rem] border border-emerald-500/10 space-y-6">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                    <ListTodo size={14} /> <span>주간 실천 프로젝트 (3가지)</span>
                  </div>
                  <div className="space-y-6">
                    {reportData.actions.map((action: any, idx: number) => (
                      action.title && (
                        <div key={idx} className="pl-4 border-l-2 border-emerald-500/30 space-y-3">
                          <h5 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="text-[10px] text-emerald-500/50 font-black italic">#{idx+1}</span>
                            {action.title}
                          </h5>
                          
                          {action.gasLevels && Object.values(action.gasLevels).some(v => v) && (
                            <div className="grid grid-cols-1 gap-1.5 mt-2">
                              {[
                                { level: '2', label: '+2', color: 'text-emerald-400' },
                                { level: '1', label: '+1', color: 'text-emerald-300' },
                                { level: '0', label: '0', color: 'text-blue-400' },
                                { level: '-1', label: '-1', color: 'text-orange-400' },
                                { level: '-2', label: '-2', color: 'text-red-400' },
                              ].map((item) => (
                                action.gasLevels[item.level] && (
                                  <div key={item.level} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                                    <div className={`w-5 h-5 rounded bg-black/40 flex items-center justify-center text-[8px] font-black ${item.color} shrink-0`}>
                                      {item.label}
                                    </div>
                                    <span className="text-[10px] text-gray-400 truncate">{action.gasLevels[item.level]}</span>
                                  </div>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {reportData.projectPlan && (
                <div className="bg-[#111] p-8 rounded-[2.5rem] border border-emerald-500/10 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                    <FileText size={14} /> <span>나의 실행 프로젝트: {reportData.projectPlan.projectName}</span>
                  </div>
                  <div className="pl-4 border-l-2 border-emerald-500/30 space-y-2">
                    <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest">기간: {reportData.projectPlan.duration}</p>
                    <p className="text-sm text-gray-300 leading-relaxed break-keep whitespace-pre-wrap">{reportData.projectPlan.content}</p>
                    
                    {reportData.projectPlan.gasLevels && Object.values(reportData.projectPlan.gasLevels).some(v => v) && (
                      <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                        <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest block mb-2">성취 기준 (GAS)</span>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { level: '2', label: '+2', color: 'text-emerald-400' },
                            { level: '1', label: '+1', color: 'text-emerald-300' },
                            { level: '0', label: '0', color: 'text-blue-400' },
                            { level: '-1', label: '-1', color: 'text-orange-400' },
                            { level: '-2', label: '-2', color: 'text-red-400' },
                          ].map((item) => (
                            reportData.projectPlan.gasLevels[item.level] && (
                              <div key={item.level} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <div className={`w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center text-[9px] font-black ${item.color} shrink-0`}>
                                  {item.label}
                                </div>
                                <span className="text-[11px] text-gray-400 leading-tight">{reportData.projectPlan.gasLevels[item.level]}</span>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* 04. Growth Diary (Reflection) */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-1 text-pink-400">
              <BookOpen size={20} />
              <h3 className="text-sm font-black uppercase tracking-widest">04. Growth Diary</h3>
            </div>
            <div className="bg-[#fdfbf6] rounded-[3rem] p-12 text-gray-800 shadow-2xl relative border-8 border-[#f3e9d2]">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-10">
                <span className="text-gray-400 font-black text-xs uppercase tracking-widest">Final Reflection</span>
                <Heart size={20} className="text-pink-400 fill-pink-400" />
              </div>
              <div className="space-y-8">
                 <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">새롭게 발견한 나의 모습</h4>
                    <p className="text-sm font-medium leading-relaxed border-l-4 border-blue-100 pl-6 italic">
                       "{reportData.reflection?.diary_writing?.learned || "성찰 진행 중"}"
                    </p>
                 </div>
                 <div className="space-y-2">
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">미래의 직업 관심사</h4>
                    <p className="text-xl font-black text-indigo-600 border-l-4 border-indigo-100 pl-6">
                       {reportData.reflection?.diary_writing?.interest || "탐색 중"}
                    </p>
                 </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-20 text-center space-y-10">
             <div className="bg-gradient-to-br from-indigo-900/30 via-black to-black p-12 rounded-[4rem] border-2 border-indigo-500/20 flex flex-col items-center">
                <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mb-8 shadow-2xl">
                   <Star size={40} fill="white" className="text-white" />
                </div>
                <h4 className="text-3xl font-black mb-4">Great Leap Forward!</h4>
                <p className="text-sm text-indigo-200/70 leading-relaxed max-w-sm mx-auto break-keep">
                  {userName}님, 당신의 경험은 이미 훌륭한 브랜드입니다.<br/>
                  이 리포트는 새로운 시작을 위한 나침반이 될 것입니다.<br/>
                  당신의 빛나는 제2의 인생을 진심으로 응원합니다.
                </p>
             </div>
             <p className="opacity-20 text-[10px] font-black uppercase tracking-[0.5em] pb-10">
                Second Life Career Lab | Portfolio v1.2
             </p>
          </footer>

        </div>
      </div>

      {/* 하단 플로팅 액션 버튼 */}
      <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent sticky bottom-0 border-t border-white/5 backdrop-blur-md z-50 flex flex-col items-center gap-3">
        <button 
          onClick={onClose}
          className="w-full max-w-md py-5 rounded-2xl bg-white text-black font-black text-base shadow-2xl hover:bg-purple-50 transition-all active:scale-[0.98]"
        >
          완료
        </button>
      </div>
    </div>
  );
};
