
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Frown, Meh, Smile, Laugh, ChevronRight, Calendar, User, Home, MessageCircle, Edit3, X, Sparkles, Youtube, ExternalLink, RefreshCw, Search, Download, Quote, Flower2, ListTodo, CheckCircle2, Heart, Pencil, Coffee, Sun, FileText, Target, BookOpen } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { saveChatLog, saveReflectionData, fetchUserActions } from '../services/firebase';

interface ReflectionProps {
  userName: string;
  onClose: () => void;
  onBack: () => void;
}

type SubStep = 'TEXT_REFLECTION' | 'DIARY_ACTIVITY' | 'RESOURCES';

const MOODS = [
  { id: 'bad', label: '토닥토닥', icon: Frown, color: 'text-rose-400' },
  { id: 'sad', label: '아쉬워요', icon: Meh, color: 'text-orange-400' },
  { id: 'neutral', label: '평온해요', icon: Meh, color: 'text-yellow-400' },
  { id: 'good', label: '뿌듯해요', icon: Smile, color: 'text-emerald-400' },
  { id: 'best', label: '최고예요', icon: Laugh, color: 'text-purple-400' },
] as const;

export const Reflection: React.FC<ReflectionProps> = ({ userName, onClose, onBack }) => {
  const [subStep, setSubStep] = useState<SubStep>('TEXT_REFLECTION');
  const [selectedMood, setSelectedMood] = useState<string>('good');
  const [summaryText, setSummaryText] = useState('');
  const [diaryContent, setDiaryContent] = useState({
    proud: '',
    learned: '',
    interest: '' 
  });
  
  const [actionSummary, setActionSummary] = useState<{ total: number, completed: number, items: any[] } | null>(null);
  const [jobInterest, setJobInterest] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [isSearchingResources, setIsSearchingResources] = useState(false);

  useEffect(() => {
    loadActionContext();
  }, []);

  const loadActionContext = async () => {
    try {
      const actionsData = await fetchUserActions(userName);
      if (actionsData && actionsData.items) {
        setActionSummary({
          total: actionsData.items.length,
          completed: actionsData.items.filter((i: any) => i.status === 'COMPLETED').length,
          items: actionsData.items
        });
        if (actionsData.mainGoal?.title) {
          setJobInterest(actionsData.mainGoal.title);
        }
      }
    } catch (err) {
      console.error("Action context load error:", err);
    }
  };

  const handleHeaderBack = () => {
    if (subStep === 'RESOURCES') {
      setSubStep('DIARY_ACTIVITY');
    } else if (subStep === 'DIARY_ACTIVITY') {
      setSubStep('TEXT_REFLECTION');
    } else {
      onClose(); // TEXT_REFLECTION 단계에서는 대시보드로
    }
  };

  const handleGoToDiary = () => {
    if (!summaryText.trim()) {
      alert("오늘의 짧은 소감을 먼저 적어주세요.");
      return;
    }
    setSubStep('DIARY_ACTIVITY');
  };

  const fetchResources = async () => {
    setIsSearchingResources(true);
    try {
      // 1. 데이터 준비
      const fullDiaryLog = `[오늘의 소감] ${summaryText}\n[기분] ${selectedMood}\n\n[성찰 일기]\n1. 칭찬할 점: ${diaryContent.proud}\n2. 발견한 모습: ${diaryContent.learned}\n3. 관심 있는 직업: ${diaryContent.interest}`;
      
      // 상담 로그(chat_logs)에 상세 내용 저장
      await saveChatLog(userName, 'reflection_text', fullDiaryLog);

      // 2. AI 추천 리소스 검색 (Gemini Search)
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const searchKeyword = diaryContent.interest || jobInterest;
      
      const prompt = `
        직업: ${searchKeyword}
        대상: 새로운 커리어를 준비하는 4060 중장년층
        요청: 
        1. 위 직업에 대해 중장년층이 도전하기 위해 알아야 할 핵심 정보와 준비 방법을 3~4문장으로 친절하게 요약해서 알려줘.
        2. 관련된 최신 뉴스 기사(칼럼)와 실무 역량을 배울 수 있는 유튜브 영상들을 합쳐서 총 5개 추천해줘.
        
        주의사항:
        - 추천하는 리소스(뉴스, 영상 등)는 반드시 답변 텍스트 마지막 부분에 리스트 형태로 포함시켜줘.
        - 각 리소스는 [제목](URL) 형식의 마크다운 링크를 사용하여 사용자가 바로 클릭할 수 있게 해줘.
        - '추가 가이드'라는 제목이나 문구는 절대 사용하지 마.
        - 답변은 마크다운 형식을 사용하여 가독성 있게 작성해줘.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] }
      });

      const aiAdviceText = response.text || '';
      setAiAdvice(aiAdviceText);
      
      // 3. 'data/reflection_text' 문서에 모든 내용 통합 저장
      await saveReflectionData(userName, {
        reflect_impression: summaryText, 
        diary_writing: { 
          proud: diaryContent.proud,
          learned: diaryContent.learned,
          interest: diaryContent.interest
        },
        mood: selectedMood,
        jobInterest: searchKeyword,
        aiAdvice: aiAdviceText,
        completedAt: new Date()
      });
      
      setSubStep('RESOURCES');
    } catch (error) { 
      console.error("Reflection save/search error:", error); 
      setSubStep('RESOURCES');
    } finally { 
      setIsSearchingResources(false); 
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in relative">
      {/* Header - Conditional Icon based on SubStep */}
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
        <button onClick={handleHeaderBack} className="p-2 text-gray-400 hover:text-white transition-colors">
          {subStep === 'TEXT_REFLECTION' ? <Home size={24} /> : <ArrowLeft size={24} />}
        </button>
        <div className="flex items-center gap-2">
           <Flower2 size={18} className="text-pink-400" />
           <h1 className="text-lg font-bold">성찰학습</h1>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-24 max-w-lg mx-auto w-full">
        
        {/* --- STEP 1: 기분 선택 및 소감 --- */}
        {subStep === 'TEXT_REFLECTION' && (
          <div className="animate-fade-in pt-6 text-left">
             <div className="mb-8">
               <h2 className="text-2xl font-black mb-2 leading-tight">행동 실행을 통해<br/>어떤 마음이 드셨나요?</h2>
               <p className="text-gray-400 text-sm">오늘 하루 내담자님의 마음을 가장 잘 나타내는 표정을 골라주세요.</p>
             </div>

             <div className="flex justify-between gap-2 mb-10">
                {MOODS.map((mood) => {
                  const isSelected = selectedMood === mood.id;
                  const MoodIcon = mood.icon;
                  return (
                    <button key={mood.id} onClick={() => setSelectedMood(mood.id)} className={`flex-1 flex flex-col items-center justify-center py-5 rounded-[2rem] border-2 transition-all ${isSelected ? 'bg-white/10 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)] scale-105' : 'bg-[#111] border-white/5 text-gray-500 hover:border-white/10'}`}>
                      <MoodIcon size={28} className={isSelected ? mood.color : ''} />
                      <span className={`text-[10px] font-black mt-2 ${isSelected ? 'text-white' : ''}`}>{mood.label}</span>
                    </button>
                  );
                })}
             </div>

             <div className="mb-8">
               <label className="text-[11px] font-black text-pink-400 uppercase tracking-widest mb-3 block">한 줄 소감</label>
               <textarea 
                  value={summaryText} 
                  onChange={(e) => setSummaryText(e.target.value)} 
                  placeholder="오늘의 기분을 한 문장으로 요약해볼까요? (예: 작은 실천이었지만 마음이 한결 가벼워진 하루였다.)" 
                  className="w-full h-32 bg-[#15121e] border border-gray-800 rounded-3xl p-6 text-sm text-white focus:outline-none focus:border-pink-500 resize-none leading-relaxed" 
               />
             </div>



             <button onClick={handleGoToDiary} className="w-full py-5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all">
                <span>성찰일기 써보기</span>
                <Pencil size={20} />
             </button>
          </div>
        )}

        {/* --- STEP 2: 성찰일기 활동 --- */}
        {subStep === 'DIARY_ACTIVITY' && (
          <div className="animate-slide-up pt-6 text-left">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-pink-500/20 rounded-xl text-pink-400"><Heart size={20} fill="currentColor" /></div>
                <h2 className="text-xl font-black">나의 커리어 성장 일기</h2>
             </div>

             <div className="bg-[#fdfbf6] rounded-[2.5rem] p-8 shadow-2xl relative border-8 border-[#f3e9d2] mb-10 overflow-hidden">
                <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-10">
                   {[...Array(6)].map((_, i) => <div key={i} className="w-4 h-4 rounded-full bg-gray-900/10 shadow-inner" />)}
                </div>

                <div className="pl-6 space-y-8">
                   <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                      <span className="text-gray-400 font-black text-xs uppercase tracking-tighter">Date. {new Date().toLocaleDateString()}</span>
                      <div className="flex items-center gap-1.5 text-gray-400">
                         <Coffee size={14} />
                         <span className="text-[10px] font-bold">Reflective Moment</span>
                      </div>
                   </div>

                   <section className="space-y-3">
                      <div className="flex items-center gap-2">
                         <Sun size={16} className="text-orange-400" />
                         <h4 className="text-[13px] font-black text-gray-800">오늘 내가 나에게 칭찬해주고 싶은 점은?</h4>
                      </div>
                      <textarea 
                         value={diaryContent.proud}
                         onChange={(e) => setDiaryContent({...diaryContent, proud: e.target.value})}
                         placeholder="작은 성공이라도 괜찮아요. 내담자님의 정성을 칭찬해주세요."
                         className="w-full bg-transparent border-none text-gray-600 text-sm focus:outline-none resize-none leading-relaxed placeholder:text-gray-300"
                         rows={2}
                      />
                   </section>

                   <section className="space-y-3">
                      <div className="flex items-center gap-2">
                         <Search size={16} className="text-blue-400" />
                         <h4 className="text-[13px] font-black text-gray-800">실천하며 새롭게 발견한 나의 모습은?</h4>
                      </div>
                      <textarea 
                         value={diaryContent.learned}
                         onChange={(e) => setDiaryContent({...diaryContent, learned: e.target.value})}
                         placeholder="몰랐던 흥미나, 예전보다 능숙해진 강점이 있었나요?"
                         className="w-full bg-transparent border-none text-gray-600 text-sm focus:outline-none resize-none leading-relaxed placeholder:text-gray-300"
                         rows={2}
                      />
                   </section>

                   <section className="space-y-3 pb-4">
                      <div className="flex items-center gap-2">
                         <Sparkles size={16} className="text-purple-500" />
                         <h4 className="text-[13px] font-black text-gray-800">지금 가장 관심 있는 직업은 무엇인가요?</h4>
                      </div>
                      <textarea 
                         value={diaryContent.interest}
                         onChange={(e) => setDiaryContent({...diaryContent, interest: e.target.value})}
                         placeholder="내담자님의 마음을 설레게 하는 직업 이름을 적어주세요."
                         className="w-full bg-transparent border-none text-gray-600 text-sm focus:outline-none resize-none leading-relaxed placeholder:text-gray-300"
                         rows={2}
                      />
                   </section>
                </div>
             </div>

             <button 
                onClick={fetchResources} 
                disabled={isSearchingResources || !diaryContent.proud || !diaryContent.learned || !diaryContent.interest}
                className="w-full py-5 rounded-2xl bg-white text-black font-black text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 disabled:bg-gray-800 disabled:text-gray-500 transition-all"
             >
                {isSearchingResources ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <span>일기를 간직하고 추천 정보 찾는 중...</span>
                  </>
                ) : (
                  <>
                    <span>일기장 덮고 정보 탐색하기</span>
                    <ChevronRight size={20} />
                  </>
                )}
             </button>
          </div>
        )}

        {/* --- STEP 3: RESOURCES (성찰 완료 화면) --- */}
        {subStep === 'RESOURCES' && (
          <div className="animate-fade-in pt-6 text-left">
             <div className="mb-10 flex flex-col items-center text-center">
                <h2 className="text-xl font-black mb-2">성찰 완료! 수고하셨습니다.</h2>
                <p className="text-gray-400 text-sm break-keep">진심 어린 기록은 더 단단한 커리어 나무를 키우는 밑거름이 됩니다.</p>
             </div>

             {aiAdvice && (
               <div className="mb-10 relative group">
                 <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                 <div className="relative bg-gray-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <BookOpen size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] block mb-0.5">Career Insight</span>
                        <h3 className="text-lg font-bold text-white">Gemini의 커리어 가이드</h3>
                      </div>
                   </div>
                   <div className="text-sm text-gray-300 leading-relaxed markdown-body prose prose-invert max-w-none">
                      <Markdown
                        components={{
                          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline underline-offset-4 hover:text-indigo-300 transition-colors" />
                        }}
                      >
                        {aiAdvice}
                      </Markdown>
                   </div>
                 </div>
               </div>
             )}

             <button onClick={onClose} className="w-full py-5 rounded-2xl bg-white text-black font-black text-lg shadow-2xl active:scale-95 transition-all">메인 대시보드로 돌아가기</button>
          </div>
        )}
      </div>
    </div>
  );
};
