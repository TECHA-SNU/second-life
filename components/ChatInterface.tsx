
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Send, User, Bot, Target, Zap, ListTodo, LayoutDashboard, Home, X, Heart, RefreshCw } from 'lucide-react';
import { createStrengthsChatSession, createGoalSettingChatSession, createActionExecutionChatSession } from '../services/geminiService';
import { upsertChatLog, fetchValuePriorities, fetchGoalRoadmap, fetchLatestHollandResult, fetchUserChatLogs } from '../services/firebase';
import { ChatLog } from '../types';

interface ChatInterfaceProps {
  userName: string;
  onClose: () => void;
  onNext: () => void;
  sessionType?: 'STRENGTHS' | 'GOAL_SETTING' | 'ACTION_EXECUTION';
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  userName, 
  onClose, 
  onNext, 
  sessionType = 'STRENGTHS' 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChatFinished, setIsChatFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use a ref to store the chat session instance so it persists across renders
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    const initializeChat = async () => {
      setIsInitializing(true);
      let initialMessageText = "";

      if (sessionType === 'STRENGTHS') {
        chatSessionRef.current = createStrengthsChatSession();
        initialMessageText = `안녕하세요. 저는 당신의 숨겨진 강점을 함께 찾아갈 코치입니다. \n\n지금까지 걸어오신 커리어 여정 중에서 가장 보람을 느꼈던 순간은 언제였나요? 편안하게 말씀해 주세요.`;
      } else if (sessionType === 'GOAL_SETTING') {
        chatSessionRef.current = createGoalSettingChatSession();
        initialMessageText = `안녕하세요, 앞서 발견한 강점과 흥미를 바탕으로 구체적인 목표를 세워볼 차례입니다. \n\n당신이 삶에서 타협할 수 없는 가장 중요한 '핵심 가치'는 무엇일까요? (예: 자유, 성취, 봉사, 안정 등) 이 가치에 맞는 진로 목표를 함께 찾아봅시다.`;
      } else if (sessionType === 'ACTION_EXECUTION') {
        try {
          // Firebase에서 필요한 모든 컨텍스트 가져오기
          const [valueData, roadmapData, hollandData, chatLogs] = await Promise.all([
            fetchValuePriorities(userName),
            fetchGoalRoadmap(userName),
            fetchLatestHollandResult(userName),
            fetchUserChatLogs(userName)
          ]);
          
          const topValue = valueData?.items?.[0]?.label || "중요한 가치";
          const vision = roadmapData?.vision || "멋진 미래";
          const riasecCode = hollandData?.topCode || "미진단";
          
          // 강점 분석 로그 찾기
          const strengthsLog = (chatLogs as ChatLog[]).find(l => l.type === 'STRENGTHS');
          // [강점 분석 결과]\n요약내용\n\n... 형식에서 요약 내용만 추출
          const strengthsSummary = strengthsLog?.summary?.split('\n').find((line: string) => line && !line.startsWith('[') && line.length > 5) || "훌륭한 전문성과 문제 해결 능력";
          
          // AI 세션 생성 (컨텍스트 포함)
          const context = `내담자 비전: ${vision}, 최우선 가치: ${topValue}, RIASEC: ${riasecCode}, 강점: ${strengthsSummary}`;
          chatSessionRef.current = createActionExecutionChatSession(context);

          // 첫 멘트 구성: RIASEC와 강점을 구체적으로 언급하며 시작
          initialMessageText = `안녕하세요 ${userName}님! 우리 지난 시간, 내담자님의 RIASEC 검사 결과인 '${riasecCode}' 유형과 더불어 '${strengthsSummary}'와 같은 멋진 강점들을 함께 찾아보았던 것, 기억나시나요?

이러한 강점들은 내담자님이 세우신 '${vision}'이라는 비전을 향해 나아가는 가장 든든한 무기가 될 거예요.

특히 '${topValue}'을(를) 삶의 가장 중요한 가치로 선택하신 만큼, 이 가치와 비전을 실제 삶으로 연결하기 위해 지금 당장 실천해볼 수 있는 작은 행동은 무엇이 있을까요?`;
        } catch (error) {
          console.error("Initialization error:", error);
          chatSessionRef.current = createActionExecutionChatSession();
          initialMessageText = `안녕하세요 ${userName}님, 내담자님의 강점과 비전을 바탕으로 구체적인 행동 의도를 설정해 봅시다.
가치를 삶에서 실현하기 위해 지금 즉시 해볼 수 있는 작은 행동은 무엇이 있을까요?`;
        }
      }

      const initialGreeting: Message = {
        id: 'init-1',
        text: initialMessageText,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([initialGreeting]);
      setIsInitializing(false);
      
      // 초기 멘트도 즉시 저장
      await syncConversationToFirebase([initialGreeting]);
    };

    initializeChat();
  }, [userName, sessionType]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Check if chat is finished based on the last message
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isConcludingMessage = lastMessage.sender === 'bot' && lastMessage.text.includes('이제 "상담 완료"를 누르세요.');
      setIsChatFinished(isConcludingMessage);
    }
  }, [messages]);

  /**
   * 대화 내용을 Firebase에 실시간으로 동기화합니다.
   */
  const syncConversationToFirebase = async (msgs: Message[]) => {
    try {
      const summary = msgs.map(m => {
        const name = m.sender === 'bot' ? '코치' : userName;
        return `[${name}] ${m.text}`;
      }).join('\n\n');
      
      await upsertChatLog(userName, sessionType, summary);
    } catch (e) {
      console.warn("Failed to sync chat log:", e);
    }
  };

  const handleNextStep = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // 마지막으로 한 번 더 확실하게 동기화 후 다음 단계로
      await syncConversationToFirebase(messages);
      onNext();
    } catch (e) {
      onNext();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessageText = inputText;
    setInputText(''); 
    
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userMessageText,
      sender: 'user',
      timestamp: new Date()
    };
    
    // 유저 메시지 즉시 반영 및 저장
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    await syncConversationToFirebase(updatedWithUser);
    
    setIsLoading(true);

    try {
      if (chatSessionRef.current) {
        const result = await chatSessionRef.current.sendMessage({ message: userMessageText });
        const responseText = result.text;

        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'bot',
          timestamp: new Date()
        };
        
        // 봇 메시지 반영 및 저장
        const finalMsgs = [...updatedWithUser, botMsg];
        setMessages(finalMsgs);
        await syncConversationToFirebase(finalMsgs);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 조합 중 엔터 키 중복 입력 방지
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <RefreshCw size={32} className="text-purple-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-gray-400">내담자님의 기록을 토대로 상담을 준비하고 있습니다...</p>
      </div>
    );
  }

  const isGoalSetting = sessionType === 'GOAL_SETTING';
  const isActionExecution = sessionType === 'ACTION_EXECUTION';

  return (
    <div className="flex flex-col h-[100dvh] w-full sm:items-center sm:justify-center sm:min-h-screen sm:p-4 animate-fade-in pt-10 sm:pt-0">
      <div className="w-full sm:max-w-3xl bg-gray-900/90 backdrop-blur-xl border-t border-white/10 sm:border rounded-t-2xl sm:rounded-2xl sm:shadow-2xl overflow-hidden flex flex-col h-full sm:h-[80vh] sm:min-h-[600px]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-white/5 border-b border-white/5 shrink-0">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" aria-label="홈으로"><Home size={24} /></button>
          
          <div className="flex flex-col items-center text-center px-2">
            <h3 className="text-white font-bold text-sm sm:text-base leading-tight">
              {isActionExecution ? "행동 의도 및 가치 연결" : isGoalSetting ? "목표 설정 및 매칭" : "나의 강점 찾기"}
            </h3>
            <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${isActionExecution ? 'text-teal-400' : isGoalSetting ? 'text-indigo-400' : 'text-purple-400'}`}>
              {isActionExecution ? "Action Intention" : isGoalSetting ? "Goal Stage" : "Self-Understanding"}
            </div>
          </div>

          <button 
            onClick={handleNextStep}
            disabled={isSaving}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all group shadow-xl active:scale-95 disabled:opacity-50
              ${(isActionExecution || isGoalSetting)
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40 ring-2 ring-indigo-500/20' 
                : 'hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'}
              ${isChatFinished ? 'animate-blink ring-4 ring-indigo-400/50' : ''}`}
            aria-label="완료하기"
          >
            {isSaving ? (
              <RefreshCw size={18} className="animate-spin text-white" />
            ) : (
              <>
                <span className={`text-[11px] sm:text-sm font-black whitespace-nowrap transition-colors ${(isActionExecution || isGoalSetting) ? 'text-white' : 'group-hover:text-white'}`}>
                  {(isActionExecution || isGoalSetting) ? "상담 완료" : "다음 단계로"}
                </span>
                <ArrowRight size={18} className={`sm:w-[20px] sm:h-[20px] transition-transform group-hover:translate-x-0.5 ${(isActionExecution || isGoalSetting) ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
              </>
            )}
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 scrollbar-hide bg-gradient-to-b from-gray-900/50 to-black/20">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-1
                  ${msg.sender === 'user' 
                    ? (isActionExecution ? 'bg-teal-500' : isGoalSetting ? 'bg-indigo-500' : 'bg-purple-600') 
                    : (isActionExecution ? 'bg-teal-600' : isGoalSetting ? 'bg-indigo-600' : 'bg-purple-600')}`}>
                  {msg.sender === 'user' ? <User size={12} className="text-white sm:w-[14px] sm:h-[14px]" /> : <Bot size={12} className="text-white sm:w-[14px] h-[14px]" />}
                </div>
                <div className={`p-3 sm:p-4 rounded-2xl text-sm leading-relaxed shadow-lg
                  ${msg.sender === 'user' 
                    ? (isActionExecution ? 'bg-teal-600/80' : isGoalSetting ? 'bg-indigo-500/80' : 'bg-purple-600/80') + ' text-white rounded-tr-none' 
                    : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'}`}>
                  <p className="whitespace-pre-wrap break-words text-sm">{msg.text}</p>
                  <span className="text-[9px] sm:text-[10px] opacity-40 mt-1.5 block text-right">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[80%]">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 mt-1
                   ${isActionExecution ? 'bg-teal-600' : isGoalSetting ? 'bg-indigo-600' : 'bg-purple-600'}`}>
                  <Bot size={12} className="text-white sm:w-[14px] h-[14px]" />
                </div>
                <div className="bg-white/10 p-3 sm:p-4 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce ${isActionExecution ? 'bg-teal-400' : isGoalSetting ? 'bg-indigo-400' : 'bg-purple-400'}`} style={{ animationDelay: '0ms' }} />
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce ${isActionExecution ? 'bg-teal-400' : isGoalSetting ? 'bg-indigo-400' : 'bg-purple-400'}`} style={{ animationDelay: '150ms' }} />
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce ${isActionExecution ? 'bg-teal-400' : isGoalSetting ? 'bg-indigo-400' : 'bg-purple-400'}`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 sm:p-4 bg-white/5 border-t border-white/5 shrink-0 safe-pb">
          <div className="relative flex items-center gap-2 max-w-3xl mx-auto">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isActionExecution ? "나의 마음가짐과 의도를 입력하세요..." : isGoalSetting ? "목표를 입력하세요..." : "메시지를 입력하세요..."}
              disabled={isLoading}
              className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 sm:py-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`absolute right-1.5 sm:right-2 p-2 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white transition-all shadow-lg
                ${isActionExecution 
                  ? 'bg-teal-600 hover:bg-teal-500' 
                  : isGoalSetting 
                    ? 'bg-indigo-600 hover:bg-indigo-500' 
                    : 'bg-purple-600 hover:bg-purple-500'}`}
            >
              <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
