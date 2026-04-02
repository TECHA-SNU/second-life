
import React, { useState, useEffect, useRef } from 'react';
import { AppView, ChatLog } from './types';
import { NavButton } from './components/NavButton';
import { ChatInterface } from './components/ChatInterface';
import { SelfUnderstanding } from './components/SelfUnderstanding';
import { HollandTest } from './components/HollandTest';
import { JobExploration } from './components/JobExploration';
import { GoalManager } from './components/GoalManager'; 
import { ValuePyramid } from './components/ValuePyramid'; 
import { ActionTracker } from './components/ActionTracker'; 
import { Reflection } from './components/Reflection';
import { AdminDashboard } from './components/AdminDashboard';
import { UserProfile } from './components/UserProfile';
import { InterimReport } from './components/InterimReport';
import { MasterReport } from './components/MasterReport';
import { Onboarding } from './components/Onboarding';
import { saveUserProfile, fetchLatestHollandResult, fetchUserChatLogs, fetchUserActions, getUserProfile } from './services/firebase';
import { User, Target, Zap, BookOpen, Sparkles, ArrowLeft, LogIn, Check, UserCog, ArrowRight, LogOut, Shield, Settings, X, Lock, ChevronRight, Download, RefreshCw, Star, Map, Briefcase, Heart, Mountain, ListTodo, Quote, Award, Info, Lightbulb, Youtube, Image as ImageIcon, Circle, Sprout, TreeDeciduous, Flower2, CloudRain, Sun, Search, FileText, ClipboardCheck, Fingerprint } from 'lucide-react';

// 나무 성장 시각화 컴포넌트
const CareerTree: React.FC<{ progress: number }> = ({ progress }) => {
  const getStage = () => {
    if (progress <= 0) return { 
      icon: <div className="w-4 h-4 bg-amber-900/60 rounded-full blur-[2px] animate-pulse" />, 
      label: "씨앗 단계", 
      color: "text-amber-700" 
    };
    if (progress <= 25) return { 
      icon: <Sprout size={48} className="animate-bounce" />, 
      label: "뿌리 내리는 나무", 
      color: "text-green-400" 
    };
    if (progress <= 50) return { 
      icon: <TreeDeciduous size={56} className="text-green-500 transition-all" />, 
      label: "성장하는 나무", 
      color: "text-green-500" 
    };
    if (progress <= 75) return { 
      icon: <div className="relative scale-110"><TreeDeciduous size={64} className="text-emerald-500" /><div className="absolute -top-1 -right-1 opacity-40"><TreeDeciduous size={32} className="text-emerald-300 rotate-12" /></div></div>, 
      label: "풍성해진 나무", 
      color: "text-emerald-500" 
    };
    return { 
      icon: (
        <div className="relative scale-125">
          <TreeDeciduous size={72} className="text-green-600" />
          <Flower2 size={24} className="absolute top-1 right-1 text-pink-400 animate-pulse" />
          <Flower2 size={20} className="absolute top-5 left-1 text-yellow-400 animate-pulse" style={{animationDelay: '1s'}} />
          <Sparkles size={16} className="absolute -top-2 left-1/2 -translate-x-1/2 text-white animate-spin-slow" />
        </div>
      ), 
      label: "꽃 피는 커리어 나무", 
      color: "text-indigo-400" 
    };
  };

  const stage = getStage();

  return (
    <div className="flex flex-col items-center justify-center py-6 group">
      <div className={`mb-5 transition-all duration-1000 transform group-hover:scale-110 h-20 flex items-center justify-center ${stage.color}`}>
        {stage.icon}
      </div>
      <div className="flex flex-col items-center">
        <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${stage.color}`}>{stage.label}</span>
        <div className="flex items-center gap-2">
           <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000" style={{ width: `${progress}%` }} />
           </div>
           <span className="text-[10px] font-bold text-gray-500">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

const MiniProgress: React.FC<{ percentage: number, color: string }> = ({ percentage, color }) => {
  const radius = 11;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 32 32" className="transform -rotate-90 w-full h-full">
        <circle cx="16" cy="16" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-white/10" />
        <circle cx="16" cy="16" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`${color} transition-all duration-1000 ease-out`} />
      </svg>
      <span className="absolute text-[7px] font-black text-white leading-none tracking-tighter">{percentage}%</span>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [userName, setUserName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [progress, setProgress] = useState({ self: 0, goal: 0, action: 0, reflection: 0 });
  const [loginMode, setLoginMode] = useState<'NEW' | 'CONTINUE'>('NEW');
  const [isConsentChecked, setIsConsentChecked] = useState<boolean>(false);
  const [showAdminAuth, setShowAdminAuth] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');

  useEffect(() => {
    if (isLoggedIn && currentView === AppView.LANDING) {
      updateProgress();
    }
  }, [isLoggedIn, currentView]);

  const updateProgress = async () => {
    try {
      const [holland, logsData, actionsData, profile] = await Promise.all([
        fetchLatestHollandResult(userName),
        fetchUserChatLogs(userName),
        fetchUserActions(userName),
        getUserProfile(userName)
      ]);

      const logs = logsData as ChatLog[];
      
      // 자기이해 단계: 온보딩(20%) + 홀랜드(40%) + 강점분석(40%)
      let selfProg = 0;
      if (profile?.onboarding) selfProg += 20;
      if (holland) selfProg += 40;
      if (logs.some(l => l.type === 'STRENGTHS')) selfProg += 40;

      let goalProg = 0;
      if (logs.some(l => l.type === 'GOAL_SETTING')) goalProg = 100;

      let actionProg = 0;
      if (actionsData && actionsData.items && actionsData.items.length > 0) actionProg = 100;

      let reflectProg = 0;
      if (logs.some(l => l.type === 'reflection_text')) reflectProg = 100;

      setProgress({
        self: Math.min(selfProg, 100),
        goal: Math.min(goalProg, 100),
        action: Math.min(actionProg, 100),
        reflection: Math.min(reflectProg, 100)
      });
    } catch (e) {
      console.error("Progress update error", e);
    }
  };

  const totalOverallProgress = Math.round((progress.self + progress.goal + progress.action + progress.reflection) / 4);

  const handleLogin = async () => {
    if (!inputValue.trim()) return;
    if (loginMode === 'NEW' && !isConsentChecked) {
      alert("연구 데이터 수집 및 이용 동의에 체크해주세요.");
      return;
    }
    setUserName(inputValue);
    setIsLoggedIn(true);
    saveUserProfile(inputValue).catch(err => console.error("Firebase error", err));
  };

  const handleLogout = () => {
    if (window.confirm("로그아웃 하시겠습니까? 현재 진행 중인 세션이 종료되고 초기 화면으로 이동합니다.")) {
      setIsLoggedIn(false);
      setUserName('');
      setInputValue('');
      setIsConsentChecked(false);
      setCurrentView(AppView.LANDING);
    }
  };

  const handleAdminAuthSubmit = () => {
    if (adminPasswordInput === "admin1234") {
      setCurrentView(AppView.ADMIN);
      setShowAdminAuth(false);
      setAdminPasswordInput('');
    } else {
      alert("암호가 올바르지 않습니다.");
      setAdminPasswordInput('');
    }
  };

  if (currentView === AppView.ADMIN) {
    return <AdminDashboard onClose={() => setCurrentView(AppView.LANDING)} />;
  }

  const careerGoalExamples = [
    { title: "디지털 리터러시 강사", desc: "시니어 대상 스마트폰 및 키오스크 교육 전문가" },
    { title: "마을 공동체 활동가", desc: "지역 사회 문제를 해결하고 공동체를 활성화하는 리더" },
    { title: "중소기업 경영 고문", desc: "수십 년의 실무 경험을 바탕으로 스타트업 성장을 돕는 멘토" },
    { title: "친환경 텃밭 큐레이터", desc: "도시 농업을 전파하고 생태 교육을 진행하는 전문가" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-black text-white relative overflow-hidden font-sans">
      
      {showAdminAuth && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-purple-400 font-bold"><Shield size={20} /><h3>관리자 인증</h3></div>
              <button onClick={() => setShowAdminAuth(false)} className="text-gray-500"><X size={20} /></button>
            </div>
            <input 
              type="password"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') handleAdminAuthSubmit();
              }}
              placeholder="암호 입력"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-purple-500"
              autoFocus
            />
            <button onClick={handleAdminAuthSubmit} className="w-full py-3 rounded-xl bg-purple-600 font-bold text-sm">인증하기</button>
          </div>
        </div>
      )}

      {currentView === AppView.LANDING ? (
        <div className="flex flex-col h-screen max-w-lg mx-auto relative z-10">
          
          <div className="absolute top-6 right-6 z-20 flex gap-2">
            {isLoggedIn && (
              <button onClick={handleLogout} title="로그아웃" className="p-2.5 rounded-full glass-panel border border-white/5 text-gray-500 hover:text-red-400 transition-all">
                <LogOut size={20} />
              </button>
            )}
            <button onClick={() => setShowAdminAuth(true)} title="설정" className="p-2.5 rounded-full glass-panel border border-white/5 text-gray-500 hover:text-white transition-all">
              <Settings size={20} />
            </button>
          </div>

          <div className={`w-full px-8 pb-4 shrink-0 transition-all duration-700 ${isLoggedIn ? 'pt-12' : 'pt-24'}`}>
             <div className="flex items-center gap-2 mb-2">
                <span className="h-px w-8 bg-purple-500/50"></span>
                <span className="text-purple-400 text-[10px] tracking-[0.2em] uppercase font-bold">Second Life Career Design Lab</span>
             </div>
             <div className="flex items-baseline gap-1">
                <span className="text-4xl font-light text-purple-500/50">[</span>
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-indigo-200 tracking-tighter">my career</h1>
                <span className="text-4xl font-light text-purple-500/50">]</span>
             </div>
             <p className="text-gray-400 text-xs mt-3 leading-relaxed font-medium">
               중장년의 풍부한 경험을 새로운 커리어로 디자인합니다.
             </p>
          </div>

          <div className={`flex-1 flex flex-col w-full px-6 pb-6 ${!isLoggedIn ? 'pt-2 items-center justify-start overflow-y-auto scrollbar-hide' : 'pt-0 items-center justify-start overflow-y-auto scrollbar-hide'}`}>
            {!isLoggedIn ? (
              <div className="w-full flex flex-col gap-6 animate-fade-in mt-4">
                <div className="w-full max-w-[340px] mx-auto glass-panel p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl mb-8">
                      <button onClick={() => setLoginMode('NEW')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${loginMode === 'NEW' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-500'}`}>처음 시작</button>
                      <button onClick={() => setLoginMode('CONTINUE')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${loginMode === 'CONTINUE' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-500'}`}>계속하기</button>
                    </div>
                    
                    <div className="flex flex-col gap-5">
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                          type="text" 
                          value={inputValue} 
                          onChange={(e) => setInputValue(e.target.value)} 
                          placeholder="성함을 입력해주세요" 
                          className="w-full bg-gray-900/50 border border-white/10 rounded-2xl px-12 py-4 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-all shadow-inner" 
                          onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing) return;
                            if (e.key === 'Enter') handleLogin();
                          }} 
                        />
                      </div>
                      
                      {loginMode === 'NEW' && (
                        <label className="flex items-center justify-center gap-3 cursor-pointer group select-none py-1">
                          <input type="checkbox" className="hidden" checked={isConsentChecked} onChange={(e) => setIsConsentChecked(e.target.checked)} />
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isConsentChecked ? 'bg-purple-500 border-purple-500 shadow-lg shadow-purple-900/20' : 'border-gray-700 group-hover:border-gray-600'}`}>
                            {isConsentChecked && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span className="text-[11px] text-gray-500 group-hover:text-gray-400 font-medium">데이터 활용 및 수집에 동의합니다</span>
                        </label>
                      )}
                      
                      <button onClick={handleLogin} className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-black text-sm text-white shadow-2xl shadow-purple-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 py-4">
                        상담 시작하기
                        <ArrowRight size={18} />
                      </button>
                    </div>
                </div>

                <div className="w-full space-y-4 px-2 mb-10">
                   <div className="flex items-center gap-2 text-purple-400/60 px-1">
                      <Lightbulb size={16} />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">커리어 전환 성공 예시</h3>
                   </div>
                   <div className="grid grid-cols-1 gap-3">
                      {careerGoalExamples.map((ex, i) => (
                        <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] flex flex-col gap-1 hover:bg-white/10 transition-colors cursor-default">
                           <span className="text-xs font-bold text-gray-200">{ex.title}</span>
                           <span className="text-[10px] text-gray-500 leading-tight font-medium">{ex.desc}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-4 animate-slide-up pb-10">
                <div className="pt-2 mb-2 flex justify-between items-start">
                   <div>
                     <p className="text-gray-400 text-sm">반갑습니다. <span className="font-bold text-white">{userName}</span>님</p>
                     <h2 className="text-2xl font-black text-white mt-1 tracking-tight leading-tight">
                       '진로 상담'으로<br/>나만의 나무를 가꿔보세요.
                     </h2>
                     <button
                        onClick={() => setCurrentView(AppView.ONBOARDING)}
                        className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-xs font-black hover:bg-emerald-500/20 transition-all active:scale-95 shadow-lg shadow-emerald-900/10 group"
                     >
                        <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                        온보딩하기
                     </button>
                   </div>
                   <CareerTree progress={totalOverallProgress} />
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div onClick={() => setCurrentView(AppView.SELF_UNDERSTANDING)} className="cursor-pointer group relative bg-white/5 border border-white/10 p-5 rounded-[2.5rem] hover:bg-white/10 hover:border-purple-500/30 transition-all flex flex-col gap-3 min-h-[160px] shadow-xl">
                    <div className="flex justify-between items-start">
                       <div className="w-11 h-11 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/20"><User size={24}/></div>
                       <span className="text-2xl font-black italic text-white/5 group-hover:text-purple-500/10 transition-colors">01</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5"><h4 className="font-black text-white text-base truncate">자기이해</h4><MiniProgress percentage={progress.self} color="text-purple-500" /></div>
                      <p className="text-[10px] text-gray-500 leading-tight font-medium">나만의 강점 및 흥미 진단</p>
                    </div>
                  </div>
                  
                  <div onClick={() => setCurrentView(AppView.GOAL_MANAGER)} className="cursor-pointer group relative bg-white/5 border border-white/10 p-5 rounded-[2.5rem] hover:bg-white/10 hover:border-indigo-500/30 transition-all flex flex-col gap-3 min-h-[160px] shadow-xl">
                    <div className="flex justify-between items-start">
                       <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-900/20"><Target size={24}/></div>
                       <span className="text-2xl font-black italic text-white/5 group-hover:text-indigo-500/10 transition-colors">02</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5"><h4 className="font-black text-white text-base truncate">목표설정</h4><MiniProgress percentage={progress.goal} color="text-indigo-500" /></div>
                      <p className="text-[10px] text-gray-500 leading-tight font-medium">가치관 및 행동의도 설정</p>
                    </div>
                  </div>

                  <div className="col-span-2 px-2">
                    <button 
                      onClick={() => setCurrentView(AppView.INTERIM_REPORT)}
                      className="w-full flex items-center justify-between px-6 py-4 rounded-[1.5rem] glass-panel border border-purple-500/20 hover:bg-purple-500/10 transition-all active:scale-[0.98] group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:rotate-12 transition-transform">
                          <ClipboardCheck size={22} />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-black block">커리어 중간 리포트</span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Self-Understanding & Goal</span>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-purple-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <div onClick={() => setCurrentView(AppView.ACTION_TRACKER)} className="cursor-pointer group relative bg-white/5 border border-white/10 p-5 rounded-[2.5rem] hover:bg-white/10 hover:border-teal-500/30 transition-all flex flex-col gap-3 min-h-[160px] shadow-xl">
                    <div className="flex justify-between items-start">
                       <div className="w-11 h-11 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-300 group-hover:scale-110 transition-transform shadow-lg shadow-teal-900/20"><Zap size={24}/></div>
                       <span className="text-2xl font-black italic text-white/5 group-hover:text-teal-500/10 transition-colors">03</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5"><h4 className="font-black text-white text-base truncate">행동실행</h4><MiniProgress percentage={progress.action} color="text-teal-500" /></div>
                      <p className="text-[10px] text-gray-500 leading-tight font-medium">실천 계획 및 현황 관리</p>
                    </div>
                  </div>

                  <div onClick={() => setCurrentView(AppView.REFLECTION)} className="cursor-pointer group relative bg-white/5 border border-white/10 p-5 rounded-[2.5rem] hover:bg-white/10 hover:border-blue-500/30 transition-all flex flex-col gap-3 min-h-[160px] shadow-xl">
                    <div className="flex justify-between items-start">
                       <div className="w-11 h-11 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-300 group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/20"><BookOpen size={24}/></div>
                       <span className="text-2xl font-black italic text-white/5 group-hover:text-blue-500/10 transition-colors">04</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5"><h4 className="font-black text-white text-base truncate">성찰학습</h4><MiniProgress percentage={progress.reflection} color="text-blue-500" /></div>
                      <p className="text-[10px] text-gray-500 leading-tight font-medium">경험의 성찰과 성장 일기</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                   <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest pl-1">Profiles & Insights</h3>
                   <div className="grid grid-cols-2 gap-3 w-full">
                    <button onClick={() => setCurrentView(AppView.PROFILE)} className="flex items-center gap-3 p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group">
                      <UserCog size={20} className="text-gray-400 group-hover:text-white transition-colors shrink-0" />
                      <span className="text-xs font-bold">프로필 센터</span>
                    </button>
                    <button onClick={() => setCurrentView(AppView.PLAYGROUND)} className="flex items-center gap-3 p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group">
                      <Sparkles size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold">AI 실험실</span>
                    </button>
                  </div>

                  {/* 마스터 리포트 뷰로 이동하도록 수정 */}
                  <button 
                    onClick={() => setCurrentView(AppView.MASTER_REPORT)}
                    className="w-full flex items-center justify-between gap-4 py-6 px-6 rounded-[2.5rem] bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white font-black text-sm shadow-2xl shadow-purple-900/40 transition-all active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:rotate-6 transition-all">
                        <Award size={28} />
                      </div>
                      <div className="flex flex-col items-start leading-none">
                        <span className="text-lg mb-1.5">커리어 마스터 리포트 발행</span>
                        <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest">Generate Comprehensive Portfolio</span>
                      </div>
                    </div>
                    <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                
                <div className="w-full flex justify-between mt-8 px-1 pb-10">
                  <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1.5 font-bold"><LogOut size={14}/>로그아웃</button>
                  <button onClick={() => setShowAdminAuth(true)} className="text-[10px] text-gray-800 hover:text-purple-400 transition-colors flex items-center gap-1.5 font-black uppercase tracking-widest"><Shield size={12}/>Admin Console</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10">
          {currentView === AppView.ONBOARDING && <Onboarding userName={userName} onClose={() => setCurrentView(AppView.LANDING)} />}
          {currentView === AppView.SELF_UNDERSTANDING && <SelfUnderstanding userName={userName} onClose={() => setCurrentView(AppView.LANDING)} onNext={() => setCurrentView(AppView.HOLLAND_TEST)} />}
          {currentView === AppView.HOLLAND_TEST && <HollandTest userName={userName} onComplete={() => setCurrentView(AppView.GOAL_MANAGER)} onBack={() => setCurrentView(AppView.SELF_UNDERSTANDING)} onClose={() => setCurrentView(AppView.LANDING)} />}
          {currentView === AppView.JOB_EXPLORATION && <JobExploration userName={userName} onClose={() => setCurrentView(AppView.LANDING)} onNext={() => setCurrentView(AppView.GOAL_MANAGER)} onBack={() => setCurrentView(AppView.HOLLAND_TEST)} />}
          {currentView === AppView.GOAL_MANAGER && <GoalManager userName={userName} onClose={() => setCurrentView(AppView.LANDING)} onBack={() => setCurrentView(AppView.HOLLAND_TEST)} onNext={() => setCurrentView(AppView.GOAL_SETTING)} />}
          {currentView === AppView.GOAL_SETTING && <ValuePyramid userName={userName} onClose={() => setCurrentView(AppView.LANDING)} onNext={() => setCurrentView(AppView.ACTION_EXECUTION)} />}
          {currentView === AppView.ACTION_EXECUTION && <ChatInterface userName={userName} onClose={() => setCurrentView(AppView.LANDING)} onNext={() => setCurrentView(AppView.ACTION_TRACKER)} sessionType="ACTION_EXECUTION" />}
          {currentView === AppView.ACTION_TRACKER && <ActionTracker userName={userName} onClose={() => setCurrentView(AppView.LANDING)} onNext={() => setCurrentView(AppView.REFLECTION)} />}
          {currentView === AppView.REFLECTION && <Reflection userName={userName} onClose={() => setCurrentView(AppView.LANDING)} onBack={() => setCurrentView(AppView.ACTION_TRACKER)} />}
          {currentView === AppView.PROFILE && <UserProfile userName={userName} onClose={() => setCurrentView(AppView.LANDING)} />}
          {currentView === AppView.INTERIM_REPORT && <InterimReport userName={userName} onClose={() => setCurrentView(AppView.LANDING)} />}
          {currentView === AppView.MASTER_REPORT && <MasterReport userName={userName} onClose={() => setCurrentView(AppView.LANDING)} />}
        </div>
      )}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .animate-blink {
          animation: blink 1s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
