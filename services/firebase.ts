
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy, increment, updateDoc, writeBatch, where, limit } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, updateProfile } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { HollandResult } from "../types";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDbnOBCaC7K3KDEz2TyBVd_W6aIV3VrjKw",
  authDomain: "my-career-260301.firebaseapp.com",
  projectId: "my-career-260301",
  storageBucket: "my-career-260301.firebasestorage.app",
  messagingSenderId: "791350787650",
  appId: "1:791350787650:web:e17a4d71206e65466677db",
  measurementId: "G-W2SJNN46X4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize Analytics only in client-side
let analytics = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, db, auth, analytics, firebaseConfig };

export const saveUserProfile = async (name: string) => {
  if (!db) return;
  try {
    // 1. Firebase Authentication (익명 로그인 후 표시 이름 설정)
    // 이를 통해 Firebase 콘솔의 'Authentication' 탭에서도 사용자를 확인할 수 있습니다.
    try {
      const userCredential = await signInAnonymously(auth);
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
      }
    } catch (authError: any) {
      console.warn("Firebase Auth (Anonymous) is not configured in the console. Skipping auth step.", authError);
      // auth/configuration-not-found 에러가 발생해도 Firestore 저장은 계속 진행합니다.
    }

    // 2. Firestore 데이터 저장
    const userRef = doc(db, "firebase-user", name);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: name,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        visitCount: 1
      });
    } else {
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        visitCount: increment(1)
      });
    }
  } catch (e) {
    console.error("Save profile error:", e);
  }
};

export const updateOnboardingData = async (name: string, data: any) => {
  try {
    const userRef = doc(db, "firebase-user", name);
    await setDoc(userRef, {
      onboarding: {
        ...data,
        updatedAt: serverTimestamp()
      }
    }, { merge: true });
  } catch (e) {
    console.error("Update onboarding error:", e);
  }
};

export const getUserProfile = async (name: string) => {
  try {
    const docRef = doc(db, "firebase-user", name);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    return null;
  }
};

/**
 * 커리어 페르소나(정체성 스토리)를 저장합니다.
 */
export const saveCareerPersona = async (name: string, persona: string) => {
  try {
    await setDoc(doc(db, "firebase-user", name, "data", "persona"), {
      story: persona,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Save persona error:", e);
  }
};

/**
 * 저장된 커리어 페르소나를 불러옵니다.
 */
export const fetchCareerPersona = async (name: string) => {
  try {
    const docSnap = await getDoc(doc(db, "firebase-user", name, "data", "persona"));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    return null;
  }
};

export const saveHollandResult = async (name: string, result: any) => {
  try {
    await addDoc(collection(db, `firebase-user/${name}/holland_results`), {
      ...result,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error("Save result error:", e);
  }
};

export const fetchLatestHollandResult = async (name: string): Promise<HollandResult | null> => {
  try {
    const q = query(collection(db, `firebase-user/${name}/holland_results`));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    // 서버 타임스탬프 지연으로 인한 쿼리 누락 방지를 위해 메모리에서 정렬
    const docs = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as any)).sort((a: any, b: any) => {
      const getTime = (ts: any) => {
        if (!ts) return Date.now() + 10000; // 아직 타임스탬프가 없는 경우(로컬 캐시) 가장 최신으로 간주
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (typeof ts === 'number') return ts;
        if (ts instanceof Date) return ts.getTime();
        return 0;
      };
      return getTime(b.timestamp) - getTime(a.timestamp);
    });
    
    return docs[0] as HollandResult;
  } catch (e) {
    console.error("Fetch Holland error:", e);
    return null;
  }
};

/**
 * 실시간으로 채팅 로그를 업데이트하거나 생성합니다.
 */
export const upsertChatLog = async (name: string, type: string, summary: string) => {
  try {
    const logRef = doc(db, "firebase-user", name, "chat_logs", type);
    await setDoc(logRef, {
      type,
      summary,
      timestamp: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("Upsert chat log error:", e);
  }
};

export const saveChatLog = async (name: string, type: string, summary: string) => {
  try {
    await addDoc(collection(db, `firebase-user/${name}/chat_logs`), {
      type,
      summary,
      timestamp: serverTimestamp()
    });
  } catch (e) {
    console.error("Save chat log error:", e);
  }
};

export const saveValuePriorities = async (name: string, values: any[], expertComment: string) => {
  try {
    const data = {
      items: values,
      expertComment: expertComment,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "firebase-user", name, "data", "values"), data);
  } catch (e) {
    console.error("Save values error:", e);
  }
};

export const fetchValuePriorities = async (name: string) => {
  try {
    const docSnap = await getDoc(doc(db, "firebase-user", name, "data", "values"));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    console.error("Fetch values error:", e);
    return null;
  }
};

export const saveJobRecommendation = async (name: string, recommendation: any) => {
  try {
    const jobData = {
      analysis: recommendation.analysis,
      jobs: recommendation.recommendations.map((r: any) => r.jobTitle),
      fullDetails: recommendation.recommendations,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "firebase-user", name, "data", "job_recommendation"), jobData);
    await upsertChatLog(name, 'JOB_EXPLORATION', `추천 결과: ${jobData.jobs.join(', ')}`);
  } catch (e) {
    console.error("Save job recommendation error:", e);
  }
};

export const fetchLatestJobRecommendation = async (name: string) => {
  try {
    const docRef = doc(db, "firebase-user", name, "data", "job_recommendation");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e) {
    console.error("Fetch job recommendation error:", e);
    return null;
  }
};

export const saveUserActions = async (name: string, actions: any[], mainGoal?: any, gasLevels?: any) => {
  try {
    await setDoc(doc(db, "firebase-user", name, "data", "actions"), {
      items: actions,
      mainGoal: mainGoal || null,
      gasLevels: gasLevels || null,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Save actions error:", e);
  }
};

export const fetchUserActions = async (name: string) => {
  try {
    const docSnap = await getDoc(doc(db, "firebase-user", name, "data", "actions"));
    return docSnap.exists() ? docSnap.data() : { items: [], mainGoal: null, gasLevels: null };
  } catch (e) {
    return { items: [], mainGoal: null, gasLevels: null };
  }
};

// 프로젝트 계획서(Project Plan) 저장
export const saveProjectPlan = async (name: string, plan: any) => {
  try {
    await setDoc(doc(db, "firebase-user", name, "data", "project_plan"), {
      ...plan,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Save project plan error:", e);
  }
};

export const fetchProjectPlan = async (name: string) => {
  try {
    const docSnap = await getDoc(doc(db, "firebase-user", name, "data", "project_plan"));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    return null;
  }
};

export const saveGoalRoadmap = async (name: string, roadmap: any) => {
  try {
    await setDoc(doc(db, "firebase-user", name, "data", "roadmap"), {
      ...roadmap,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("Save roadmap error:", e);
  }
};

export const fetchGoalRoadmap = async (name: string) => {
  try {
    const docSnap = await getDoc(doc(db, "firebase-user", name, "data", "roadmap"));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    return null;
  }
};

// 성찰 및 일기 데이터 저장
export const saveReflectionData = async (name: string, data: any) => {
  try {
    await setDoc(doc(db, "firebase-user", name, "data", "reflection_text"), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Save reflection error:", e);
  }
};

export const fetchReflectionData = async (name: string) => {
  try {
    const docSnap = await getDoc(doc(db, "firebase-user", name, "data", "reflection_text"));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    return null;
  }
};

export const fetchAllUsers = async () => {
  try {
    const q = query(collection(db, "firebase-user"), orderBy("lastLogin", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  } catch (e) {
    return [];
  }
};

export const fetchUserHollandResults = async (name: string) => {
  try {
    const q = query(collection(db, `firebase-user/${name}/holland_results`), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    return [];
  }
};

export const fetchUserChatLogs = async (name: string) => {
  try {
    const q = query(collection(db, `firebase-user/${name}/chat_logs`), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    return [];
  }
};

export const fetchInterviews = async (category: string = "전체") => {
  try {
    let q;
    if (category === "전체") {
      q = query(collection(db, "interviews"), orderBy("uploadedAt", "desc"));
    } else {
      q = query(collection(db, "interviews"), where("category", "==", category), orderBy("uploadedAt", "desc"));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
  } catch (e) {
    console.error("Fetch interviews error:", e);
    return [];
  }
};

export const uploadInterviewBatch = async (data: any[], onProgress?: (msg: string) => void) => {
  const colRef = collection(db, "interviews");
  const chunks = [];
  for (let i = 0; i < data.length; i += 400) { chunks.push(data.slice(i, i + 400)); }
  for (let i = 0; i < chunks.length; i++) {
    const batch = writeBatch(db);
    chunks[i].forEach(item => {
      const newDocRef = doc(colRef);
      batch.set(newDocRef, { ...item, uploadedAt: serverTimestamp() });
    });
    await batch.commit();
    onProgress?.(`인터뷰 배치 #${i + 1} 완료.`);
  }
};

export const fetchOnetJobs = async () => {
  try {
    const q = query(collection(db, "onet_jobs"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Fetch O*NET jobs error:", e);
    return [];
  }
};

export const fetchOnetKnowledge = async () => {
  try {
    const q = query(collection(db, "onet_knowledge"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Fetch O*NET knowledge error:", e);
    return [];
  }
};

export const uploadOnetJobsBatch = async (data: any[], onProgress?: (msg: string) => void) => {
  const colRef = collection(db, "onet_jobs");
  const chunks = [];
  for (let i = 0; i < data.length; i += 400) { chunks.push(data.slice(i, i + 400)); }
  for (let i = 0; i < chunks.length; i++) {
    const batch = writeBatch(db);
    chunks[i].forEach(item => {
      const newDocRef = doc(colRef);
      batch.set(newDocRef, { ...item, uploadedAt: serverTimestamp() });
    });
    await batch.commit();
    onProgress?.(`O*NET 직업 배치 #${i + 1} 완료.`);
  }
};

export const uploadOnetKnowledgeBatch = async (data: any[], onProgress?: (msg: string) => void) => {
  const colRef = collection(db, "onet_knowledge");
  const chunks = [];
  for (let i = 0; i < data.length; i += 400) { chunks.push(data.slice(i, i + 400)); }
  for (let i = 0; i < chunks.length; i++) {
    const batch = writeBatch(db);
    chunks[i].forEach(item => {
      const newDocRef = doc(colRef);
      batch.set(newDocRef, { ...item, uploadedAt: serverTimestamp() });
    });
    await batch.commit();
    onProgress?.(`O*NET 지식 배치 #${i + 1} 완료.`);
  }
};
