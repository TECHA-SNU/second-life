
import { GoogleGenAI, Type } from "@google/genai";

export const generateCareerAdvice = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const model = 'gemini-3-flash-preview';
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a warm, empathetic, and professional career counselor for middle-aged adults (40s-60s). Provide encouraging and practical advice. Do not use asterisks or markdown bold symbols.",
      }
    });
    return response.text || "죄송합니다. 현재 응답을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
};

/**
 * RIASEC과 강점 분석을 바탕으로 내담자에게 새로운 '커리어 페르소나' 스토리텔링을 제공합니다.
 */
export const generateCareerPersona = async (userName: string, hollandCode: string, strengths: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    내담자 이름: ${userName}
    홀랜드 코드(RIASEC): ${hollandCode}
    핵심 강점 분석 결과: ${strengths}

    위 정보를 바탕으로 이 중장년 내담자의 '커리어 정체성(My Career Identity)'을 정의해주세요.
    
    [작성 요구사항 - 반드시 지킬 것]
    1. **제목 (첫 줄)**: 핵심 키워드만 사용해 **8자 내외**로 아주 짧고 명확하게 작성하세요. 
       (예: '지혜로운 전략가', '따뜻한 멘토', '실무형 리더')
    2. **본문 구성**: 총 2~3문장으로 구성하되, 핵심 강점을 먼저 언급하세요.
    3. **마지막 문장 (필수)**: 내담자의 성향과 강점에 비추어 볼 때, 어떤 환경(예: 자율성이 보장되는 환경, 체계적인 시스템이 갖춰진 곳, 사람들과 긴밀히 소통하는 현장 등)에서 일할 때 가장 빛이 나는지 구체적인 조언을 담아 마무리하세요.
    4. **호칭**: 사용자의 실명 대신 반드시 '**내담자님**' 또는 '**내담자님은**'으로 통일하세요.
    5. **문장 완성**: 모든 문장은 마침표(.)로 끝맺음하며 정중한 문어체(~입니다)를 사용하세요.
    6. 별표(*)나 마크다운 기호를 절대 사용하지 마세요.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "당신은 중장년층의 커리어를 한눈에 들어오는 명확한 브랜드로 정의해주는 전문가입니다. 한국어로 아주 간결하게 답변하세요.",
      }
    });
    return response.text || "내담자님은 준비된 전문가입니다. 자신의 전문성을 발휘할 수 있는 환경에서 가장 빛이 납니다.";
  } catch (error) {
    return "내담자님은 풍부한 경험을 가진 리더입니다. 신뢰를 바탕으로 협업하는 환경이 내담자님께 가장 잘 어울립니다.";
  }
};

/**
 * 특정 직업의 롤모델 기사를 구글 검색을 통해 찾아냅니다.
 */
export const searchRoleModelArticles = async (jobTitle: string): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    "${jobTitle}" 분야로 성공적으로 전직했거나 활동 중인 4060 중장년층의 실제 인터뷰, 성공 사례, 또는 뉴스 기사를 3개 정도 찾아주세요. 
    반드시 실제 접속 가능한 웹사이트 URL(uri)과 기사 제목이 포함된 검색 결과(grounding chunks)를 바탕으로 답변해 주세요.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const articles = chunks
      .filter((chunk: any) => chunk.web && chunk.web.uri && chunk.web.title)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    const uniqueArticles = Array.from(new Map(articles.map(item => [item.uri, item])).values());
    
    return uniqueArticles.length > 0 ? uniqueArticles.slice(0, 3) : [];
  } catch (error) {
    console.error("Article Search Error:", error);
    return [];
  }
};

/**
 * 사용자의 답변에 대해 즉각적이고 따뜻한 격려 피드백 생성
 */
export const generateEncouragement = async (question: string, answer: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    당신은 중장년층 전문 커리어 코치입니다. 
    내담자가 다음 질문에 대해 아래와 같이 답변했습니다.
    질문: ${question}
    답변: ${answer}

    이 답변을 읽고 내담자가 삶에서 중요하게 여기는 가치를 짚어주며, 그 경험이 얼마나 소중한지 인정해주세요. 
    자존감을 높여주는 따뜻한 격려의 말을 2~3문장으로 작성하세요. 
    말투는 매우 다정하고 공감적이어야 합니다. 별표(*)나 강조 기호를 절대 사용하지 마세요.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "당신은 중장년층의 삶의 경험을 존중하고 그들의 자존감을 세워주는 따뜻한 상담가입니다. 한국어로 답변하세요. 마크다운 기호를 사용하지 마세요.",
      }
    });
    return response.text || "그 경험 속에 담긴 내담자님의 열정과 노력이 느껴집니다. 정말 멋진 삶의 궤적을 그려오셨네요.";
  } catch (error) {
    return "소중한 경험을 들려주셔서 감사합니다. 내담자님의 진심이 담긴 답변이 참 인상적입니다.";
  }
};

/**
 * 완성된 로드맵에 대한 전문가의 종합적인 격려 멘트 생성
 */
export const generateRoadmapExpertComment = async (userName: string, roadmap: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    내담자 이름: ${userName}
    비전: ${roadmap.vision}
    미션: ${roadmap.mission}
    핵심가치: ${roadmap.values}
    목표: ${JSON.stringify(roadmap.goals)}

    당신은 20년 경력의 시니어 진로심리상담 전문가입니다. 
    이 내담자가 작성한 커리어 로드맵을 보고, 이 로드맵이 실현될 수 있도록 전문가적 관점에서 따뜻하고 힘이 되는 격려의 메시지를 3~4문장으로 작성해주세요. 
    별표(*)나 강조 기호를 절대 사용하지 마세요.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "당신은 중장년층의 제2의 인생 설계를 돕는 따뜻하고 통찰력 있는 진로심리상담 전문가입니다. 마크다운 기호를 사용하지 마세요.",
      }
    });
    return response.text || "내담자님이 세우신 로드맵은 그 자체로 이미 훌륭한 시작입니다. 그동안의 삶에서 얻은 지혜를 믿고 한 걸음씩 나아가시길 진심으로 응원합니다.";
  } catch (error) {
    return "설계하신 비전과 미션이 참으로 감명 깊습니다. 당신의 열정이라면 이 로드맵은 반드시 실현될 것입니다.";
  }
};

/**
 * 예상되는 장애물에 대한 Gemini의 극복 솔루션 및 격려 생성
 */
export const generateChallengeAdvice = async (userName: string, challenge: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    내담자 이름: ${userName}
    내담자가 걱정하는 장애물(극복 요인): ${challenge}

    당신은 중장년층의 두려움을 용기로 바꿔주는 따뜻한 조력자이자 커리어 코치입니다.
    내담자가 언급한 장애물을 현명하게 극복할 수 있는 실질적인 방법 한 가지와, 내담자의 연륜을 믿으라는 따뜻한 응원의 메시지를 작성해주세요.
    3문장 내외로 부드럽고 다정하게 작성하세요. 별표(*)나 마크다운 강조 기호를 절대 사용하지 마세요.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "당신은 시니어의 새로운 도전을 진심으로 응원하는 따뜻한 커리어 코치입니다. 한국어로 답변하세요.",
      }
    });
    return response.text || "내담자님이 가진 수많은 경험이 곧 해답이 될 것입니다. 한 걸음만 용기 내어 보세요.";
  } catch (error) {
    return "오랜 시간 다져온 내담자님의 내공은 어떤 어려움도 이겨낼 수 있는 가장 강력한 무기입니다. 당신의 도전을 믿고 응원합니다.";
  }
};

/**
 * 가치관 리포트를 위한 전문가의 격려 및 우선순위 해석 멘트 생성
 */
export const generateValueExpertComment = async (userName: string, values: {label: string, description: string}[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const valuesContext = values.map((v, i) => `${i+1}순위: ${v.label} (의미: ${v.description})`).join('\n');
  
  const prompt = `
    내담자 이름: ${userName}
    선택한 가치관 우선순위 및 상세 설명:
    ${valuesContext}

    당신은 중장년의 심리적 안정과 자존감을 중시하는 시니어 진로심리상담 전문가입니다.
    내담자가 선택한 상위 3가지 가치관의 [설명 내용]을 바탕으로 이 가치들이 내담자의 인생 2막에서 어떤 의미를 갖는지 깊이 있게 해석해주세요.
    
    [작성 가이드라인]
    1. 선택된 상위 3가지 가치관의 [설명 내용]을 문장 속에 자연스럽게 인용하며, 내담자만의 독특한 가치 조합이 주는 삶의 통찰을 제시하세요.
    2. 이 가치들이 내담자님의 새로운 커리어 여정에서 어떤 단단한 중심축이 될지 구체적으로 언급하세요.
    3. 별표(*)나 마크다운 강조 기호를 절대 사용하지 마세요.
    4. 지혜롭고 자상한 전문가의 말투로 4~5문장 내외로 작성하세요.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "당신은 중장년층의 삶의 가치를 발견하고 깊이 있게 해석해주는 지혜로운 진로심리상담 전문가입니다. 마크다운 기호 없이 한국어로 답변하세요.",
      }
    });
    return response.text || "내담자님이 선택하신 가치관은 앞으로의 삶을 지탱할 가장 단단한 뿌리입니다. 이 가치들을 나침반 삼아 흔들림 없이 나아가시길 진심으로 응원합니다.";
  } catch (error) {
    return "선택하신 가치관 속에 내담자님의 고귀한 삶의 철학이 담겨 있습니다. 이 방향이라면 분명 의미 있는 미래를 맞이하실 것입니다.";
  }
};

export const analyzeStrengthsFromAnswers = async (answers: { question: string, answer: string }[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = answers.map((a, i) => `Q${i+1}: ${a.question}\nA: ${a.answer}`).join('\n\n');
  const prompt = `
    당신은 4060 중장년층 커리어 코치입니다. 아래 내담자의 답변을 분석하여 가장 돋보이는 핵심 강점 3가지를 도출하세요.
    반드시 지정된 JSON 형식으로만 답변하세요.
    내담자 답변: ${context}
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            identity: { type: Type.STRING, description: "중장년의 정체성을 담은 8자 내외의 커리어 정체성 타이틀 (예: 지혜로운 전략가)" },
            strengths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  theme: { type: Type.STRING },
                  area: { type: Type.STRING },
                  description: { type: Type.STRING },
                  evidence: { type: Type.STRING }
                },
                required: ["theme", "area", "description", "evidence"]
              }
            }
          },
          required: ["summary", "strengths"]
        }
      }
    });
    return response.text || "";
  } catch (error) {
    throw error;
  }
};

export const recommendJobs = async (riasecCode: string, strengths: string, jobPool: any[], knowledgePool: any[]): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const jobListString = jobPool.map(j => `- ${j.title}: ${j.description}`).join('\n');
  const knowledgeString = knowledgePool.slice(0, 50).map(k => `- 능력: ${k.abilityName} -> 관련활동: ${k.activityName}`).join('\n');

  const prompt = `
    당신은 세계적인 커리어 전문가입니다. 내담자의 RIASEC(홀랜드) 코드와 AI가 분석한 내담자의 강점, 그리고 우리가 보유한 O*NET 지식 베이스를 바탕으로 최적의 직업 4가지를 추천해야 합니다.

    [입력 데이터]
    1. 내담자 RIASEC 코드: ${riasecCode}
    2. 내담자 핵심 강점 요약: ${strengths}
    3. O*NET 직업 풀 (Job Descriptions):
    ${jobListString}
    4. O*NET 역량 매핑 참조 (Abilities & Work Activities):
    ${knowledgeString}

    [분석 가이드라인]
    - 각 추천 직업의 'matchingPoint'는 내담자의 강점과 직무 역량의 연관성을 한국어로 3문장 내외의 요약된 형태로 명확하게 작성하세요.
    - 중장년층의 숙련된 경험이 이 직무에서 어떤 독보적인 경쟁력이 될 수 있는지 강조하세요.

    [출력 형식]
    반드시 JSON 형식으로만 응답하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING, description: "O*NET과 강점 데이터를 통합한 심층 분석 요약" },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  jobTitle: { type: Type.STRING },
                  matchingPoint: { type: Type.STRING, description: "강점과 O*NET 역량의 매칭 근거 (한국어 3문장 요약)" },
                  suitableTrait: { type: Type.STRING, description: "중장년의 어떤 강점이 이 직업에 기여하는가" }
                },
                required: ["jobTitle", "matchingPoint", "suitableTrait"]
              }
            }
          },
          required: ["analysis", "recommendations"]
        }
      }
    });
    const text = response.text?.trim() || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Recommend error:", error);
    return null;
  }
};

/**
 * 1주일 단기 프로젝트 추천을 생성합니다.
 */
export const generateShortTermProjects = async (userName: string, context: { strengths: string, vision: string, jobs: string[] }): Promise<any[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    내담자 이름: ${userName}
    비전: ${context.vision}
    추천된 직무: ${context.jobs.join(', ')}
    강점 요약: ${context.strengths}

    위의 정보를 바탕으로, 내담자가 자신의 비전을 향해 1주일 동안 즉각적으로 실천해볼 수 있는 아주 구체적이고 실무적인 '1주일 프로젝트' 3가지를 제안해주세요.
    
    [작성 원칙]
    1. 중장년층의 풍부한 경험을 활용하면서도, 새로운 분야에 진입할 때 반드시 필요한 '실질적 결과물'이 나오는 활동이어야 합니다.
    2. 단순히 '공부하기'가 아니라 '핵심 리스트 만들기', '전문가에게 메일 보내기', '포트폴리오 1페이지 구성하기'처럼 행동 지향적이어야 합니다.
    3. 결과물이 눈에 보여서 내담자가 유능함을 느낄 수 있는 활동을 추천하세요.
    
    반드시 JSON 형식으로만 응답하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "프로젝트 제목" },
                  description: { type: Type.STRING, description: "상세 실행 방법" }
                },
                required: ["title", "description"]
              }
            }
          },
          required: ["projects"]
        }
      }
    });
    const data = JSON.parse(response.text?.trim() || "{}");
    return data.projects || [];
  } catch (error) {
    console.error("Short term project error:", error);
    return [];
  }
};

/**
 * 프로젝트 계획서 전체를 자동으로 생성합니다.
 */
export const generateDetailedProjectPlan = async (userName: string, context: { strengths: string, vision: string, jobs: string[] }): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    내담자 이름: ${userName}
    비전: ${context.vision}
    강점 요약: ${context.strengths}
    추천 직업군: ${context.jobs.join(', ')}

    위 정보를 바탕으로 중장년 내담자가 즉시 실행할 수 있는 전문적인 '커리어 프로젝트 계획서'를 작성하세요.
    또한, 프로젝트의 성취도를 측정할 수 있는 GAS(Goal Attainment Scaling) 기준도 함께 제안해주세요.
    
    [요구사항]
    1. 프로젝트명: 내담자의 전문성과 새로운 직업 목표가 결합된 매력적인 제목
    2. 프로젝트 기간: 1주일, 2주일, 1개월 중 내담자의 상황에 가장 적절한 기간 (문자열로 응답)
    3. 프로젝트 상세 내용: 구체적인 실행 단계(Step-by-step)를 포함하여 4~5문장으로 작성
    4. 프로젝트에서 중요한 점: 성공적인 실행을 위한 핵심 원칙이나 마인드셋 2~3가지
    5. 성취 기준 (GAS): 다음 5단계에 대한 구체적인 달성 기준을 작성하세요.
       - +2: 매우 초과 달성 (기대를 훨씬 뛰어넘는 최고의 성과)
       - +1: 초과 달성 (기대보다 조금 더 나은 성과)
       - 0: 기대 수준 달성 (처음 계획한 목표를 충실히 이행함)
       - -1: 기대 미달 (계획의 일부만 이행함)
       - -2: 매우 미달 (거의 이행하지 못함)
    
    반드시 아래 JSON 구조로만 응답하세요. 별표나 마크다운 기호를 사용하지 마세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectName: { type: Type.STRING },
            duration: { type: Type.STRING },
            content: { type: Type.STRING },
            keyPoints: { type: Type.STRING },
            gasLevels: {
              type: Type.OBJECT,
              properties: {
                '-2': { type: Type.STRING },
                '-1': { type: Type.STRING },
                '0': { type: Type.STRING },
                '1': { type: Type.STRING },
                '2': { type: Type.STRING }
              },
              required: ["-2", "-1", "0", "1", "2"]
            }
          },
          required: ["projectName", "duration", "content", "keyPoints", "gasLevels"]
        }
      }
    });
    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("Detailed plan generation error:", error);
    return null;
  }
};

/**
 * 자기이해 단계에서 내담자와의 대화 턴을 생성합니다.
 * 과거 경험, 강점, 자격 등을 심층적으로 탐색합니다.
 */
export const generateSelfUnderstandingTurn = async (
  question: string, 
  userAnswer: string, 
  history: { role: 'user' | 'model', content: string }[],
  isFinal: boolean = false
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.content }]
  }));
  
  // 현재 답변 추가
  contents.push({
    role: 'user',
    parts: [{ text: userAnswer }]
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: isFinal 
        ? `
          당신은 중장년층(4060) 전문 커리어 코치입니다. 
          현재 탐색 중인 주제: ${question}
          
          이 주제에 대한 대화를 마무리하려고 합니다. 
          내담자가 지금까지 답변한 내용을 바탕으로 그들의 강점이나 전문성을 짧게 요약하고 따뜻하게 격려하는 '마무리 멘트'를 해주세요. 
          질문은 하지 마세요. 2~3문장으로 정중하고 다정하게 작성하세요.
          별표(*)나 마크다운 강조 기호를 절대 사용하지 마세요.
        `
        : `
          당신은 중장년층(4060) 전문 커리어 코치입니다. 
          내담자가 자신의 과거 경험, 강점, 자격 사항을 깊이 있게 돌아볼 수 있도록 돕는 것이 목표입니다.
          
          [대화 원칙]
          1. 내담자의 답변에서 구체적인 '강점'이나 '전문성'의 단초를 찾아내어 인정하고 격려하세요.
          2. 내담자가 과거에 가졌던 자격증, 기술, 구체적인 성과를 더 자세히 이야기하도록 유도하는 질문을 던지세요.
          3. 중장년층의 연륜과 지혜를 존중하는 따뜻하고 정중한 말투를 유지하세요.
          4. 답변은 2~3문장으로 간결하게 하고, 마지막은 항상 내담자의 경험을 더 끌어낼 수 있는 질문으로 끝내세요.
          5. 별표(*)나 마크다운 강조 기호를 절대 사용하지 마세요.
          
          현재 탐색 중인 주제: ${question}
        `,
      }
    });
    return response.text || "내담자님의 소중한 경험을 들려주셔서 감사합니다. 그 과정에 담긴 정성과 지혜가 느껴집니다.";
  } catch (error) {
    console.error("Self-Understanding Turn Error:", error);
    return "내담자님의 답변을 잘 들었습니다. 정말 인상 깊은 경험이시네요.";
  }
};

/**
 * 채팅 세션을 생성합니다.
 */
export const createChatSession = (sessionType: 'STRENGTHS' | 'GOAL_SETTING' | 'ACTION_EXECUTION', context?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let systemInstruction = "당신은 중장년층을 위한 따뜻하고 전문적인 커리어 코치입니다. 한국어로 실용적이고 고무적인 조언을 제공하세요. 별표(*)나 마크다운 강조 기호를 절대로 사용하지 마세요.";
  
  if (sessionType === 'STRENGTHS') {
    systemInstruction += " 삶의 경험에서 숨겨진 강점을 발견하는 데 집중하세요.";
  } else if (sessionType === 'GOAL_SETTING') {
    systemInstruction += " 핵심 가치를 바탕으로 현실적이고 의미 있는 진로 목표를 세우도록 돕습니다.";
  } else if (sessionType === 'ACTION_EXECUTION') {
    systemInstruction += ` 
    [상담 목표] 내담자의 유능함과 자존감을 북돋우며 구체적인 행동 변화를 이니다. 
    [대화 가이드라인]
    - 대화의 시작은 내담자가 앞선 단계에서 발견한 강점과 RIASEC 코드를 회고하며 시작되었습니다. 이 맥락을 충분히 유지하세요.
    - 내담자가 언급한 구체적인 행동 내용을 인용하며, 그것이 내담자의 [최우선 가치]와 [진로 비전]을 실현하는 데 얼마나 유용한 시작인지 구체적으로 독려하세요. 
    1. 내담자의 첫 번째 답변(작은 행동)을 들으면: 
       - "내담자님이 말씀하신 ~라는 행동은 ~라는 비전을 향한 매우 실질적인 첫걸음이네요"와 같은 방식으로 답변 내용을 인정해주세요.
       - 그 후 "주변 사람들은 어떤 응원을 보내줄까요?"라고 질문하세요.
    2. 내담자의 두 번째 답변(주변 반응)을 들으면: 
       - 주변의 지지가 내담자라는 나무를 키우는 소중한 자양분임을 강조하며 독려하세요.
       - "내담자님만의 1주일 단기 프로젝트를 설계해볼 수 인가요?"라고 질문하여 실행 의지를 최종 확인하세요.
    3. 내담자의 의지를 확인하면: 
       - 내담자의 비전과 가치, 그리고 앞서 말한 '작은 행동'을 결합한 창의적이고 구체적인 '1주일 프로젝트' 2가지를 제안하며 대화를 맺으세요. 마지막 문장으로 반드시 '이제 "상담 완료"를 누르세요.'라고 말하며 안내하세요.
    [주의사항]
    - 마크다운 기호를 절대 사용하지 말고 부드러운 구어체로만 답변하세요.`;
    
    if (context) {
      systemInstruction += ` [내담자 컨텍스트] ${context}`;
    }
  }

  return ai.chats.create({ 
    model: 'gemini-3-pro-preview',
    config: { systemInstruction }
  });
};

export const createStrengthsChatSession = () => createChatSession('STRENGTHS');
export const createGoalSettingChatSession = () => createChatSession('GOAL_SETTING');
export const createActionExecutionChatSession = (context?: string) => createChatSession('ACTION_EXECUTION', context);
