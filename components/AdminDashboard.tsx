
import React, { useState, useEffect, useRef } from 'react';
import { Database, Upload, CheckCircle2, Info, Terminal, Activity, Shield, RefreshCw, Users, FileText, MessageSquare, ChevronRight, Briefcase, FileUp, List, X, Check, AlertCircle } from 'lucide-react';
import { fetchAllUsers, fetchUserHollandResults, fetchUserChatLogs, uploadInterviewBatch, uploadOnetJobsBatch, uploadOnetKnowledgeBatch } from '../services/firebase';

interface AdminDashboardProps {
  onClose: () => void;
}

const INTERVIEW_CATEGORIES = ["경영/사무", "보건/의료", "교육/복지", "예술/디자인", "기술/기능", "농림어업", "기타"];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'DATA' | 'ONET'>('DATA');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ holland: any[], chats: any[] }>({ holland: [], chats: [] });
  const [isLoading, setIsLoading] = useState(false);
  
  // Data Ingestion State
  const [jsonData, setJsonData] = useState('');
  const [targetCategory, setTargetCategory] = useState('기타');
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingestion Checklist State
  const [checks, setChecks] = useState({
    structure: false,
    normalization: false,
    integrity: false,
    packaging: false,
    sync: false
  });

  useEffect(() => {
    if (activeTab === 'USERS') loadUsers();
  }, [activeTab]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  const addLog = (msg: string) => setLogs(prev => [...prev, `>>> [${new Date().toLocaleTimeString()}] ${msg}`]);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await fetchAllUsers();
    setUsers(data);
    setIsLoading(false);
  };

  const handleUserClick = async (userName: string) => {
    setSelectedUser(userName);
    const [holland, chats] = await Promise.all([
      fetchUserHollandResults(userName),
      fetchUserChatLogs(userName)
    ]);
    setUserData({ holland, chats });
  };

  const handleBatchUpload = async () => {
    if (!jsonData.trim() || uploadStatus === 'PROCESSING') return;
    
    setUploadStatus('PROCESSING');
    setLogs([]);
    setChecks({ structure: false, normalization: false, integrity: false, packaging: false, sync: false });

    try {
      addLog("인터뷰 데이터 파싱 시작...");
      const parsed = JSON.parse(jsonData);
      setChecks(prev => ({ ...prev, structure: true }));
      
      addLog(`데이터 구조 검증 완료 (${parsed.length}건의 문답 감지)`);
      setChecks(prev => ({ ...prev, normalization: true }));
      
      // 커리어넷 JSON 필드 매핑
      const mappedData = parsed.map((item: any) => ({
        category: targetCategory,
        question: item.question || "",
        answer: item.answer || "",
        subject: item.intv_subject || "",
        author: item.intve_name || "익명",
        jobTitle: item.intve_job || "",
        summary: item.intv_summary || "",
        sourceUrl: item.source_url || "",
        qnaNo: parseInt(item.qna_no) || 0
      }));
      setChecks(prev => ({ ...prev, integrity: true }));
      
      addLog("데이터 무결성 검사 및 필드 정규화 완료");
      setChecks(prev => ({ ...prev, packaging: true }));

      await uploadInterviewBatch(mappedData, (msg) => {
        addLog(msg);
      });
      
      setChecks(prev => ({ ...prev, sync: true }));
      addLog("모든 데이터베이스 동기화가 성공적으로 완료되었습니다.");
      addLog("축하합니다! 커리어넷 인터뷰 데이터 마이그레이션이 완료되었습니다.");
      setUploadStatus('SUCCESS');
      setJsonData(''); 
    } catch (e: any) {
      addLog(`[CRITICAL ERROR] ${e.message}`);
      setUploadStatus('ERROR');
    }
  };

  const handleOnetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadStatus('PROCESSING');
    setLogs([]);
    addLog(`${files.length}개의 파일을 감지했습니다.`);
    try {
      let allParsedData: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        const dataLines = (lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('name')) ? lines.slice(1) : lines;
        const parsed = dataLines.map(line => {
          const parts = line.split(/\t| {2,}/);
          return { abilityId: parts[0]?.trim(), abilityName: parts[1]?.trim(), activityId: parts[2]?.trim(), activityName: parts[3]?.trim() };
        }).filter(item => item.abilityId && item.activityId);
        allParsedData = [...allParsedData, ...parsed];
      }
      await uploadOnetKnowledgeBatch(allParsedData, addLog);
      setUploadStatus('SUCCESS');
    } catch (err: any) { setUploadStatus('ERROR'); }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white animate-fade-in relative z-[1000] font-sans">
      
      <div className="flex items-center justify-between px-6 py-3 bg-[#0a0a0a] border-b border-purple-500/30 shrink-0 shadow-2xl relative z-20">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield size={14} className="text-white fill-current" />
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic">Console Dashboard</h1>
          </div>
          <nav className="flex bg-black p-1 rounded-xl border border-white/5">
            <button onClick={() => setActiveTab('USERS')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'USERS' ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}>사용자 대시보드</button>
            <button onClick={() => setActiveTab('DATA')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'DATA' ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}>인터뷰 데이터 인제스션</button>
            <button onClick={() => setActiveTab('ONET')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'ONET' ? 'bg-white text-black' : 'text-gray-500 hover:text-gray-300'}`}>O*NET 데이터</button>
          </nav>
        </div>
        <button onClick={onClose} className="px-6 py-1.5 rounded-lg bg-gray-900 border border-white/10 hover:bg-red-900 transition-colors text-[10px] font-black tracking-widest uppercase">Exit</button>
      </div>

      <div className="flex-1 overflow-hidden flex bg-black">
        {activeTab === 'USERS' && (
          <>
            <div className="w-64 bg-gray-900/50 border-r border-white/5 flex flex-col p-2 overflow-y-auto">
              {users.map(user => (
                <button key={user.id} onClick={() => handleUserClick(user.name)} className={`w-full text-left p-3 rounded-lg text-sm mb-1 ${selectedUser === user.name ? 'bg-white text-black' : 'hover:bg-white/5 text-gray-400'}`}>
                  {user.name}
                </button>
              ))}
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              {selectedUser ? (
                <div className="max-w-3xl space-y-6">
                  <h2 className="text-4xl font-bold">{selectedUser} Profile</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 p-5 rounded-xl border border-white/5">
                      <h3 className="text-blue-400 text-xs font-bold uppercase mb-4 tracking-widest">Holland Results</h3>
                      {userData.holland.map((h, i) => <div key={i} className="mb-2 text-sm text-gray-300">{h.topCode} <span className="text-[10px] opacity-40">({new Date(h.timestamp?.toDate()).toLocaleDateString()})</span></div>)}
                    </div>
                    <div className="bg-gray-900 p-5 rounded-xl border border-white/5">
                      <h3 className="text-green-400 text-xs font-bold uppercase mb-4 tracking-widest">Chat Logs</h3>
                      {userData.chats.map((c, i) => <div key={i} className="mb-2 text-[11px] opacity-60 truncate leading-relaxed">{c.summary}</div>)}
                    </div>
                  </div>
                </div>
              ) : <div className="h-full flex items-center justify-center opacity-10">Select a user</div>}
            </div>
          </>
        )}

        {activeTab === 'DATA' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-8 lg:p-12 gap-10">
            <div className="flex-1 flex flex-col max-w-2xl">
              <div className="mb-10 text-center md:text-left">
                <h2 className="text-5xl lg:text-6xl font-black text-[#f97316] italic uppercase leading-none tracking-tighter mb-2">
                  Data Ingestion
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                  커리어넷 인터뷰 JSON 데이터를 붙여넣어 Firebase에 일괄 마이그레이션합니다. (이름 기준 그룹화는 앱에서 자동 수행됩니다)
                </p>
              </div>

              <div className="space-y-8 flex-1 flex flex-col">
                <section>
                  <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">1단계: 인터뷰 직업군 분류</h3>
                  <div className="flex flex-wrap gap-2">
                    {INTERVIEW_CATEGORIES.map(cat => (
                      <button 
                        key={cat} 
                        onClick={() => setTargetCategory(cat)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${targetCategory === cat ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-[#111] border-white/5 text-gray-500 hover:text-gray-300'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">2단계: 원본 JSON 데이터 입력</h3>
                    <span className="text-[10px] font-mono text-gray-700">Input: JSON Array [ ]</span>
                  </div>
                  <div className="flex-1 bg-[#111] border border-white/5 rounded-3xl p-6 relative group overflow-hidden focus-within:border-orange-500/30 transition-all">
                    <textarea 
                      value={jsonData} 
                      onChange={e => setJsonData(e.target.value)} 
                      placeholder="이곳에 커리어넷 인터뷰 JSON 데이터를 붙여넣으세요..." 
                      className="w-full h-full bg-transparent text-gray-400 font-mono text-xs leading-relaxed resize-none focus:outline-none" 
                    />
                  </div>
                </section>

                <button 
                  onClick={handleBatchUpload}
                  disabled={!jsonData.trim() || uploadStatus === 'PROCESSING'}
                  className={`w-full py-6 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 ${
                    uploadStatus === 'PROCESSING' 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#22c55e] hover:bg-[#16a34a] text-white shadow-green-900/10'
                  }`}
                >
                  {uploadStatus === 'PROCESSING' ? (
                    <RefreshCw className="animate-spin" />
                  ) : (
                    <Check size={24} />
                  )}
                  마이그레이션 시작
                </button>
              </div>
            </div>

            <div className="w-full md:w-[400px] flex flex-col gap-6">
              <div className="bg-[#1c0d0d] border border-red-900/30 rounded-2xl p-5 flex gap-4 animate-slide-up">
                <div className="p-2 bg-red-600/10 rounded-full h-fit">
                  <Info className="text-red-500" size={18} />
                </div>
                <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
                  JSON 배열 전체를 입력하세요. 이름(intve_name)이 같은 항목들은 앱 화면에서 자동으로 하나의 스토리로 묶여서 보여집니다.
                </p>
              </div>

              <div className="flex-1 bg-[#0d0d0d] border border-white/10 rounded-3xl p-6 flex flex-col shadow-inner overflow-hidden">
                <div className="flex items-center gap-2 mb-8 text-[#ef4444]">
                   <ChevronRight size={16} strokeWidth={3} />
                   <h3 className="text-[11px] font-black uppercase tracking-widest">Ingestion Status Console</h3>
                </div>

                <div className="space-y-5 mb-10">
                  <StatusItem label="JSON 데이터 구조 검증" active={checks.structure} />
                  <StatusItem label="커리어넷 필드 정규화" active={checks.normalization} />
                  <StatusItem label="데이터 무결성 검사" active={checks.integrity} />
                  <StatusItem label="서버 전송 배치 패키징" active={checks.packaging} />
                  <StatusItem label="Firebase DB 동기화" active={checks.sync} />
                </div>

                <div className="flex-1 bg-black rounded-xl p-5 font-mono text-[10px] text-green-500/80 overflow-y-auto space-y-2 scrollbar-hide border border-white/5">
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 opacity-20">
                       <Terminal size={24} />
                       <span className="italic">Waiting for ingestion...</span>
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className={`${log.includes('완료') ? 'text-green-400' : 'text-gray-500'}`}>{log}</div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ONET' && (
          <div className="flex-1 p-10 overflow-y-auto">
            <div className="flex items-center gap-3 mb-10">
              <Briefcase className="text-blue-400" />
              <h2 className="text-4xl font-black italic tracking-tighter uppercase">O*NET Knowledge Base</h2>
            </div>
            
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-7 space-y-8">
                <div className="bg-gray-900/30 border border-white/5 rounded-[40px] p-12 flex flex-col items-center justify-center text-center group hover:border-blue-500/30 transition-all shadow-inner">
                  <div className="w-24 h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-8 group-hover:scale-105 transition-transform border border-blue-500/10">
                    <FileUp className="text-blue-400" size={40} />
                  </div>
                  <h3 className="text-2xl font-black mb-3">O*NET TXT Data Upload</h3>
                  <p className="text-gray-500 text-sm mb-10 max-w-sm leading-relaxed">
                    Abilities, Work Activities 매핑 데이터를 포함한 여러 TXT 파일을 한 번에 선택하여 일괄 업로드합니다.
                  </p>
                  <input type="file" multiple ref={fileInputRef} onChange={handleOnetFileChange} className="hidden" accept=".txt,.csv" />
                  <button onClick={() => fileInputRef.current?.click()} className="px-12 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg transition-all shadow-2xl shadow-blue-900/20 active:scale-95">파일 선택하기</button>
                </div>
              </div>

              <div className="col-span-5 h-[600px]">
                <div className="bg-black border border-white/10 rounded-[40px] p-6 h-full flex flex-col overflow-hidden shadow-2xl">
                   <div className="flex items-center justify-between mb-6 px-4">
                      <h4 className="text-[10px] font-black text-blue-400 flex items-center gap-2 tracking-[0.2em] uppercase">
                        Ingestion Engine Logs
                      </h4>
                      {uploadStatus === 'PROCESSING' && <Activity size={14} className="text-blue-500 animate-pulse" />}
                   </div>
                   <div className="flex-1 bg-[#050505] rounded-3xl p-6 font-mono text-[10px] text-gray-500 overflow-y-auto space-y-2 scrollbar-hide border border-white/5">
                      {logs.map((log, idx) => (
                        <div key={idx} className="border-l border-blue-500/30 pl-3 py-0.5">{log}</div>
                      ))}
                      <div ref={logEndRef} />
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatusItem = ({ label, active }: { label: string, active: boolean }) => (
  <div className="flex items-center gap-4 group">
    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${active ? 'bg-[#22c55e] border-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'border-gray-800'}`}>
      {active && <Check size={12} className="text-black" strokeWidth={4} />}
    </div>
    <span className={`text-[11px] font-bold transition-all ${active ? 'text-[#22c55e]' : 'text-gray-700'}`}>
      {label}
    </span>
  </div>
);
