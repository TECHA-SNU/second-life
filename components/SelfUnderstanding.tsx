
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Save, CheckCircle, Edit3, Sparkles, Home, Download, Award, Target, Zap, BookOpen, RefreshCw, Sprout, Star, Fingerprint, Info, AlertCircle, Quote, Heart, User, Briefcase, MessageCircle } from 'lucide-react';
import { analyzeStrengthsFromAnswers, generateEncouragement, generateSelfUnderstandingTurn } from '../services/geminiService';
import { upsertChatLog, fetchLatestHollandResult, saveCareerPersona } from '../services/firebase';

interface SelfUnderstandingProps {
  userName: string;
  onClose: () => void;
  onNext: () => void;
}

interface Question {
  id: number;
  title: string;
  description: string;
  placeholder: string;
  tags: { icon: string; label: string }[];
}

interface StrengthData {
  theme: string;
  area: string;
  description: string;
  evidence: string;
}

interface AnalysisResultJSON {
  summary: string;
  identity: string;
  strengths: StrengthData[];
}

const questions: Question[] = [
  {
    id: 1,
    title: "가장 즐거웠던 순간은 언제인가요?",
    description: "시간 가는 줄 모르고 완전히 몰입했던 경험을 떠올려보세요.",
    placeholder: "예: 주말에 친구들과 등산을 갔을 때, 정상에 올라 느꼈던 상쾌함이 기억에 남아요. 땀 흘리고 난 뒤의 개운함이 좋았어요.",
    tags: [
      { icon: "🏃", label: "운동/야외" },
      { icon: "🎨", label: "창작" },
      { icon: "🤝", label: "소통/만남" },
      { icon: "💻", label: "기술/전문" },
      { icon: "🧩", label: "문제해결" },
      { icon: "🎁", label: "봉사/나눔" },
      { icon: "✈️", label: "여행/탐험" },
      { icon: "📚", label: "독서/사색" },
      { icon: "🍳", label: "요리/미식" },
      { icon: "🐕", label: "반려동물" },
      { icon: "🌿", label: "정원가꾸기" },
      { icon: "🧘", label: "명상/요가" },
      { icon: "📦", label: "수집/정리" }
    ]
  },
  {
    id: 2,
    title: "가장 큰 성취감을 느꼈던 일은 무엇인가요?",
    description: "어렵지만 포기하지 않고 끝내 해냈던 경험이 있다면 알려주세요.",
    placeholder: "예: 작년 회사 프로젝트에서 팀장 역할을 맡아 매출 목표를 120% 달성했을 때 정말 짜릿했습니다.",
    tags: [
      { icon: "📈", label: "목표달성" },
      { icon: "👥", label: "팀워크" },
      { icon: "🎓", label: "배움/성장" },
      { icon: "🛠️", label: "난관극복" },
      { icon: "✨", label: "새로운시도" },
      { icon: "🌱", label: "자기계발" },
      { icon: "👑", label: "리더십" },
      { icon: "⏳", label: "인내/끈기" },
      { icon: "💡", label: "창의적해결" },
      { icon: "📅", label: "습관형성" },
      { icon: "📜", label: "자격증취득" },
      { icon: "💪", label: "건강관리" },
      { icon: "🤝", label: "재능기부" }
    ]
  },
  {
    id: 3,
    title: "남들보다 조금 더 쉽게 해냈던 일은 무엇인가요?",
    description: "자연스럽게 잘 되었던 일이나, 주변에서 칭찬받았던 점을 생각해보세요.",
    placeholder: "예: 친구들의 고민을 들어주는 게 편해요. 사람들이 저랑 이야기하면 마음이 편안해진다고 해요.",
    tags: [
      { icon: "👂", label: "경청/공감" },
      { icon: "📊", label: "분석/추론" },
      { icon: "🗣️", label: "설득/강연" },
      { icon: "📁", label: "정리/조직" },
      { icon: "💡", label: "아이디어" },
      { icon: "📅", label: "계획/관리" },
      { icon: "🔍", label: "세심함/꼼꼼" },
      { icon: "🎭", label: "유머/분위기" },
      { icon: "🖐️", label: "손재주" },
      { icon: "🌐", label: "외국어" },
      { icon: "📱", label: "디지털도구" },
      { icon: "👨‍🏫", label: "가르치기" },
      { icon: "👁️", label: "관찰력" }
    ]
  }
];

export const SelfUnderstanding: React.FC<SelfUnderstandingProps> = ({ userName, onClose, onNext }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(questions.length).fill(''));
  const [currentInput, setCurrentInput] = useState('');
  const [turnCount, setTurnCount] = useState(0);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [feedbacks, setFeedbacks] = useState<string[]>(new Array(questions.length).fill(''));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [isWaitingForGemini, setIsWaitingForGemini] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultJSON | null>(null);
  const [hollandResult, setHollandResult] = useState<string | null>(null);
  
  const resultRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isWaitingForGemini]);

  useEffect(() => {
    const checkHolland = async () => {
      const res = await fetchLatestHollandResult(userName);
      if (res) setHollandResult(res.topCode);
    };
    checkHolland();
  }, [userName]);

  /**
   * 지금까지의 문답 내용을 Firebase에 동기화합니다.
   */
  const syncSelfUnderstandingToFirebase = async (currentAnswers: string[], currentFeedbacks: string[]) => {
    try {
      let logContent = "";
      for (let i = 0; i < questions.length; i++) {
        if (currentAnswers[i]) {
          logContent += `[질문 ${i + 1}] ${questions[i].title}\n`;
          logContent += `[내 답변] ${currentAnswers[i]}\n`;
          if (currentFeedbacks[i]) {
            logContent += `[코치 피드백] ${currentFeedbacks[i]}\n\n`;
          } else {
            logContent += `\n`;
          }
        }
      }
      if (logContent) {
        await upsertChatLog(userName, 'SELF_UNDERSTANDING', logContent.trim());
      }
    } catch (e) {
      console.warn("Self-understanding sync error:", e);
    }
  };

  const handleAnswerChange = (text: string) => {
    setCurrentInput(text);
  };

  const handleTagClick = (tagLabel: string) => {
    const newText = currentInput ? `${currentInput} ${tagLabel}` : tagLabel;
    setCurrentInput(newText);
  };

  const handleNext = async () => {
    if (feedbackMessage) {
        setFeedbackMessage(null);
        startFinalAnalysis();
        return;
    }

    if (turnCount === 2) {
        // 마무리 멘트 확인 후 다음 질문으로 이동
        setTurnCount(0);
        setChatHistory([]);
        setCurrentInput('');

        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
            return;
        }

        // 모든 질문 완료
        setIsGeneratingFeedback(true);
        try {
            const combinedContext = answers.join("\n");
            const encouragement = await generateEncouragement("자기이해 여정 전체", combinedContext);
            setFeedbackMessage(encouragement);
            
            const updatedFeedbacks = [...feedbacks];
            updatedFeedbacks[currentStep] = encouragement;
            setFeedbacks(updatedFeedbacks);
            
            await syncSelfUnderstandingToFirebase(answers, updatedFeedbacks);
        } catch (error) {
            console.error("Encouragement Error:", error);
            setFeedbackMessage("내담자님의 소중한 경험을 들려주셔서 감사합니다. 그 과정에 담긴 정성과 지혜가 느껴집니다.");
        } finally {
            setIsGeneratingFeedback(false);
        }
        return;
    }

    if (!currentInput.trim()) return;

    // 대화 턴 처리 (Turn 0 -> Turn 1 -> Turn 2)
    setIsWaitingForGemini(true);
    try {
        const userMsg = currentInput.trim();
        const newHistory = [...chatHistory, { role: 'user' as const, content: userMsg }];
        
        // 답변 저장
        const newAnswers = [...answers];
        if (turnCount === 0) {
          newAnswers[currentStep] = userMsg;
        } else {
          newAnswers[currentStep] = `${newAnswers[currentStep]}\n(추가 답변): ${userMsg}`;
        }
        setAnswers(newAnswers);
        setChatHistory(newHistory);
        setCurrentInput('');
        
        // turnCount 0이면 추가 질문(isFinal=false), turnCount 1이면 마무리 멘트(isFinal=true)
        const geminiRes = await generateSelfUnderstandingTurn(
            questions[currentStep].title, 
            userMsg, 
            chatHistory, 
            turnCount === 1
        );
        
        setChatHistory([...newHistory, { role: 'model' as const, content: geminiRes }]);
        setTurnCount(turnCount + 1);
    } catch (error) {
        console.error("Turn Error:", error);
    } finally {
        setIsWaitingForGemini(false);
    }
  };

  const startFinalAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const qaPairs = questions.map((q, idx) => ({
        question: q.title,
        answer: answers[idx]
      }));
      
      const responseText = await analyzeStrengthsFromAnswers(qaPairs);
      const sanitizedJson = responseText.replace(/```json|```/g, "").trim();
      const parsed: AnalysisResultJSON = JSON.parse(sanitizedJson);
      
      if (parsed && parsed.strengths) {
        setAnalysisResult(parsed);
        // 최종 분석 결과와 함께 로그 업데이트
        const finalLog = `[강점 분석 결과]\n${parsed.summary}\n\n[도출된 핵심 강점]\n${parsed.strengths.map((s, i) => `${i+1}. ${s.theme} (${s.area})`).join('\n')}`;
        await upsertChatLog(userName, 'STRENGTHS', finalLog);
        
        // 자기이해 단계의 페르소나(정체성) 저장 - 홀랜드 결과가 아직 없더라도 강점 기반으로 우선 생성
        const preliminaryPersona = `준비된 전문가\n${parsed.summary}`;
        await saveCareerPersona(userName, preliminaryPersona);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Strength Analysis Error:", error);
      alert("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getAreaColor = (area: string) => {
    if (area.includes('실행력')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (area.includes('영향력')) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (area.includes('대인관계')) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (area.includes('전략적')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  // 피드백 생성 중 로딩 상태
  if (isGeneratingFeedback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Heart className="w-8 h-8 text-purple-400 animate-pulse fill-purple-400/20" />
          </div>
        </div>
        <p className="text-xl font-bold text-center leading-relaxed">내담자님의 소중한 경험을<br/>정성스럽게 읽고 있습니다...</p>
      </div>
    );
  }

  // 피드백 메시지 출력 화면
  if (feedbackMessage) {
    return (
      <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
        <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"><Home size={24} /></button>
          <div className="flex items-center gap-2">
             <Heart size={18} className="text-purple-400" />
             <h1 className="text-xl font-sans font-bold">코치의 격려</h1>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full text-center">
          {/* 코치 캐릭터 추가 */}
          <div className="mb-6 relative">
            <div className="absolute -inset-4 bg-purple-500/20 blur-2xl rounded-full animate-pulse"></div>
            <img 
              src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f331/512.png" 
              alt="Coach" 
              className="w-32 h-32 relative z-10 drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-2 -right-2 bg-purple-500 text-white p-2 rounded-full shadow-lg z-20 animate-bounce">
              <MessageCircle size={20} fill="currentColor" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1625] to-black border border-purple-500/20 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl animate-slide-up max-h-[50vh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-4 left-4 text-purple-500/10"><Quote size={40} /></div>
            {/* 폰트를 font-cute로 변경하고 크기 조정 */}
            <p className="text-lg text-gray-100 font-bold font-sans break-keep leading-relaxed relative z-10">
              "{feedbackMessage}"
            </p>
          </div>

          <p className="mt-10 text-[10px] font-black text-purple-400/60 uppercase tracking-[0.2em]">Your experience has immense power</p>
        </div>

        <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent sticky bottom-0 z-50">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleNext}
              className="w-full py-5 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-600 hover:text-white transition-all shadow-2xl active:scale-95"
            >
              <span>최종 강점 분석 시작하기</span>
              <ArrowRight size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (analysisResult) {
    return (
      <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
        <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors" aria-label="홈으로">
            <Home size={24} />
          </button>
          <h1 className="text-lg font-bold">자기이해 결과 리포트</h1>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-8 max-w-2xl mx-auto w-full">
          <div ref={resultRef} className="bg-black p-2">
            
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/5">
                    <span className="text-3xl" role="img" aria-label="중장년 남성 캐릭터">👨‍💼</span>
                  </div>
                  <span className="text-[9px] mt-2 text-blue-400/60 font-black uppercase tracking-widest">Experience</span>
                </div>

                <div className="inline-flex items-center justify-center p-4 bg-purple-500/20 rounded-full shadow-2xl shadow-purple-500/20">
                  <Star className="w-8 h-8 text-purple-300 animate-pulse" fill="currentColor" />
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center border border-pink-500/20 shadow-lg shadow-pink-500/5">
                    <span className="text-3xl" role="img" aria-label="중장년 여성 캐릭터">👩‍💼</span>
                  </div>
                  <span className="text-[9px] mt-2 text-pink-400/60 font-black uppercase tracking-widest">Wisdom</span>
                </div>
              </div>
              
              <h2 className="text-3xl font-black mb-2 tracking-tight">{userName}님의<br/>커리어 길찾기</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                답변하신 경험 속에서 추출된 {userName}님만의<br/>
                고유한 강점과 잠재력입니다.
              </p>
            </div>

            <div className="mb-10 bg-gradient-to-br from-blue-900/20 to-purple-900/10 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-slide-up">
              <div className="absolute -right-6 -top-6 text-blue-500/5 rotate-12"><Fingerprint size={120} /></div>
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-400 fill-yellow-400" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-300">나의 커리어 새싹 살펴보기</h3>
                </div>
              </div>

              <div className="relative z-10">
                <span className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">상담 분석 요약</span>
                <p className="text-sm text-gray-300 leading-relaxed italic whitespace-pre-wrap break-keep">
                  "{analysisResult.summary}"
                </p>
              </div>
            </div>

            {/* My Career Identity Section */}
            <div className="mb-12 bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden animate-slide-up">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <User size={120} className="text-purple-500" />
              </div>
              
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="relative mb-8">
                  {/* Stylized Character Illustration */}
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-inner relative group">
                    <div className="absolute inset-0 bg-purple-500/10 rounded-[2.5rem] blur-xl group-hover:bg-purple-500/20 transition-all"></div>
                    <div className="relative flex flex-col items-center">
                       <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-2">
                         <span className="text-5xl" role="img" aria-label="Career Identity Character">👨‍🎨</span>
                       </div>
                       <div className="flex gap-1">
                         <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                         <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-75"></div>
                         <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse delay-150"></div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-black rounded-2xl border border-white/20 flex items-center justify-center shadow-2xl">
                    <Briefcase size={20} className="text-purple-400" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 rounded-full border border-purple-500/20">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">My Career Identity</span>
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight break-keep">
                    "{analysisResult.identity || "지혜로운 커리어 개척자"}"
                  </h3>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed break-keep">
                    중장년의 풍부한 경험과 새로운 열정이 결합된<br/>
                    {userName}님만의 독보적인 커리어 정체성입니다.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mt-8">
                  {["#경험의_깊이", "#새로운_도전", "#지혜의_공유"].map((tag, i) => (
                    <span key={i} className="px-4 py-1.5 bg-white/5 rounded-full text-[11px] font-bold text-gray-400 border border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 mb-12">
              <div className="flex items-center gap-2 px-1 mb-2">
                 <Award className="w-4 h-4 text-purple-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Key Strength Domains</span>
              </div>
              {analysisResult.strengths.map((s, idx) => (
                <div key={idx} className="bg-[#111] border border-white/5 rounded-3xl p-6 hover:border-purple-500/30 transition-all group animate-slide-up" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-900 rounded-2xl border border-white/5 flex items-center justify-center text-purple-400 font-black text-lg group-hover:bg-purple-600 group-hover:text-white transition-all shadow-inner">
                        {idx + 1}
                      </div>
                      <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">{s.theme}</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest ${getAreaColor(s.area)}`}>
                      {s.area}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed mb-4 font-medium break-keep">
                    {s.description}
                  </p>
                  <div className="bg-white/5 rounded-2xl p-4 border-l-4 border-purple-500/50">
                    <div className="flex items-center gap-2 mb-1.5">
                       <Quote size={12} className="text-purple-500 opacity-50" />
                       <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Evidence from experience</span>
                    </div>
                    <p className="text-xs text-gray-400 italic leading-relaxed break-keep">
                      {s.evidence}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center py-6 opacity-20 border-t border-white/5">
              <p className="text-[10px] font-black tracking-[0.3em] italic uppercase">Self-Understanding & Strength Analysis Report</p>
            </div>
          </div>


        </div>

        <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent sticky bottom-0 border-t border-white/5 backdrop-blur-md z-50">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={onNext}
              className="w-full py-5 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-purple-600 hover:text-white transition-all shadow-2xl shadow-purple-900/40 active:scale-95"
            >
              <span>{hollandResult ? "직무 탐색 단계로 이동" : "흥미 탐색(RIASEC) 시작하기"}</span>
              <ArrowRight size={22} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
        <div className="relative w-28 h-28 mb-10">
          <div className="absolute inset-0 border-[6px] border-purple-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-[6px] border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
          </div>
        </div>
        <h2 className="text-2xl font-black mb-3 text-center">경험 속의 보석을<br/>찾고 있습니다</h2>
        <div className="flex flex-col items-center gap-1.5 opacity-60">
           <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-purple-400">Contextual Strength Analysis...</p>
        </div>
        <p className="mt-8 text-gray-500 text-sm text-center max-w-xs leading-relaxed break-keep">
          내담자님이 말씀해주신 소중한 경험들을 분석하여<br/>
          제2의 인생을 지탱할 핵심 강점 3가지를 도출합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors" aria-label="홈으로">
          <Home size={24} />
        </button>
        <div className="flex items-center gap-2">
           <Sprout size={18} className="text-green-400" />
           <h1 className="text-lg font-black tracking-tight">자기이해</h1>
        </div>
        <div className="w-8" />
      </div>

      <div className="px-6 py-4 bg-gray-900/20">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase italic">Diagnostic Module</span>
          <span className="text-[10px] font-bold text-gray-500">{currentStep + 1} / {questions.length}</span>
        </div>
        <div className="flex gap-1.5 h-1.5 bg-gray-800/50 rounded-full p-0.5">
          {questions.map((_, i) => (
             <div key={i} className={`flex-1 rounded-full transition-all duration-500 ${currentStep >= i ? 'bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.6)]' : 'bg-gray-800'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-6 pb-32 max-w-lg mx-auto w-full">
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-black leading-tight mb-4 text-white break-keep">
            {questions[currentStep].title}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed break-keep">
            {questions[currentStep].description}
          </p>
        </div>

        {/* 대화 히스토리 */}
        {chatHistory.length > 0 && (
          <div className="space-y-4 mb-8">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-purple-600 text-white rounded-tr-none' 
                    : 'bg-gray-800 text-gray-200 rounded-tl-none border border-white/5'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isWaitingForGemini && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-gray-800 text-gray-400 p-4 rounded-2xl rounded-tl-none text-xs">
                  코치가 답변을 읽고 있습니다...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        <div className="space-y-6 animate-slide-up">
           {turnCount === 0 && (
             <div className="flex flex-wrap gap-2 mb-4">
                {questions[currentStep].tags.map((tag) => (
                  <button
                    key={tag.label}
                    onClick={() => handleTagClick(tag.label)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 hover:border-gray-600 transition-all text-xs font-bold text-gray-400 hover:text-white shadow-lg"
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
             </div>
           )}

           {turnCount < 2 && (
             <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl blur opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
                <textarea
                  value={currentInput}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder={turnCount === 0 ? questions[currentStep].placeholder : "코치의 질문에 답변해 보세요..."}
                  className={`relative w-full ${chatHistory.length > 0 ? 'h-32' : 'h-64'} bg-gray-900 border border-white/5 rounded-3xl p-6 text-base text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed transition-all shadow-inner`}
                />
             </div>
           )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-50">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleNext}
            disabled={(turnCount < 2 && !currentInput.trim()) || isWaitingForGemini}
            className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95
              ${(turnCount === 2 || (currentInput.trim() && !isWaitingForGemini))
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40' 
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
          >
            {isWaitingForGemini ? (
              <RefreshCw size={22} className="animate-spin" />
            ) : (
              <>
                <span>{turnCount < 2 ? "대화하기" : (currentStep === questions.length - 1 ? "종합 분석 및 격려 받기" : "다음 질문으로")}</span>
                <ArrowRight size={22} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
