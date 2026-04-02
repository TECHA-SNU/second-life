
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Home, ArrowRight, RotateCcw, Award, Star, Heart, Shield, RefreshCw, Lightbulb, Compass, Target, Quote, Sparkles, Fingerprint, Info, Briefcase, ListOrdered, ChevronRight, Search } from 'lucide-react';
import { upsertChatLog, saveValuePriorities, fetchGoalRoadmap } from '../services/firebase';
import { generateEncouragement, generateValueExpertComment } from '../services/geminiService';

interface ValueItem {
  id: string;
  label: string;
  description: string;
  longDesc: string; 
}

interface ValuePyramidProps {
  userName: string;
  onClose: () => void;
  onNext: () => void;
}

const VALUES_LIST: ValueItem[] = [
  { id: 'achievement', label: '성취', description: '스스로 목표를 세우고 이를 달성함', longDesc: '인생 후반전의 성취는 타인의 평가가 아닌, 나만의 기준을 완수하는 데서 옵니다.' },
  { id: 'service', label: '봉사', description: '남을 위해 일함', longDesc: '수십 년간 쌓아온 노하우를 사회에 환원하며 공헌하는 삶입니다.' },
  { id: 'individual', label: '개별 활동', description: '혼자 일하는 것을 중시', longDesc: '조직의 소음에서 벗어나 오롯이 나만의 전문성에 집중하는 환경을 원합니다.' },
  { id: 'stability', label: '직업 안정', description: '안정적인 종사 여부를 중시', longDesc: '급격한 변화보다는 예측 가능한 환경에서 꾸준히 기여하는 것을 선호합니다.' },
  { id: 'change', label: '변화지향', description: '업무가 변화 가능함을 중시', longDesc: '정체된 삶을 거부하고 끊임없이 새로운 자극을 찾습니다.' },
  { id: 'balance', label: '몸과 마음의 여유', description: '신체적/정신적 여유를 중시', longDesc: '성공보다 중요한 것은 건강과 평온함입니다.' },
  { id: 'influence', label: '영향력 발휘', description: '타인에 대한 영향력을 중시', longDesc: '주변의 성장을 돕고 긍정적인 변화를 이끄는 리더로서의 삶입니다.' },
  { id: 'knowledge', label: '지식추구', description: '새로운 지식을 얻는 것을 중시', longDesc: '배움에는 끝이 없음을 실천하는 삶입니다.' },
  { id: 'patriotism', label: '애국', description: '국가에 도움이 되는 것을 중시', longDesc: '공익적 가치가 큰 일에서 사명감을 느끼며 헌신할 준비가 되어 있습니다.' },
  { id: 'autonomy', label: '자율성', description: '자율적으로 업무를 해나가는 것', longDesc: '나만의 철학과 방식으로 일할 수 있는 독립적인 환경이 필수적입니다.' },
  { id: 'money', label: '금전적 보상', description: '금전적 보상을 중시', longDesc: '경제적 자립은 노후의 존엄을 지키는 기반입니다.' },
  { id: 'recognition', label: '인정', description: '타인으로부터 인정받는 것', longDesc: '사회적 지위와 평판은 그간 살아온 삶의 증명입니다.' },
  { id: 'indoor', label: '실내활동', description: '쾌적한 실내 업무를 선호', longDesc: '안정적이고 정적인 공간에서의 효율을 선호합니다.' },
];

export const ValuePyramid: React.FC<ValuePyramidProps> = ({ userName, onClose, onNext }) => {
  const [selectedValues, setSelectedValues] = useState<(ValueItem | null)[]>(new Array(6).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [userVision, setUserVision] = useState<string>('');
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  // 피드백 관련 상태
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [valueExpertComment, setValueExpertComment] = useState<string>('');
  
  const resultRef = useRef<HTMLDivElement>(null);

  const loadContext = async () => {
    if (!userName) return;
    setIsLoadingContext(true);
    try {
      const roadmap = await fetchGoalRoadmap(userName);
      if (roadmap && roadmap.vision) {
        setUserVision(roadmap.vision);
      }
    } catch (err) {
      console.error("[ValuePyramid] Context load error:", err);
    } finally {
      setIsLoadingContext(false);
    }
  };

  useEffect(() => {
    if (userName) {
      loadContext();
    }
  }, [userName]);

  const handleSelectValue = (value: ValueItem) => {
    if (selectedValues.some(s => s?.id === value.id)) return;
    const emptyIndex = selectedValues.findIndex(s => s === null);
    if (emptyIndex !== -1) {
      const newValues = [...selectedValues];
      newValues[emptyIndex] = value;
      setSelectedValues(newValues);
    }
  };

  const handleRemoveValue = (index: number) => {
    const newValues = [...selectedValues];
    newValues[index] = null;
    setSelectedValues(newValues);
  };

  const isComplete = selectedValues.every(s => s !== null);

  // 가치관 확정 시 피드백 및 심층 해석 생성 후 즉시 저장
  const handleConfirmSelection = async () => {
    if (!isComplete) return;
    
    setIsGeneratingFeedback(true);
    try {
      const valuesStr = selectedValues.map((v, i) => `${i+1}순위: ${v?.label}`).join(", ");
      
      const valuesForAi = selectedValues.filter(v => v !== null).map(v => ({
        label: v!.label,
        description: v!.longDesc
      }));
      
      const [encouragement, expertComment] = await Promise.all([
        generateEncouragement("가치관 우선순위 설정", valuesStr),
        generateValueExpertComment(userName, valuesForAi)
      ]);

      setFeedbackMessage(encouragement);
      setValueExpertComment(expertComment);

      // [핵심 추가] 분석이 완료된 시점에 즉시 Firebase에 저장
      // 1. 구조화된 전용 데이터 영역에 저장
      const structuredValues = selectedValues.filter(v => v !== null).map((v, i) => ({
        rank: i + 1,
        id: v!.id,
        label: v!.label,
        description: v!.description
      }));
      await saveValuePriorities(userName, structuredValues, expertComment);
      
      // 2. 상담 이력(로그) 영역에 통합 저장
      const logSummary = `[나의 가치관 우선순위]\n${selectedValues.map((v, i) => `${i+1}위: ${v?.label}`).join('\n')}\n\n[코치의 격려]\n${encouragement}\n\n[전문가 심층 해석]\n${expertComment}`;
      await upsertChatLog(userName, 'VALUE_PRIORITY', logSummary);

    } catch (error) {
      console.error("Feedback error:", error);
      setFeedbackMessage("선택하신 가치관들은 내담자님이 앞으로 걸어갈 길에 든든한 버팀목이 될 것입니다. 정말 의미 있는 선택입니다.");
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const handleConfirmFeedback = () => {
    setFeedbackMessage(null);
    setShowResult(true);
  };

  const handleFinalNext = () => {
    onNext();
  };

  if (isGeneratingFeedback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Heart className="w-8 h-8 text-indigo-400 animate-pulse fill-indigo-400/20" />
          </div>
        </div>
        <p className="text-xl font-bold text-center leading-relaxed">내담자님의 소중한 가치관을<br/>깊이 있게 분석하고 있습니다...</p>
      </div>
    );
  }

  if (feedbackMessage) {
    return (
      <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
        <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <button onClick={() => setFeedbackMessage(null)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
          <div className="flex items-center gap-2">
             <Heart size={18} className="text-indigo-400" />
             <h1 className="text-xl font-sans font-bold">코치의 따뜻한 한마디</h1>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full text-center">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-indigo-900/30">
            <Sparkles className="text-indigo-300 w-8 h-8" />
          </div>
          
          <div className="bg-gradient-to-br from-[#12122b] to-black border border-indigo-500/20 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl animate-slide-up max-h-[50vh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-4 left-4 text-indigo-500/10"><Quote size={40} /></div>
            <p className="text-lg sm:text-xl text-gray-100 leading-relaxed font-sans font-bold break-keep relative z-10">
              "{feedbackMessage}"
            </p>
          </div>

          <p className="mt-10 text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.2em]">Values define your authentic career</p>
        </div>

        <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent sticky bottom-0 z-50">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleConfirmFeedback}
              className="w-full py-5 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95"
            >
              <span>가치관 분석 리포트 보기</span>
              <ArrowRight size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
        <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
          <button onClick={() => setShowResult(false)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">나의 가치관 리포트</h1>
          <div className="w-8" />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-8 max-w-2xl mx-auto w-full">
           <div ref={resultRef} className="bg-black p-2">
             <div className="text-center mb-10">
               <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-full mb-4"><Star className="w-8 h-8 text-purple-300 animate-pulse" fill="currentColor" /></div>
               <h2 className="text-3xl font-black mb-2 tracking-tight">{userName}님의 커리어 나침반</h2>
               <p className="text-gray-500 text-sm">성공적인 제2의 인생을 위한 6가지 핵심 가치관입니다.</p>
             </div>
             
             <div className="space-y-4 mb-10">
                {selectedValues.map((val, idx) => (
                  <div key={idx} className={`bg-[#111] border rounded-3xl p-6 flex items-start gap-5 ${idx === 0 ? 'border-purple-500/40 bg-purple-900/10' : 'border-white/5'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black ${idx === 0 ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500'}`}>{idx + 1}</div>
                    <div>
                       <h3 className="text-xl font-black text-white mb-2">{val?.label}</h3>
                       <p className="text-sm text-gray-400 leading-relaxed">{val?.longDesc}</p>
                    </div>
                  </div>
                ))}
             </div>

             <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 mb-12 animate-fade-in shadow-xl shadow-indigo-900/10">
                <div className="flex items-center gap-2 mb-3 text-indigo-400 font-black text-[11px] uppercase tracking-[0.2em]">
                  <Sparkles size={14} />
                  <span>진로심리상담 전문가의 조언 및 해석</span>
                </div>
                <div className="relative">
                  <div className="absolute -left-2 -top-2 opacity-10 text-indigo-500"><Quote size={20} /></div>
                  <p className="text-sm text-gray-300 leading-relaxed italic break-keep relative z-10 px-4 whitespace-pre-wrap">
                    {valueExpertComment}
                  </p>
                </div>
             </div>
           </div>
        </div>
        <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent sticky bottom-0 z-50 border-t border-white/5 flex justify-center">
          <button onClick={handleFinalNext} className="w-full max-w-md py-5 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-all shadow-2xl active:scale-95">
            행동 의도 설정 단계로 이동 <ArrowRight size={22} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
        <div className="flex items-center gap-2">
           <Compass size={18} className="text-purple-400" />
           <h1 className="text-lg font-black tracking-tight">가치관 분석</h1>
        </div>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6 sm:px-6 max-w-3xl mx-auto w-full flex flex-col">
        <div className="mb-8 animate-slide-up">
           <div className="bg-gradient-to-br from-[#1a1625] to-black border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute -right-6 -bottom-6 opacity-5 rotate-12"><Target size={180} /></div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-purple-500/20 rounded-xl"><Lightbulb className="text-purple-400 w-5 h-5" /></div>
                 <h2 className="text-xl font-black text-white leading-tight">설정한 비전과 가치관 연결</h2>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed break-keep mb-4">어떤 일을 하느냐보다, 그 일이 나의 어떤 가치를 충족시켜 주느냐가 지속 가능한 커리어를 결정합니다.</p>
              
              {isLoadingContext ? (
                <div className="animate-pulse flex items-center gap-2 text-gray-700 text-[10px] font-bold">
                   <RefreshCw size={12} className="animate-spin" />
                   비전 불러오는 중...
                </div>
              ) : userVision ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-2">
                   <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest block mb-1">설정한 비전</span>
                   <p className="text-xs text-white font-bold leading-relaxed italic">"{userVision}"</p>
                </div>
              ) : null}
           </div>
        </div>

        <div className="text-center mb-10 mt-6">
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 mb-4 shadow-lg shadow-purple-900/10">
              <ListOrdered size={12} />
              <span>Priority Setting</span>
           </div>
          <h2 className="text-2xl font-black mb-2 text-white">가치관 우선순위 정하기</h2>
          <p className="text-gray-400 text-sm leading-relaxed">아래 목록에서 가장 중요한 6가지를<br/><strong className="text-purple-300">순서대로</strong> 선택해주세요.</p>
        </div>

        <div className="space-y-3 mb-12 max-w-md mx-auto w-full">
           {selectedValues.map((val, idx) => (
             <div key={idx} className={`relative flex items-center gap-4 p-5 rounded-[2rem] border transition-all duration-500 ${val ? 'bg-purple-600/10 border-purple-500/40 shadow-xl scale-[1.02]' : 'bg-white/5 border-dashed border-white/10'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm shadow-inner ${val ? 'bg-purple-600 text-white shadow-purple-900/40' : 'bg-gray-800 text-gray-700'}`}>{idx + 1}</div>
                <div className="flex-1">
                   {val ? (
                     <div className="animate-fade-in">
                       <span className="font-black text-sm text-white block">{val.label}</span>
                       <span className="text-[10px] text-gray-500 truncate block max-w-[200px]">{val.description}</span>
                     </div>
                   ) : (
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">{idx + 1}순위 가치 선택</span>
                   )}
                </div>
                {val && <button onClick={() => handleRemoveValue(idx)} className="p-2 text-gray-500 hover:text-red-400 transition-colors bg-white/5 rounded-xl"><RotateCcw size={16} /></button>}
             </div>
           ))}
        </div>

        <div className="bg-[#111] rounded-[2.5rem] p-8 border border-white/10 mb-32 shadow-2xl relative">
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-2">
                <Heart size={14} className="text-purple-400" />
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">선택 가능한 가치관</h3>
             </div>
             <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">{selectedValues.filter(s => s !== null).length} / 6</span>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {VALUES_LIST.map((val) => {
              const isSelected = selectedValues.some(s => s?.id === val.id);
              return (
                <button
                  key={val.id}
                  onClick={() => handleSelectValue(val)}
                  disabled={isSelected || isComplete}
                  className={`px-5 py-3.5 rounded-2xl text-xs font-bold border transition-all duration-300 active:scale-90
                    ${isSelected ? 'bg-gray-800 text-gray-700 border-transparent opacity-30 cursor-default' 
                      : isComplete ? 'bg-gray-900 text-gray-600 border-transparent opacity-20 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-purple-600 hover:text-white border-white/10 hover:border-purple-500 shadow-xl'
                    }`}
                >
                  {val.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-t from-black via-black/95 fixed bottom-0 left-0 right-0 z-50 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleConfirmSelection}
            disabled={!isComplete}
            className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-[0.98] ${isComplete ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-900/40 transform hover:-translate-y-1' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
          >
            <span>가치관 우선순위 확정</span> <ArrowRight size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};
