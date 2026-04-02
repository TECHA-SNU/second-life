
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Edit2, X, Check, ArrowRight, Flag, Map, Mountain, Star, Calendar, Compass, Target, Diamond, ChevronRight, RefreshCw, Sprout, Award, Info, Sparkles, Briefcase, Search, Home, Heart, Quote, Clock, CalendarClock, History, AlertTriangle, MessageCircle, Bot, UserCircle, Fingerprint } from 'lucide-react';
import { saveGoalRoadmap, fetchGoalRoadmap, fetchLatestHollandResult, fetchUserChatLogs, fetchLatestJobRecommendation, upsertChatLog, fetchCareerPersona } from '../services/firebase';
import { ChatLog } from '../types';
import { generateEncouragement, generateRoadmapExpertComment, generateChallengeAdvice } from '../services/geminiService';

interface Goal {
  id: number;
  text: string;
  timeframe: '1w' | '1m' | '6m';
  isCompleted: boolean;
}

interface ProfileSummary {
  holland: string;
  strengths: string;
  recommendedJobs: string[];
  fullJobDetails?: any[];
  persona?: string; 
}

enum Step {
  VISION = 0,
  MISSION = 1,
  VALUES = 2,
  GOALS = 3,
  RESULT = 4
}

interface GoalManagerProps {
  userName: string;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
}

export const GoalManager: React.FC<GoalManagerProps> = ({ userName, onClose, onBack, onNext }) => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.VISION);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [coreValues, setCoreValues] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [challenges, setChallenges] = useState('');
  
  const [input1w, setInput1w] = useState('');
  const [input1m, setInput1m] = useState('');
  const [input6m, setInput6m] = useState('');
  
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [expertComment, setExpertComment] = useState<string>('');
  const [challengeAdvice, setChallengeAdvice] = useState<string>('');
  
  const resultRef = useRef<HTMLDivElement>(null);

  const canProceed = () => {
    if (currentStep === Step.VISION) return vision.trim().length > 0;
    if (currentStep === Step.MISSION) return mission.trim().length > 0;
    if (currentStep === Step.VALUES) return coreValues.trim().length > 0;
    if (currentStep === Step.GOALS) {
      const has1w = goals.some(g => g.timeframe === '1w');
      const has1m = goals.some(g => g.timeframe === '1m');
      const has6m = goals.some(g => g.timeframe === '6m');
      return has1w && has1m && has6m && challenges.trim().length > 0;
    }
    return true;
  };

  useEffect(() => {
    loadUserContext();
  }, []);

  const loadUserContext = async () => {
    setLoadingProfile(true);
    try {
      const [holland, chatLogs, jobData, savedPersona, roadmap] = await Promise.all([
        fetchLatestHollandResult(userName),
        fetchUserChatLogs(userName),
        fetchLatestJobRecommendation(userName),
        fetchCareerPersona(userName),
        fetchGoalRoadmap(userName)
      ]);
      
      const strengthsLog = (chatLogs as ChatLog[]).find(l => l.type === 'STRENGTHS');
      const strengthsText = strengthsLog?.summary || "성실함과 노련한 문제 해결 능력";
      const hollandCode = holland?.topCode || "S";

      // 로드맵 데이터가 있으면 상태 초기화
      if (roadmap) {
        setVision(roadmap.vision || '');
        setMission(roadmap.mission || '');
        setCoreValues(roadmap.values || '');
        setChallenges(roadmap.challenges || '');
        
        if (roadmap.goals) {
          const loadedGoals: Goal[] = [];
          let nextId = 1;
          
          if (roadmap.goals['1w']) {
            roadmap.goals['1w'].forEach((g: string) => {
              loadedGoals.push({ id: nextId++, text: g, timeframe: '1w', isCompleted: false });
            });
          }
          if (roadmap.goals['1m']) {
            roadmap.goals['1m'].forEach((g: string) => {
              loadedGoals.push({ id: nextId++, text: g, timeframe: '1m', isCompleted: false });
            });
          }
          if (roadmap.goals['6m']) {
            roadmap.goals['6m'].forEach((g: string) => {
              loadedGoals.push({ id: nextId++, text: g, timeframe: '6m', isCompleted: false });
            });
          }
          setGoals(loadedGoals);
        }
        
        if (roadmap.expertComment) setExpertComment(roadmap.expertComment);
        if (roadmap.challengeAdvice) setChallengeAdvice(roadmap.challengeAdvice);
      }

      // 저장된 페르소나를 우선 사용 (동일성 보장)
      let personaStory = savedPersona?.story;
      
      // 만약 저장된 페르소나가 없다면, 자기이해 단계의 강점 요약을 기반으로 임시 페르소나 구성
      if (!personaStory && strengthsLog) {
        personaStory = `준비된 전문가\n${strengthsText}`;
      } else if (!personaStory) {
        personaStory = "내담자님은 자신만의 길을 걷는 준비된 전문가입니다.";
      }
      
      setProfileSummary({
        holland: hollandCode,
        strengths: strengthsText,
        recommendedJobs: jobData?.jobs || [],
        fullJobDetails: jobData?.fullDetails || [],
        persona: personaStory
      });
    } catch (err) {
      console.error("Context load error:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const syncGoalSettingToFirebase = async (encouragement: string) => {
    try {
      let logContent = "[커리어 목표 설정 및 코칭 기록]\n\n";
      logContent += `[비전] ${vision}\n[미션] ${mission}\n[가치] ${coreValues}\n\n`;
      
      const g1w = goals.filter(g => g.timeframe === '1w').map(g => g.text).join(', ');
      const g1m = goals.filter(g => g.timeframe === '1m').map(g => g.text).join(', ');
      const g6m = goals.filter(g => g.timeframe === '6m').map(g => g.text).join(', ');
      
      logContent += `[1주일 목표] ${g1w || '없음'}\n[1개월 목표] ${g1m || '없음'}\n[6개월 목표] ${g6m || '없음'}\n`;
      logContent += `[극복 요인] ${challenges || '없음'}\n\n`;
      logContent += `[코치 피드백]\n${encouragement}\n`;
      
      await upsertChatLog(userName, 'GOAL_SETTING', logContent.trim());
    } catch (e) {
      console.warn("Goal setting sync error:", e);
    }
  };

  const handleInternalNext = async () => {
    if (currentStep === Step.VISION) {
      if (!vision.trim()) return alert("비전을 입력해주세요.");
      await saveGoalRoadmap(userName, { vision });
    }
    if (currentStep === Step.MISSION) {
      if (!mission.trim()) return alert("미션을 입력해주세요.");
      await saveGoalRoadmap(userName, { vision, mission });
    }
    if (currentStep === Step.VALUES) {
      if (!coreValues.trim()) return alert("핵심 가치를 입력해주세요.");
      await saveGoalRoadmap(userName, { vision, mission, values: coreValues });
    }
    
    if (currentStep === Step.GOALS) {
        const has1w = goals.some(g => g.timeframe === '1w');
        const has1m = goals.some(g => g.timeframe === '1m');
        const has6m = goals.some(g => g.timeframe === '6m');
        
        if (!has1w || !has1m || !has6m) {
          return alert("1주일, 1개월, 6개월 목표를 각각 최소 하나씩 등록해주세요.");
        }
        
        if (!challenges.trim()) {
          return alert("목표 달성에 예상되는 장애물과 극복 방안을 입력해주세요.");
        }
        
        setIsGeneratingFeedback(true);
        try {
          const g1w = goals.filter(g => g.timeframe === '1w').map(g => g.text).join(", ");
          const g1m = goals.filter(g => g.timeframe === '1m').map(g => g.text).join(", ");
          const g6m = goals.filter(g => g.timeframe === '6m').map(g => g.text).join(", ");
          
          const combinedAnswers = `비전: ${vision}, 미션: ${mission}, 핵심가치: ${coreValues}, 1주일 목표: ${g1w}, 1개월 목표: ${g1m}, 6개월 목표: ${g6m}, 극복 요인: ${challenges}`;
          const encouragement = await generateEncouragement("단계별 커리어 로드맵 설계", combinedAnswers);
          
          setFeedbackMessage(encouragement);
          
          // 로드맵 데이터 미리 저장 (중도 이탈 대비)
          const roadmapData = {
            vision,
            mission,
            values: coreValues,
            challenges: challenges,
            goals: {
              '1w': goals.filter(g => g.timeframe === '1w').map(g => g.text),
              '1m': goals.filter(g => g.timeframe === '1m').map(g => g.text),
              '6m': goals.filter(g => g.timeframe === '6m').map(g => g.text)
            }
          };
          await saveGoalRoadmap(userName, roadmapData);
          
          await syncGoalSettingToFirebase(encouragement);
        } catch (error) {
          console.error(error);
          const fallbackMsg = "체계적인 시간 계획이 돋보입니다. 내담자님의 인생 2막이 매우 구체적으로 그려지고 있네요.";
          setFeedbackMessage(fallbackMsg);
          await syncGoalSettingToFirebase(fallbackMsg);
        } finally {
          setIsGeneratingFeedback(false);
        }
        return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleConfirmFeedback = async () => {
    setFeedbackMessage(null);
    setIsGeneratingFeedback(true); 
    
    try {
      const roadmapData = {
        vision,
        mission,
        values: coreValues,
        challenges: challenges,
        goals: {
          '1w': goals.filter(g => g.timeframe === '1w').map(g => g.text),
          '1m': goals.filter(g => g.timeframe === '1m').map(g => g.text),
          '6m': goals.filter(g => g.timeframe === '6m').map(g => g.text)
        }
      };
      
      const [comment, advice] = await Promise.all([
        generateRoadmapExpertComment(userName, {
          ...roadmapData,
          goals: goals.map(g => g.text)
        }),
        challenges ? generateChallengeAdvice(userName, challenges) : Promise.resolve('')
      ]);

      setExpertComment(comment);
      setChallengeAdvice(advice);

      await saveGoalRoadmap(userName, { 
        ...roadmapData, 
        expertComment: comment,
        challengeAdvice: advice 
      });

      let finalLog = "[커리어 로드맵 완성본]\n\n";
      finalLog += `[비전] ${vision}\n[미션] ${mission}\n[가치] ${coreValues}\n\n`;
      finalLog += `[전문가 격려]\n${comment}\n\n`;
      if (advice) finalLog += `[극복 솔루션]\n${advice}`;
      
      await upsertChatLog(userName, 'GOAL_SETTING', finalLog);
      
      setCurrentStep(Step.RESULT);
    } catch (err) {
      console.error(err);
      setExpertComment("내담자님의 정성이 가득 담긴 로드맵입니다. 당신의 도전을 응원합니다.");
      setCurrentStep(Step.RESULT);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const handleInternalBack = () => {
    if (feedbackMessage) { setFeedbackMessage(null); return; }
    if (currentStep === Step.VISION) onClose();
    else setCurrentStep(prev => prev - 1);
  };

  const handleAddGoal = (timeframe: '1w' | '1m' | '6m', text: string) => {
    if (!text.trim()) return;
    const newId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) + 1 : 1;
    setGoals([...goals, { id: newId, text, timeframe, isCompleted: false }]);
    
    if (timeframe === '1w') setInput1w('');
    else if (timeframe === '1m') setInput1m('');
    else setInput6m('');
  };

  const handleRemoveGoal = (id: number) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const handleEditGoal = (id: number, timeframe: '1w' | '1m' | '6m', text: string) => {
    if (timeframe === '1w') setInput1w(text);
    else if (timeframe === '1m') setInput1m(text);
    else if (timeframe === '6m') setInput6m(text);
    handleRemoveGoal(id);
  };

  if (isGeneratingFeedback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <div className="relative w-24 h-24 mb-10">
          <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Target size={32} className="text-emerald-500 animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-bold text-gray-400 text-center animate-fade-in">내담자님의 소중한 목표를<br/>심도 있게 분석하고 있습니다...</p>
      </div>
    );
  }

  if (feedbackMessage) {
    return (
      <div className="flex flex-col h-screen bg-black text-white font-sans animate-fade-in overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between bg-black/50 border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
          <button onClick={handleInternalBack} className="p-2 text-gray-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
          <h1 className="text-xl font-sans font-bold">코치의 응원</h1>
          <button onClick={handleConfirmFeedback} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ArrowRight size={24} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
          {/* 코치 캐릭터 추가 */}
          <div className="mb-6 relative">
            <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
            <img 
              src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f331/512.png" 
              alt="Coach" 
              className="w-32 h-32 relative z-10 drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black p-2 rounded-full shadow-lg z-20 animate-bounce">
              <MessageCircle size={20} fill="currentColor" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0d1a15] to-black border border-emerald-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden max-h-[50vh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-4 left-4 text-emerald-500/10"><Quote size={60} /></div>
            {/* 폰트를 font-cute로 변경하고 크기 조정 */}
            <p className="text-lg text-gray-100 font-bold font-sans break-keep leading-relaxed relative z-10">
              "{feedbackMessage}"
            </p>
          </div>
          
          <button onClick={handleConfirmFeedback} className="mt-10 w-full py-5 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-emerald-900/10">
            <span>종합 로드맵 확인하기</span>
            <ArrowRight size={22} />
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === Step.RESULT) {
    const goals1w = goals.filter(g => g.timeframe === '1w');
    const goals1m = goals.filter(g => g.timeframe === '1m');
    const goals6m = goals.filter(g => g.timeframe === '6m');

    return (
      <div className="flex flex-col h-screen bg-black text-white animate-fade-in">
        <div className="px-6 py-4 flex items-center justify-between bg-black/50 border-b border-white/5 sticky top-0 z-50 backdrop-blur-md">
          <button onClick={() => setCurrentStep(Step.GOALS)} className="text-gray-400"><ArrowLeft size={24} /></button>
          <h1 className="text-lg font-bold">커리어 로드맵</h1>
          <button onClick={onClose} className="text-gray-400"><Home size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-8 max-w-2xl mx-auto w-full">
           <div ref={resultRef} className="bg-black space-y-8 pb-10">
             <div className="text-center">
               <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/20 rounded-full mb-3">
                  <Flag className="text-emerald-400" size={24} />
               </div>
               <h2 className="text-3xl font-black mb-1">{userName}님의 미래 지도</h2>
               <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Time-structured Career Roadmap</p>
             </div>

             <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Award size={100} /></div>
                <div className="flex items-center gap-3 mb-3">
                   <img 
                     src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f331/512.png" 
                     alt="Coach" 
                     className="w-8 h-8 relative"
                     referrerPolicy="no-referrer"
                   />
                   <div className="text-purple-400 font-black text-[10px] uppercase tracking-widest">전문 코치 코멘트</div>
                </div>
                <p className="text-xl text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">"{expertComment}"</p>
             </div>

             <div className="space-y-4">
                <ResultCard title="진로 비전" icon={Mountain} color="text-purple-400" content={vision} label="10년 후의 내 모습" />
                <ResultCard title="진로 미션" icon={Compass} color="text-blue-400" content={mission} label="일을 하는 이유" />
                <ResultCard title="핵심 가치" icon={Star} color="text-yellow-400" content={coreValues} label="내가 지키고 싶은 원칙" />
             </div>

             <div className="bg-[#111] border border-white/5 rounded-[3rem] p-8 space-y-10 shadow-2xl">
                <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                   <Target size={20} className="text-emerald-400" />
                   <h3 className="text-lg font-black text-white uppercase tracking-tighter">Action Timeline</h3>
                </div>

                <TimeframeResult title="1주일 이내 실천" timeframe="1 WEEK" icon={Clock} goals={goals1w} />
                <TimeframeResult title="1개월 이내 실천" timeframe="1 MONTH" icon={CalendarClock} goals={goals1m} />
                <TimeframeResult title="6개월 이내 실천" timeframe="6 MONTHS" icon={History} goals={goals6m} />
                
                {challenges && (
                   <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex items-center gap-2 mb-1 text-rose-400">
                         <AlertTriangle size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">극복해야 할 요인</span>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5">
                        <p className="text-sm text-gray-300 leading-relaxed italic mb-4">"{challenges}"</p>
                        
                        {challengeAdvice && (
                          <div className="pt-4 border-t border-white/5 animate-fade-in">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1 bg-rose-500/20 rounded-md">
                                <Bot size={12} className="text-rose-300" />
                              </div>
                              <span className="text-[10px] font-bold text-rose-300 uppercase tracking-tight">Gemini의 극복 솔루션</span>
                            </div>
                            <p className="text-[12px] text-gray-400 leading-relaxed break-keep font-medium">
                              {challengeAdvice}
                            </p>
                          </div>
                        )}
                      </div>
                   </div>
                )}
             </div>
           </div>

           <div className="flex flex-col gap-4 mb-20">

              <button onClick={onNext} className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-purple-900/20 active:scale-95 transition-all">
                가치관 분석으로 이동 <ArrowRight size={22} />
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
        <button onClick={handleInternalBack} className="p-2 text-gray-400 hover:text-white transition-colors">
          {currentStep === Step.VISION ? <Home size={24} /> : <ArrowLeft size={24} />}
        </button>
        <div className="flex items-center gap-2">
           <Sprout size={18} className="text-green-500" />
           <h1 className="text-lg font-black tracking-tight">목표설정</h1>
        </div>
        <div className="w-8" /> 
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-md mx-auto w-full flex flex-col scrollbar-hide">
        {currentStep === Step.VISION && <InputStep title="나의 비전" icon={Mountain} value={vision} onChange={setVision} placeholder="예: 은퇴한 시니어들을 위한 디지털 교육 전문가로서 커뮤니티 센터를 운영하고 싶다." desc="10년 후, 당신은 어떤 모습인가요?" stepNum={1} summary={profileSummary} />}
        {currentStep === Step.MISSION && <InputStep title="나의 미션" icon={Compass} value={mission} onChange={setMission} placeholder="예: 정보 소외 계층이 디지털 세상과 연결되어 더 풍요로운 삶을 누리도록 돕는다." desc="당신은 무엇을 위해 일하고 싶나요?" stepNum={2} color="text-blue-400" summary={profileSummary} />}
        {currentStep === Step.VALUES && <InputStep title="핵심 가치" icon={Diamond} value={coreValues} onChange={setCoreValues} placeholder="예: 봉사, 성장, 존중" desc="어떤 원칙을 지키며 살고 싶나요?" stepNum={3} color="text-yellow-400" summary={profileSummary} />}
        
        {currentStep === Step.GOALS && (
          <div className="animate-fade-in pb-32">
            <div className="flex justify-between items-end mb-6">
              <span className="text-emerald-400 text-sm font-bold">Step 4 <span className="text-gray-500 font-normal">/ 4</span></span>
              <span className="text-xs text-gray-400 font-bold">구체적인 목표 설정</span>
            </div>

            <ContextSummary summary={profileSummary} />

            <div className="mt-8 mb-6 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl animate-slide-up">
              <div className="flex items-center gap-2 mb-2 text-emerald-400">
                <Target size={18} />
                <span className="text-[11px] font-black uppercase tracking-widest">Goal Setting Guide</span>
              </div>
              <p className="text-sm text-gray-300 font-bold leading-relaxed break-keep">
                비전을 이루기 위해 지금부터 6개월까지,<br/>실천 가능한 목표들을 나누어 세워보세요.
              </p>
            </div>

            <div className="space-y-12">
               <GoalSection 
                  title="1주일 목표" 
                  timeframe="1w" 
                  icon={Clock} 
                  color="text-emerald-400"
                  goals={goals.filter(g => g.timeframe === '1w')}
                  inputValue={input1w}
                  onInputChange={setInput1w}
                  onAdd={() => handleAddGoal('1w', input1w)}
                  onRemove={handleRemoveGoal}
                  onEdit={(id: number, text: string) => handleEditGoal(id, '1w', text)}
                  placeholder="예: 관련 서적 1권 구매하기"
               />
               <GoalSection 
                  title="1개월 목표" 
                  timeframe="1m" 
                  icon={CalendarClock} 
                  color="text-blue-400"
                  goals={goals.filter(g => g.timeframe === '1m')}
                  inputValue={input1m}
                  onInputChange={setInput1m}
                  onAdd={() => handleAddGoal('1m', input1m)}
                  onRemove={handleRemoveGoal}
                  onEdit={(id: number, text: string) => handleEditGoal(id, '1m', text)}
                  placeholder="예: 관련 교육과정 신청 및 50% 수강"
               />
               <GoalSection 
                  title="6개월 목표" 
                  timeframe="6m" 
                  icon={History} 
                  color="text-purple-400"
                  goals={goals.filter(g => g.timeframe === '6m')}
                  inputValue={input6m}
                  onInputChange={setInput6m}
                  onAdd={() => handleAddGoal('6m', input6m)}
                  onRemove={handleRemoveGoal}
                  onEdit={(id: number, text: string) => handleEditGoal(id, '6m', text)}
                  placeholder="예: 자격증 취득 또는 커뮤니티 시작"
               />

               <div className="pt-10 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-2 px-1">
                     <AlertTriangle size={18} className="text-rose-400" />
                     <h3 className="font-black text-sm uppercase tracking-widest text-rose-400">목표 달성에 예상되는 장애물은?</h3>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-rose-500 rounded-2xl blur opacity-0 group-focus-within:opacity-10 transition duration-500"></div>
                    <textarea 
                      value={challenges}
                      onChange={(e) => setChallenges(e.target.value)}
                      placeholder="예: 꾸준히 시간을 내는 것이 어려울 것 같아요. 체력이 예전 같지 않아 걱정됩니다."
                      className="relative w-full h-32 bg-[#111] border border-white/5 rounded-[2rem] p-6 text-sm text-white focus:outline-none focus:border-rose-500 resize-none leading-relaxed transition-all shadow-inner"
                    />
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-gradient-to-t from-black via-black/95 fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-md mx-auto">
          <button 
            onClick={handleInternalNext} 
            disabled={isGeneratingFeedback || !canProceed()} 
            className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all ${
              canProceed() 
                ? 'bg-white text-black' 
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {isGeneratingFeedback ? (
               <RefreshCw size={24} className="animate-spin" />
            ) : (
               <>
                 <span>{currentStep === Step.GOALS ? "종합 분석 및 격려 받기" : "다음 단계로"}</span>
                 <ChevronRight size={22} />
               </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 하위 컴포넌트 ---

const ContextSummary = ({ summary }: { summary: ProfileSummary | null }) => {
  if (!summary) return null;
  
  const personaLines = summary.persona?.split('\n').filter(l => l.trim()) || [];
  const personaTitle = personaLines[0] || "지혜로운 전문가";
  const personaDesc = personaLines.slice(1).join(' ') || "내담자님만의 고유한 커리어 정체성을 탐색 중입니다.";

  return (
    <div className="mb-6 space-y-3 animate-fade-in transition-all">
      {/* 01. My Career Identity (Persona) */}
      <div className="bg-gradient-to-br from-[#1a1625] via-[#0a0a0a] to-[#0d0d15] border border-purple-500/30 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden group">
         <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12"><Fingerprint size={100} /></div>
         <div className="flex items-center gap-2 mb-3 text-purple-400 font-black text-[9px] uppercase tracking-widest relative z-10">
            <UserCircle size={12} /> <span>My Career Identity</span>
         </div>
         <div className="relative z-10">
            <h4 className="text-lg font-black text-white mb-1 italic leading-tight">"{personaTitle}"</h4>
            {/* line-clamp-3 제거 및 폰트 크기 조정 */}
            <p className="text-[12px] text-gray-300 leading-relaxed break-keep italic">
               {personaDesc}
            </p>
         </div>
      </div>

      {/* 02. Key Strengths */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
         <div className="flex items-center gap-2 mb-2 text-purple-400 font-black text-[9px] uppercase tracking-widest">
            <Award size={12} /> <span>나의 핵심 강점</span>
         </div>
         <p className="text-[11px] text-gray-300 leading-relaxed italic">
            "{summary.strengths.replace(/\[.*?\]/g, '').trim() || "분석된 강점이 없습니다."}"
         </p>
      </div>
    </div>
  );
};

const InputStep = ({ title, icon: Icon, value, onChange, placeholder, desc, stepNum, color = "text-purple-400", summary }: any) => (
  <div className="animate-fade-in transition-all">
    <div className="flex justify-between items-end mb-4">
      <span className={`${color} text-sm font-bold`}>Step {stepNum} <span className="text-gray-500 font-normal">/ 4</span></span>
      <span className="text-xs text-gray-400 font-bold">{title}</span>
    </div>

    <ContextSummary summary={summary} />

    <div className="mb-6">
       <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/5`}>
          <Icon size={24} className={color} />
       </div>
       <h2 className="text-xl font-black leading-tight mb-1.5 break-keep">{desc}</h2>
       <p className="text-gray-500 text-[12px]">{title}은 당신의 미래를 비추는 등대입니다.</p>
    </div>
    <textarea
       value={value}
       onChange={(e) => onChange(e.target.value)}
       placeholder={placeholder}
       className="w-full h-40 bg-[#111] border border-white/5 rounded-[1.5rem] p-5 text-sm text-white focus:outline-none focus:border-purple-500 resize-none leading-relaxed shadow-inner transition-all"
    />
  </div>
);

const GoalSection = ({ title, icon: Icon, color, goals, inputValue, onInputChange, onAdd, onRemove, onEdit, placeholder }: any) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 px-1">
       <Icon size={18} className={color} />
       <h3 className={`font-black text-sm uppercase tracking-widest ${color}`}>{title}</h3>
    </div>
    
    <div className="space-y-2">
      <div className="flex gap-2">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-[#111] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-white/20 transition-all"
          onKeyDown={(e) => { 
            if (!e.nativeEvent.isComposing && e.key === 'Enter') {
              e.preventDefault();
              onAdd(); 
            }
          }}
        />
        <button 
          onClick={onAdd} 
          disabled={!inputValue.trim()}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 border border-white/5 ${
            inputValue.trim() 
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 active:scale-90' 
              : 'bg-white/5 text-gray-600 cursor-not-allowed opacity-50'
          }`}
          title="저장"
        >
          <Plus size={24} />
        </button>
      </div>
      <p className="text-[10px] text-gray-500 font-bold px-1 text-right">
        (엔터를 누르거나 + 버튼을 눌러 저장하세요)
      </p>
    </div>

    <div className="space-y-3">
       {goals.map((g: any) => (
         <div key={g.id} className="flex items-center justify-between p-5 bg-white/5 rounded-[1.5rem] border border-white/5 animate-slide-up">
            <span className="text-sm text-gray-200 font-medium flex-1 mr-4">{g.text}</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onEdit(g.id, g.text)} 
                className="p-2 text-gray-500 hover:text-blue-400 transition-colors"
                title="수정"
              >
                 <Edit2 size={16} />
              </button>
              <button 
                onClick={() => onRemove(g.id)} 
                className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                title="삭제"
              >
                 <X size={18} />
              </button>
            </div>
         </div>
       ))}
    </div>
  </div>
);

const ResultCard = ({ title, icon: Icon, color, content, label }: any) => (
  <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 flex items-start gap-6 relative overflow-hidden shadow-xl">
     <div className={`w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/5`}>
        <Icon size={28} className={color} />
     </div>
     <div>
        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 block">{label}</span>
        <h4 className="text-xl font-black text-white mb-2">{title}</h4>
        <p className="text-base text-gray-400 leading-relaxed break-keep">"{content}"</p>
     </div>
  </div>
);

const TimeframeResult = ({ title, timeframe, icon: Icon, goals }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
       <div className="flex items-center gap-3">
          <Icon size={18} className="text-gray-500" />
          <h4 className="font-bold text-gray-300">{title}</h4>
       </div>
       <span className="text-[10px] font-black text-gray-700 tracking-tighter uppercase">{timeframe}</span>
    </div>
    <div className="space-y-3">
       {goals.length > 0 ? goals.map((g: any, i: number) => (
         <div key={i} className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
            <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-gray-400 leading-relaxed">{g.text}</span>
         </div>
       )) : <p className="text-xs text-gray-700 italic px-3 py-2">설정된 목표가 없습니다.</p>}
    </div>
  </div>
);
