
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Home, Star, Award, Heart, Map, Download, RefreshCw, Quote, Compass, Target, Sparkles, Fingerprint, Info, ListTodo, Mountain, UserCircle, Search, Zap, FileText } from 'lucide-react';
import { fetchLatestHollandResult, fetchUserChatLogs, fetchGoalRoadmap, fetchValuePriorities, saveCareerPersona } from '../services/firebase';
import { ChatLog } from '../types';
import { generateCareerPersona } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface InterimReportProps {
  userName: string;
  onClose: () => void;
}

const HOLLAND_DESCRIPTIONS: Record<string, string> = {
  R: "실질적인 기술과 현장 경험을 바탕으로 실체 있는 성과를 만드는 '현장 전문가' 성향이 강합니다.",
  I: "논리적 분석력과 지적 호기심으로 복잡한 문제를 해결하고 전략을 제시하는 '지적 탐구자'입니다.",
  A: "자신만의 창의적 감각과 자유로운 표현력을 커리어에 녹여내는 독창적인 '예술가적 기질'을 보유했습니다.",
  S: "타인의 성장을 돕고 경청하며, 따뜻한 공감을 통해 선한 영향력을 미치는 '신뢰받는 조력자'입니다.",
  E: "노련한 리더십과 열정적인 추진력을 바탕으로 목표를 달성하고 조직을 이끄는 '진취적인 리더'입니다.",
  C: "체계적이고 꼼꼼한 관리 능력으로 조직의 안정성을 높이고 신뢰를 주는 완벽한 '관리 전문가'입니다."
};

const ShieldCheck = (props: any) => <Award {...props} />;

const PERSONA_MAP: Record<string, { icon: any; color: string }> = {
  R: { icon: Award, color: "text-amber-500" },
  I: { icon: Search, color: "text-blue-400" },
  A: { icon: Sparkles, color: "text-pink-400" },
  S: { icon: Heart, color: "text-emerald-400" },
  E: { icon: Zap, color: "text-purple-400" },
  C: { icon: ShieldCheck, color: "text-indigo-400" }
};

export const InterimReport: React.FC<InterimReportProps> = ({ userName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [userName]);

  const getCleanStrengths = (text: string) => {
    let cleanText = text;
    if (cleanText.includes('[강점 분석 결과]')) {
      cleanText = cleanText.split('[강점 분석 결과]')[1];
    }
    if (cleanText.includes('[도출된 핵심 강점]')) {
      cleanText = cleanText.split('[도출된 핵심 강점]')[0];
    }
    return cleanText.trim();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [holland, chatLogs, roadmap, values] = await Promise.all([
        fetchLatestHollandResult(userName),
        fetchUserChatLogs(userName),
        fetchGoalRoadmap(userName),
        fetchValuePriorities(userName)
      ]);

      const strengthsLog = (chatLogs as ChatLog[]).find(l => l.type === 'STRENGTHS');
      const strengthsSummary = strengthsLog?.summary || "";
      const hollandCode = holland?.topCode || "S";

      // Gemini를 통한 페르소나 스토리텔링 생성
      const personaStory = await generateCareerPersona(userName, hollandCode, strengthsSummary);
      
      // 생성된 페르소나를 저장하여 다른 단계에서도 활용 가능하게 함
      await saveCareerPersona(userName, personaStory);

      setData({
        holland: holland || null,
        strengths: strengthsSummary,
        roadmap: roadmap || null,
        values: values || null,
        personaStory: personaStory,
        date: new Date().toLocaleDateString()
      });
    } catch (err) {
      console.error("Interim data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || isGeneratingPdf) return;
    
    setIsGeneratingPdf(true);
    try {
      const element = reportRef.current;
      
      // 캡처를 위해 잠시 스타일 조정 (배경색 등)
      const originalStyle = element.style.backgroundColor;
      element.style.backgroundColor = '#000000';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#000000',
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      element.style.backgroundColor = originalStyle;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${userName}_커리어_중간_리포트.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <RefreshCw size={32} className="text-purple-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-400">내담자님의 진로 여정을 요약하고 있습니다...</p>
      </div>
    );
  }

  const primaryCode = data.holland?.topCode?.[0] || "S";
  const personaConfig = PERSONA_MAP[primaryCode] || PERSONA_MAP["S"];
  const PersonaIcon = personaConfig.icon;
  const cleanStrengths = getCleanStrengths(data.strengths);

  const personaLines = data.personaStory.split('\n').filter((l: string) => l.trim() !== "");
  const personaTitle = personaLines[0] || "당신은 준비된 전문가입니다";
  const personaContent = personaLines.slice(1).join(' ');

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black tracking-tight">커리어 중간 리포트</h1>
          <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest italic">Interim Visualization</span>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
          <Home size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-10 max-w-2xl mx-auto w-full">
        {/* 리포트 본문 영역 (캡처 데이터 마킹 추가) */}
        <div ref={reportRef} data-report-capture="true" className="bg-black space-y-12 pb-10">
          
          {/* Header Card */}
          <div className="text-center space-y-4">
             <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[1.5rem] shadow-2xl shadow-purple-900/40">
                <Star size={32} fill="white" className="text-white" />
             </div>
             <div>
                <h2 className="text-3xl font-black mb-1 leading-tight">{userName}님의<br/>커리어 빌드업 리포트</h2>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Foundation Stage: Self & Goal</p>
             </div>
             <div className="text-[10px] text-gray-700 font-mono">ID: {Date.now().toString().slice(-8)} | {data.date}</div>
          </div>

          {/* --- Career Persona Storytelling --- */}
          <section className="animate-slide-up">
            <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-[#1a1625] via-black to-[#0d0d15] border border-purple-500/30 overflow-hidden shadow-2xl">
               <div className="absolute -right-10 -bottom-10 opacity-5 rotate-12">
                  <PersonaIcon size={240} className={personaConfig.color} />
               </div>
               
               <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                     <UserCircle size={14} className="text-purple-400" />
                     <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Career Persona</span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-black mb-6 tracking-tight text-white italic">
                    "{personaTitle}"
                  </h2>
                  
                  <div className="w-12 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-6" />
                  
                  {/* 본문: 글자 크기를 text-[13px] sm:text-sm으로 키우고 색상을 text-white/90으로 변경 */}
                  <p className="text-[13px] sm:text-sm text-white/90 leading-relaxed break-keep font-medium">
                    {personaContent}
                  </p>
                  
                  <div className="mt-8 flex items-center gap-3 px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <Quote size={16} className="text-purple-500" fill="currentColor" />
                    <p className="text-[10px] text-gray-500 italic">
                      "축적된 시간은 배반하지 않습니다. 당신은 이미 준비된 리더입니다."
                    </p>
                  </div>
               </div>
            </div>
          </section>

          {/* Section 1: Self Understanding (DNA) */}
          <section className="space-y-6">
             <div className="flex items-center gap-2 px-1 text-purple-400">
                <Fingerprint size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">01. Career DNA</h3>
             </div>
             
             <div className="grid grid-cols-1 gap-4">
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Star size={100} /></div>
                   <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Holland Code</span>
                      <Sparkles size={16} className="text-yellow-400" />
                   </div>
                   <div className="flex items-center gap-6 mb-6">
                      <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-indigo-300 to-pink-400 tracking-widest">
                        {data.holland?.topCode || "---"}
                      </div>
                      <div className="text-xs text-gray-400 leading-relaxed border-l border-white/10 pl-6 break-keep italic">
                        내담자님의 성향이 가장 돋보이는 3가지 흥미 코드의 조합입니다.
                      </div>
                   </div>
                   
                   <div className="space-y-3 bg-white/5 rounded-2xl p-5 border border-white/5">
                      <h4 className="text-[10px] font-black text-purple-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Info size={12} /> 코드 심층 해석
                      </h4>
                      {data.holland?.topCode?.split('').map((char: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3">
                           <span className="w-5 h-5 shrink-0 rounded bg-purple-500/20 text-purple-300 font-black text-[10px] flex items-center justify-center border border-purple-500/20">{char}</span>
                           <p className="text-[11px] text-gray-400 leading-relaxed break-keep">
                             {HOLLAND_DESCRIPTIONS[char] || "유형 정보를 불러올 수 없습니다."}
                           </p>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-[2rem] p-8 relative">
                   <div className="flex items-center gap-2 mb-4 text-indigo-400 font-black text-[10px] uppercase tracking-widest">
                      <Award size={14} />
                      <span>분석된 핵심 강점 요약</span>
                   </div>
                   <div className="relative">
                      <Quote className="absolute -left-2 -top-2 text-indigo-500/10" size={32} />
                      <p className="text-sm text-gray-200 leading-relaxed italic whitespace-pre-wrap break-keep pl-4">
                         {cleanStrengths}
                      </p>
                   </div>
                </div>
             </div>
          </section>

          {/* Section 2: Goal & Compass */}
          <section className="space-y-6">
             <div className="flex items-center gap-2 px-1 text-emerald-400">
                <Compass size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">02. Career Compass</h3>
             </div>

             <div className="grid grid-cols-1 gap-4">
                <div className="bg-gradient-to-br from-[#0d1a15] to-black border border-emerald-500/20 rounded-[2.5rem] p-8 shadow-xl space-y-8">
                   <div>
                      <div className="flex items-center gap-2 mb-3">
                         <Mountain size={16} className="text-emerald-400" />
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">My 10-Year Vision</span>
                      </div>
                      <h4 className="text-xl font-black text-white leading-tight break-keep italic">
                         "{data.roadmap?.vision || "비전이 설정되지 않았습니다."}"
                      </h4>
                   </div>
                   
                   <div className="pt-6 border-t border-white/5">
                      <div className="flex items-center gap-2 mb-3">
                         <Compass size={16} className="text-blue-400" />
                         <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Career Mission</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed break-keep">
                         {data.roadmap?.mission || "미션이 설정되지 않았습니다."}
                      </p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 flex flex-col">
                      <div className="flex items-center gap-2 mb-4 text-orange-400 font-black text-[10px] uppercase tracking-widest">
                         <ListTodo size={14} />
                         <span>실행 목표 (Goals)</span>
                      </div>
                      <div className="space-y-2 flex-1">
                         {data.roadmap?.goals && (Array.isArray(data.roadmap.goals) ? data.roadmap.goals : Object.values(data.roadmap.goals).flat()).length > 0 ? (
                           (Array.isArray(data.roadmap.goals) ? data.roadmap.goals : Object.values(data.roadmap.goals).flat()).map((g: any, i: number) => (
                             <div key={i} className="flex items-start gap-2 text-xs text-gray-400 bg-white/5 p-2 rounded-lg border border-white/5">
                                <span className="text-orange-500 font-bold">{i+1}.</span>
                                <span className="break-keep">{g}</span>
                             </div>
                           ))
                         ) : (
                           <p className="text-xs text-gray-600 italic py-4 text-center">목표를 설정하는 중입니다.</p>
                         )}
                      </div>
                   </div>

                   <div className="bg-[#111] border border-white/5 rounded-[2rem] p-6 flex flex-col">
                      <div className="flex items-center gap-2 mb-4 text-yellow-400 font-black text-[10px] uppercase tracking-widest">
                         <Heart size={14} />
                         <span>중시하는 가치 (Values)</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 flex-1">
                         {data.values?.items.slice(0, 3).map((v: any, i: number) => (
                           <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5 group hover:bg-yellow-500/10 transition-all">
                              <span className="text-sm font-bold text-gray-200 group-hover:text-yellow-400">{v.label}</span>
                              <span className="text-[9px] font-black text-yellow-500/40 uppercase">{v.rank}위</span>
                           </div>
                         )) || (
                           <p className="text-xs text-gray-600 italic py-4 text-center col-span-1">가치관을 설정하는 중입니다.</p>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <div className="bg-gradient-to-br from-indigo-900/20 to-black border-2 border-indigo-500/20 rounded-[2.5rem] p-8 text-center flex flex-col items-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
             <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-xl">
                <Sparkles size={20} className="text-white" />
             </div>
             <div className="space-y-2 max-w-lg">
                <h4 className="text-indigo-300 font-black text-[9px] uppercase tracking-[0.3em]">Expert Support</h4>
                <p className="text-sm text-indigo-100 font-medium leading-relaxed break-keep">
                   {userName}님의 수십 년 지혜가 담긴 이 로드맵은 제2의 인생을 여는 가장 밝은 나침반입니다.<br/>
                   당신만의 고유한 강점과 가치를 믿고, 새로운 커리어를 향해 당당히 나아가시길 응원합니다.
                </p>
             </div>
          </div>

          <div className="text-center pt-6 opacity-30">
             <p className="text-[10px] font-black tracking-[0.3em] uppercase italic">The foundation of your second career journey</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-3">
           <button 
             onClick={handleDownloadPdf}
             disabled={isGeneratingPdf}
             className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-base shadow-2xl hover:from-purple-500 hover:to-indigo-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {isGeneratingPdf ? (
               <>
                 <RefreshCw size={20} className="animate-spin" />
                 PDF 생성 중...
               </>
             ) : (
               <>
                 <FileText size={20} />
                 PDF 리포트 저장하기
               </>
             )}
           </button>
           <button 
             onClick={onClose} 
             className="w-full py-5 rounded-2xl bg-white/10 text-white font-black text-base border border-white/10 hover:bg-white/20 transition-all active:scale-[0.98]"
           >
             메인 대시보드로 돌아가기
           </button>
        </div>
      </div>
    </div>
  );
};
