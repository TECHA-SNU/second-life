
import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, User, Calendar, Clock, Award, FileText, Hash, MessageCircle, Star, Target, Map, BookOpen, Sparkles, CheckCircle, Zap, Info, GraduationCap, Briefcase } from 'lucide-react';
import { getUserProfile, fetchUserHollandResults, fetchUserChatLogs, fetchUserActions } from '../services/firebase';

interface UserProfileProps {
  userName: string;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userName, onClose }) => {
  const [profile, setProfile] = useState<any>(null);
  const [hollandResult, setHollandResult] = useState<any>(null);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userName]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userProfile, hollandData, chatData, actionData] = await Promise.all([
        getUserProfile(userName),
        fetchUserHollandResults(userName),
        fetchUserChatLogs(userName),
        fetchUserActions(userName)
      ]);

      setProfile(userProfile);
      if (hollandData && hollandData.length > 0) setHollandResult(hollandData[0]);
      setChatLogs(chatData || []);
      setActions(actionData?.items || []);
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLogByType = (type: string) => chatLogs.find(log => log.type === type)?.summary || "기록이 없습니다.";

  return (
    <div className="flex items-center justify-center min-h-screen p-4 animate-fade-in pt-12 pb-12">
      <div className="w-full max-w-5xl bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        
        <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
            <h2 className="text-xl font-bold text-white">커리어 관리 대시보드</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 왼쪽: 기본 정보 */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6 shadow-2xl">
                  <User size={40} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">{userName}</h3>
                <p className="text-sm text-purple-400 font-medium mb-8 italic">Life Explorer</p>
                <div className="w-full space-y-3 text-left">
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-gray-400 text-xs flex items-center gap-2"><Clock size={14} /> 방문</span>
                    <span className="text-white font-bold">{profile?.visitCount || 1}회</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-gray-400 text-xs flex items-center gap-2"><Calendar size={14} /> 가입</span>
                    <span className="text-white font-bold text-xs">{profile?.createdAt ? new Date(profile.createdAt.toDate()).toLocaleDateString() : '-'}</span>
                  </div>
                </div>
              </div>

              {/* 온보딩 기초 정보 섹션 추가 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info size={14} /> Basic Profile
                </h4>
                {profile?.onboarding ? (
                  <div className="space-y-4">
                     <div className="flex items-start gap-3">
                        <User size={14} className="text-gray-500 mt-1" />
                        <div>
                           <span className="text-[10px] text-gray-500 font-bold uppercase block">나이</span>
                           <span className="text-sm text-gray-200">{profile.onboarding.age}</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <GraduationCap size={14} className="text-gray-500 mt-1" />
                        <div>
                           <span className="text-[10px] text-gray-500 font-bold uppercase block">학력</span>
                           <span className="text-sm text-gray-200">{profile.onboarding.education}</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <Briefcase size={14} className="text-gray-500 mt-1" />
                        <div>
                           <span className="text-[10px] text-gray-500 font-bold uppercase block">경력</span>
                           <span className="text-xs text-gray-400 leading-relaxed line-clamp-3">{profile.onboarding.career}</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-3">
                        <Award size={14} className="text-gray-500 mt-1" />
                        <div>
                           <span className="text-[10px] text-gray-500 font-bold uppercase block">자격/기술</span>
                           <span className="text-xs text-gray-400 leading-relaxed line-clamp-3">{profile.onboarding.qualifications}</span>
                        </div>
                     </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">기초 정보가 등록되지 않았습니다.</p>
                )}
              </div>

              {/* RIASEC 요약 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Hash size={14} /> Interest Code
                </h4>
                <div className="text-3xl font-black text-purple-400 tracking-widest text-center mb-4">
                  {hollandResult?.topCode || "N/A"}
                </div>
                {getLogByType('HOLLAND_TEST') !== "기록이 없습니다." && (
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {getLogByType('HOLLAND_TEST')}
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽: 상담 로그 및 기록 */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Award className="text-purple-400" /> 커리어 핵심 강점</h4>
                <div className="bg-black/20 p-4 rounded-xl text-sm text-gray-300 leading-relaxed italic border-l-2 border-purple-500 whitespace-pre-wrap">
                  {getLogByType('STRENGTHS')}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Zap className="text-teal-400" /> 행동 의도 및 프로젝트 제안</h4>
                <div className="bg-black/20 p-4 rounded-xl text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto scrollbar-hide border-l-2 border-teal-500">
                  {getLogByType('ACTION_EXECUTION').split('\n\n').map((line, i) => (
                    <p key={i} className={`mb-2 ${line.startsWith(`[코치]`) ? 'text-indigo-300' : 'text-white font-medium'}`}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Target className="text-indigo-400" /> 실천 중인 목표</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {actions.length > 0 ? actions.map((a, i) => (
                    <div key={i} className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${a.status === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span className="text-xs text-gray-300 truncate">{a.title}</span>
                    </div>
                  )) : <p className="text-xs text-gray-500 col-span-2">설정된 목표가 없습니다.</p>}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MessageCircle className="text-green-400" /> 최종 성찰 기록</h4>
                <div className="bg-black/20 p-4 rounded-xl text-sm text-gray-300 leading-relaxed italic border-l-2 border-green-500 whitespace-pre-wrap">
                  {getLogByType('reflection_text')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
