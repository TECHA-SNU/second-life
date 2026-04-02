
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Briefcase, ArrowRight, Lightbulb, UserCheck, ShieldCheck, Home, ArrowLeft, Database, Search, RefreshCw, Star, Fingerprint, Info, AlertCircle } from 'lucide-react';
import { fetchLatestHollandResult, fetchOnetJobs, fetchOnetKnowledge, saveJobRecommendation, fetchUserChatLogs, fetchLatestJobRecommendation } from '../services/firebase';
import { ChatLog } from '../types';
import { recommendJobs } from '../services/geminiService';

interface JobExplorationProps {
  userName: string;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const JobExploration: React.FC<JobExplorationProps> = ({ userName, onClose, onNext, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [hollandCode, setHollandCode] = useState("");
  const [strengthsSummary, setStrengthsSummary] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async (retryCount = 0) => {
    setLoading(true);
    try {
      // 1. 이미 저장된 최신 추천 결과가 있는지 먼저 확인 (동일성 보장의 핵심)
      const existingRecommendation = await fetchLatestJobRecommendation(userName);
      
      const [holland, chatLogs] = await Promise.all([
        fetchLatestHollandResult(userName),
        fetchUserChatLogs(userName)
      ]);

      if (!holland) {
        if (retryCount < 2) {
          setTimeout(() => init(retryCount + 1), 1000);
          return;
        }
        alert("먼저 홀랜드 테스트를 완료해주세요.");
        onBack();
        return;
      }

      setHollandCode(holland.topCode);
      const strengthsLog = (chatLogs as ChatLog[]).find(l => l.type === 'STRENGTHS');
      const strengthsText = strengthsLog?.summary || "성실함과 노련한 문제 해결 능력";
      setStrengthsSummary(strengthsText);

      if (existingRecommendation) {
        // 이미 결과가 있다면 재사용 (AI 재호출 방지)
        setResults(existingRecommendation);
      } else {
        // 없다면(신규 또는 만료) 새로 분석 수행
        const [onetJobs, onetKnowledge] = await Promise.all([
          fetchOnetJobs(),
          fetchOnetKnowledge()
        ]);
        const recommendation = await recommendJobs(holland.topCode, strengthsText, onetJobs, onetKnowledge);
        setResults(recommendation);
        if (recommendation) {
          await saveJobRecommendation(userName, recommendation);
        }
      }
    } catch (err) {
      console.error("Exploration init error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <div className="relative w-28 h-28 mb-10">
          <div className="absolute inset-0 border-[6px] border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-[6px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Database className="text-blue-400 animate-bounce" size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-black mb-3 text-center">나의 데이터 기반<br/>심층 직무 매칭 중</h2>
        <p className="mt-8 text-gray-500 text-sm text-center max-w-xs leading-relaxed">
          홀랜드 유형과 강점 데이터를 분석하여<br/>최적의 커리어 로드맵을 구성하고 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden animate-fade-in">
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md border-b border-white/5 shrink-0">
        <button onClick={onBack} className="p-2 text-gray-500 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
        <div className="flex flex-col items-center">
           <h1 className="text-sm font-black uppercase tracking-widest text-gray-400">Step 2: Exploration</h1>
           <span className="text-[10px] text-blue-400 font-bold italic">O*NET Knowledge Match</span>
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors"><Home size={24} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide max-w-2xl mx-auto w-full">
        <div ref={resultRef} className="bg-black p-2">
          
          <div className="mb-10 bg-gradient-to-br from-blue-900/20 to-purple-900/10 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden animate-slide-up">
             <div className="absolute -right-6 -top-6 text-blue-500/5 rotate-12"><Fingerprint size={120} /></div>
             <div className="flex items-center gap-2 mb-4 relative z-10">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">나의 커리어 DNA 요약</h3>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 relative z-10">
                <div className="sm:col-span-4 flex flex-col items-center justify-center bg-black/40 rounded-2xl p-4 border border-white/5 h-fit self-start shadow-inner">
                   <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Holland Code</span>
                   <span className="text-3xl font-black text-white tracking-widest">{hollandCode}</span>
                </div>
                <div className="sm:col-span-8">
                   <span className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Analyzed Strengths</span>
                   <p className="text-xs text-gray-300 leading-relaxed italic whitespace-pre-wrap break-keep">"{strengthsSummary}"</p>
                </div>
             </div>
          </div>

          {results ? (
            <div className="animate-fade-in">
              <div className="mb-10">
                <h2 className="text-3xl font-black mb-6 leading-tight break-keep">
                  검사 결과와 연결된<br/>
                  <span className="text-blue-400">심층 직무 분석</span>입니다.
                </h2>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex gap-4 items-start shadow-xl shadow-blue-900/10 animate-slide-up">
                  <Search className="text-blue-400 shrink-0 mt-1" size={20} />
                  <p className="text-sm text-gray-300 leading-relaxed font-light break-keep">{results.analysis}</p>
                </div>
              </div>

              <div className="grid gap-6 mb-10">
                {results.recommendations?.map((item: any, idx: number) => (
                  <div key={idx} className="group bg-[#111] border border-white/5 rounded-3xl p-6 hover:border-blue-500/30 transition-all duration-500 relative overflow-hidden shadow-2xl animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-gray-900 rounded-2xl border border-white/5 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-500 transition-all shadow-inner">
                          <Briefcase size={24} className="text-gray-500 group-hover:text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors truncate">{item.jobTitle}</h3>
                          <span className="text-[9px] text-blue-400 font-black bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-tighter">O*NET Match Confidence High</span>
                        </div>
                    </div>
                    <div className="space-y-4 relative z-10">
                        <div className="flex gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                          <UserCheck className="text-blue-400 shrink-0 mt-0.5" size={18} />
                          <div className="text-sm text-gray-300 leading-relaxed break-keep">
                              <span className="text-blue-400 font-black block mb-1 uppercase text-[10px]">매칭 포인트</span> 
                              {item.matchingPoint}
                          </div>
                        </div>
                        <div className="flex gap-3 p-4 bg-gray-900/50 rounded-2xl border border-white/5">
                          <ShieldCheck className="text-purple-400 shrink-0 mt-0.5" size={18} />
                          <div className="text-sm text-gray-300 leading-relaxed break-keep">
                              <span className="text-purple-400 font-black block mb-1 uppercase text-[10px]">강점 발휘 지점</span> 
                              {item.suitableTrait}
                          </div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 animate-fade-in">
               <AlertCircle size={48} className="text-gray-600 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-gray-400 mb-2">분석 결과를 불러올 수 없습니다.</h3>
               <button onClick={() => init()} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10">새로고침</button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent sticky bottom-0 border-t border-white/5 backdrop-blur-md z-20 shrink-0">
        <div className="max-w-2xl mx-auto">
          <button onClick={onNext} disabled={!results} className={`w-full py-5 font-black rounded-2xl flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-[0.98] ${!results ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-white text-black hover:bg-blue-600 hover:text-white shadow-blue-900/20'}`}>
            <span>로드맵 설정 단계로 이동</span>
            <ArrowRight size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
