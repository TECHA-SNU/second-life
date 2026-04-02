
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Home, Sparkles, Save, User, GraduationCap, Briefcase, Award, RefreshCw, CheckCircle2 } from 'lucide-react';
import { updateOnboardingData, getUserProfile } from '../services/firebase';

interface OnboardingProps {
  userName: string;
  onClose: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ userName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    education: '',
    career: '',
    qualifications: ''
  });

  useEffect(() => {
    loadExistingData();
  }, [userName]);

  const loadExistingData = async () => {
    setLoading(true);
    try {
      const profile = await getUserProfile(userName);
      if (profile?.onboarding) {
        setFormData({
          age: profile.onboarding.age || '',
          education: profile.onboarding.education || '',
          career: profile.onboarding.career || '',
          qualifications: profile.onboarding.qualifications || ''
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateOnboardingData(userName, formData);
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <RefreshCw size={32} className="text-emerald-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-400">정보를 불러오고 있습니다...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white animate-fade-in">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
          <CheckCircle2 size={40} className="text-emerald-400 animate-bounce" />
        </div>
        <h2 className="text-2xl font-black mb-2">저장 완료!</h2>
        <p className="text-gray-400 text-sm">상담을 위한 기초 데이터가 준비되었습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden animate-fade-in">
      <div className="px-6 py-4 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-40 border-b border-white/5">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-black tracking-tight text-emerald-400">커리어 온보딩</h1>
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest italic">Foundation Profile</span>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
          <Home size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-10 max-w-lg mx-auto w-full">
        <div className="mb-8">
           <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Sparkles size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Setup your profile</span>
           </div>
           <h2 className="text-3xl font-black mb-4 leading-tight">
             더 정교한 상담을 위해<br/>기초 정보를 알려주세요.
           </h2>
           <p className="text-sm text-gray-500 leading-relaxed break-keep">
             기록하신 정보는 내담자님께 최적화된 직무 추천 및 목표 설정을 돕는 데 사용됩니다.
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
          <section className="space-y-4">
             <div className="flex items-center gap-2 px-1">
                <User size={16} className="text-emerald-500" />
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">나이</label>
             </div>
             <select 
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                className="w-full bg-[#111] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none transition-all"
             >
                <option value="">나이를 선택해주세요</option>
                <option value="40대">40대</option>
                <option value="50대">50대</option>
                <option value="60대 이상">60대 이상</option>
             </select>
          </section>

          <section className="space-y-4">
             <div className="flex items-center gap-2 px-1">
                <GraduationCap size={16} className="text-emerald-500" />
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">최종 학력</label>
             </div>
             <input 
                type="text"
                value={formData.education}
                onChange={(e) => setFormData({...formData, education: e.target.value})}
                placeholder="예: 대졸 (경영학 전공)"
                className="w-full bg-[#111] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
             />
          </section>

          <section className="space-y-4">
             <div className="flex items-center gap-2 px-1">
                <Briefcase size={16} className="text-emerald-500" />
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">지난 경력</label>
             </div>
             <textarea 
                value={formData.career}
                onChange={(e) => setFormData({...formData, career: e.target.value})}
                placeholder="지금까지 해오신 주요 업무나 경력을 간략히 적어주세요."
                className="w-full h-32 bg-[#111] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed transition-all shadow-inner"
             />
          </section>

          <section className="space-y-4">
             <div className="flex items-center gap-2 px-1">
                <Award size={16} className="text-emerald-500" />
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">보유중인 자격 / 기술</label>
             </div>
             <textarea 
                value={formData.qualifications}
                onChange={(e) => setFormData({...formData, qualifications: e.target.value})}
                placeholder="전문 자격증이나 본인만의 숙련된 기술이 있다면 알려주세요."
                className="w-full h-32 bg-[#111] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed transition-all shadow-inner"
             />
          </section>

          <div className="pt-4">
            <button 
               type="submit"
               disabled={isSaving}
               className="w-full py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-emerald-900/40 active:scale-95 transition-all disabled:opacity-50"
            >
               {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={24} />}
               정보 저장하고 시작하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
