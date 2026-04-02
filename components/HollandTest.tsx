
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, CheckCircle, ArrowLeft, X, Home, Briefcase, RefreshCw, Database, Sparkles, Search, Info, Lightbulb, Compass, UserCircle, Quote } from 'lucide-react';
import { saveHollandResult, upsertChatLog, fetchUserChatLogs, fetchOnetJobs, fetchOnetKnowledge, saveJobRecommendation, saveCareerPersona } from '../services/firebase';
import { ChatLog } from '../types';
import { recommendJobs, generateCareerPersona } from '../services/geminiService';

interface HollandTestProps {
  userName: string;
  onComplete: () => void;
  onBack: () => void;
  onClose: () => void;
}

interface Question {
  id: number;
  type: 'R' | 'I' | 'A' | 'S' | 'E' | 'C';
  text: string;
}

const questions: Question[] = [
  // Realistic (R)
  { id: 1, type: 'R', text: "기계 부품을 생산하는 기계를 조작하는 것을 선호한다." },
  { id: 2, type: 'R', text: "기계와 도구를 정비·유지하는 것을 선호한다." },
  { id: 3, type: 'R', text: "주택의 전기 시스템을 설계하는 것을 선호한다." },
  // Investigative (I)
  { id: 4, type: 'I', text: "분석과 실험을 수행하는 것을 선호한다." },
  { id: 5, type: 'I', text: "자연 현상을 설명하는 것을 선호한다." },
  { id: 6, type: 'I', text: "과학 논문과 책을 읽는 것을 선호한다." },
  // Artistic (A)
  { id: 7, type: 'A', text: "합창단에서 노래하는 것을 선호한다." },
  { id: 8, type: 'A', text: "청중 앞에서 예술 공연을 하는 것을 선호한다." },
  { id: 9, type: 'A', text: "연극 대본이나 시나리오 제작에 참여하는 것을 선호한다." },
  // Social (S)
  { id: 10, type: 'S', text: "다른 사람을 도울 수 있도록 항상 준비하는 것을 선호한다." },
  { id: 11, type: 'S', text: "개인, 집단, 지역 주민에게 건강과 웰빙에 관한 지도를 제공하는 것을 선호한다." },
  { id: 12, type: 'S', text: "지역사회와 마을에서 사회복지 서비스를 제공하는 것을 선호한다." },
  // Enterprising (E)
  { id: 13, type: 'E', text: "고객과 협상하는 것을 선호한다." },
  { id: 14, type: 'E', text: "제품과 서비스를 마케팅하는 것을 선호한다." },
  { id: 15, type: 'E', text: "사람들을 설득하여 상품을 구매하게 하는 것을 선호한다." },
  // Conventional (C)
  { id: 16, type: 'C', text: "중요한 문서와 파일을 보관·정리하는 것을 선호한다." },
  { id: 17, type: 'C', text: "회사의 회계 업무를 수행하는 것을 선호한다." },
  { id: 18, type: 'C', text: "데이터베이스에 정보를 입력하는 것을 선호한다." },
];

export const HollandTest: React.FC<HollandTestProps> = ({ userName, onComplete, onBack, onClose }) => {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [onetRecommendations, setOnetRecommendations] = useState<any>(null);
  const [personaData, setPersonaData] = useState<{ story: string } | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<number, boolean>>({});

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [showResult]);

  const handleScoreChange = (questionId: number, score: number) => {
    setScores(prev => ({ ...prev, [questionId]: score }));
  };

  const calculateResults = () => {
    const typeScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    questions.forEach(q => {
      typeScores[q.type] += (scores[q.id] || 0);
    });
    return typeScores;
  };

  const handleShowResult = async () => {
    setIsAnalyzing(true);
    const rawScores = calculateResults();
    const sortedTypes = Object.entries(rawScores).sort(([, a], [, b]) => b - a);
    const top3 = sortedTypes.slice(0, 3).map(([type]) => type).join('');
    
    try {
      await saveHollandResult(userName, { scores: rawScores, topCode: top3 });

      const [chatLogs, onetJobs, onetKnowledge] = await Promise.all([
        fetchUserChatLogs(userName),
        fetchOnetJobs(),
        fetchOnetKnowledge()
      ]);

      const strengthsLog = (chatLogs as ChatLog[]).find(l => l.type === 'STRENGTHS');
      const strengthsText = strengthsLog?.summary || "성실함과 노련한 문제 해결 능력";

      // AI 직무 추천 생성
      const recommendation = await recommendJobs(top3, strengthsText, onetJobs, onetKnowledge);
      
      // AI 페르소나 생성 및 명시적 저장
      const personaStory = await generateCareerPersona(userName, top3, strengthsText);
      await saveCareerPersona(userName, personaStory);

      setPersonaData({ story: personaStory });

      if (recommendation) {
        setOnetRecommendations(recommendation);
        await saveJobRecommendation(userName, recommendation);
      }

      const summary = `[홀랜드 검사 및 직무 탐색 결과]\n적성 코드: ${top3}\n추천 직무: ${recommendation?.recommendations.map((r:any) => r.jobTitle).join(', ')}`;
      await upsertChatLog(userName, 'HOLLAND_TEST', summary);

      setShowResult(true);
    } catch (err) {
      console.error("Result Analysis Error:", err);
      setShowResult(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isComplete = questions.every(q => scores[q.id] !== undefined);

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
        <div className="relative w-28 h-28 mb-10">
          <div className="absolute inset-0 border-[6px] border-purple-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-[6px] border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Sparkles className="text-purple-400 animate-pulse" size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-black mb-3">내담자님의 커리어 정체성을<br/>분석하고 있습니다.</h2>
        <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
          흥미 유형과 강점 데이터를 분석하여<br/>당신만의 독보적인 '페르소나'를 생성 중입니다.
        </p>
      </div>
    );
  }

  if (showResult) {
    const rawScores = calculateResults();
    const sortedTypes = Object.entries(rawScores).sort(([, a], [, b]) => b - a);
    const top3 = sortedTypes.slice(0, 3).map(([type]) => type).join('');
    const MAX_SCORE = 15;

    const typeNames: Record<string, string> = {
      R: "현실형", I: "탐구형", A: "예술형", S: "사회형", E: "진취형", C: "관습형"
    };

    const personaLines = personaData?.story.split('\n').filter(l => l.trim()) || [];
    const personaTitle = personaLines[0] || "지혜로운 전문가";
    const personaDescription = personaLines.slice(1).join(' ') || "";

    return (
      <div className="flex items-start justify-center min-h-screen p-4 animate-fade-in pt-24 pb-12">
        <div className="w-full max-w-4xl bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5 shrink-0">
             <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><Home size={24} /></button>
             <div className="text-white/80 font-medium">종합 진단 리포트</div>
             <div className="w-6" />
          </div>

          <div className="p-6 sm:p-10 flex flex-col gap-8">
            <div className="bg-gray-900 p-2 rounded-xl overflow-visible space-y-10">
              
              {/* --- Career Persona Section --- */}
              <section className="animate-slide-up">
                <div className="relative p-10 rounded-[3.5rem] bg-gradient-to-br from-[#1a1625] via-black to-[#0d0d15] border border-purple-500/30 overflow-hidden shadow-2xl">
                   <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                      <Compass size={240} className="text-purple-500" />
                   </div>
                   
                   <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 shadow-lg">
                         <UserCircle size={16} className="text-purple-400" />
                         <span className="text-[11px] font-black text-purple-300 uppercase tracking-widest">My Career Identity</span>
                      </div>
                      
                      <h2 className="text-3xl sm:text-4xl font-black mb-8 text-white tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-white">
                        "{personaTitle}"
                      </h2>
                      
                      <div className="max-w-xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm relative">
                         <div className="absolute top-4 left-4 opacity-10 text-purple-500"><Quote size={40} /></div>
                         <p className="text-[14px] sm:text-base text-white/90 leading-relaxed break-keep font-medium italic relative z-10">
                           {personaDescription}
                         </p>
                      </div>
                   </div>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col shadow-xl">
                    <div className="flex items-center gap-2 mb-6 text-purple-400">
                      <Compass size={20} />
                      <span className="text-xs uppercase font-black tracking-widest block">대표 적성 코드</span>
                    </div>
                    
                    <div className="flex flex-col items-center mb-8">
                      <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-indigo-300 to-pink-400 tracking-[0.2em]">{top3}</div>
                      <div className="mt-4 flex gap-2">
                        {top3.split('').map((char, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${i === 0 ? 'bg-purple-500 border-purple-400 text-white' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                            {typeNames[char]}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex-1">
                      <h4 className="text-xs font-black text-purple-300 mb-2 flex items-center gap-2">
                        <Lightbulb size={14} /> 코드 해석 가이드
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-relaxed break-keep">
                        대표 적성 코드는 {userName}님의 성향이 가장 강하게 나타나는 3가지 유형의 조합입니다.
                        첫 번째 글자({top3[0]})가 내담자님의 핵심 정체성을 나타냅니다.
                      </p>
                    </div>
                </div>

                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-xl">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                      <Sparkles size={14} className="text-yellow-500" /> 유형 점수 분포
                    </h3>
                    <div className="space-y-6">
                      {["R", "I", "A", "S", "E", "C"].map((type) => {
                        const score = rawScores[type as any] || 0;
                        const percent = (score / MAX_SCORE) * 100;
                        const isTop = top3.includes(type);
                        const isPrimary = top3[0] === type;
                        
                        return (
                          <div key={type} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className={`text-[10px] sm:text-xs font-black shrink-0 ${isTop ? 'text-purple-400' : 'text-gray-600'}`}>
                                {type} {typeNames[type]}
                              </div>
                              <div className="text-[10px] text-gray-600 font-bold text-right">{score} / {MAX_SCORE}</div>
                            </div>
                            <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${isPrimary ? 'bg-gradient-to-r from-purple-500 to-pink-500' : isTop ? 'bg-indigo-500' : 'bg-gray-700'}`} 
                                style={{ width: `${percent}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-[2.5rem] p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-black text-white flex items-center gap-2">
                     <Briefcase size={24} className="text-blue-400" />
                     <span>{userName}님을 위한 전문 매칭 직무</span>
                   </h3>
                   <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 uppercase tracking-tighter italic">O*NET Data Sync</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {onetRecommendations ? onetRecommendations.recommendations?.slice(0, 4).map((item: any, idx: number) => {
                    const isExpanded = expandedJobs[idx];
                    return (
                      <div key={idx} className="bg-gray-800/40 p-6 rounded-3xl border border-white/5 flex flex-col gap-3 group hover:border-blue-500/40 transition-all shadow-inner">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-sm font-black border border-blue-500/10">{idx + 1}</div>
                            <h4 className="font-bold text-white group-hover:text-blue-300 transition-colors text-lg">{item.jobTitle}</h4>
                         </div>
                         <p className={`text-sm text-gray-400 leading-relaxed italic ${isExpanded ? '' : 'line-clamp-3'}`}>"{item.matchingPoint}"</p>
                         <button 
                           onClick={() => setExpandedJobs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                           className="text-[10px] font-black text-blue-400/60 hover:text-blue-400 transition-colors uppercase tracking-widest mt-auto pt-2 flex items-center gap-1"
                         >
                           {isExpanded ? '간략히 보기' : '전체보기'}
                         </button>
                      </div>
                    );
                  }) : (
                    <div className="col-span-2 py-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                       <p className="text-sm text-gray-600">추천 직무를 분석하고 있습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
              <button onClick={onComplete} className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black transition-all shadow-2xl shadow-purple-900/40 w-full sm:w-auto justify-center active:scale-95 group">
                <span>목표 설정 단계로 이동</span>
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center min-h-screen p-4 animate-fade-in pt-24 pb-12">
      <div className="w-full max-w-3xl bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-8 py-6 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
            <div>
              <h2 className="text-xl font-bold text-white">직업 흥미 탐색 (RIASEC)</h2>
              <p className="text-sm text-gray-400">각 문항이 자신과 얼마나 일치하는지 선택해주세요.</p>
            </div>
           </div>
           <div className="text-xs font-mono text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full whitespace-nowrap">
             {Object.keys(scores).length} / {questions.length}
           </div>
        </div>

        <div className="p-8 overflow-y-auto scrollbar-hide space-y-8 flex-1">
          {questions.map((q) => (
            <div key={q.id}>
              <p className="text-lg text-gray-200 mb-4 font-medium">
                <span className="text-purple-400 mr-2">Q{q.id}.</span>
                {q.text}
              </p>
              <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleScoreChange(q.id, value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
                      ${scores[q.id] === value 
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                  >
                    <span className="text-lg font-bold mb-1">{value}</span>
                    <span className="text-[10px] sm:text-xs opacity-70 whitespace-nowrap text-center">
                      {value === 1 ? "전혀 아니다" : value === 2 ? "아니다" : value === 3 ? "보통이다" : value === 4 ? "그렇다" : "매우 그렇다"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end shrink-0">
          <button
            onClick={handleShowResult}
            disabled={!isComplete}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all
              ${isComplete ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg cursor-pointer' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
          >
            <CheckCircle size={18} />
            <span>결과 분석하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
