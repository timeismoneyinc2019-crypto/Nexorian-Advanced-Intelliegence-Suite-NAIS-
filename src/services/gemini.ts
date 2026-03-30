import { GoogleGenAI, Modality, ThinkingLevel, Type } from "@google/genai";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, doc, setDoc, getDoc, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { ResearchResult } from "../types";
import { NexusKernel, AuthorityType } from "./nexusKernel";

let aiInstance: GoogleGenAI | null = null;

export function getAI(customKey?: string) {
  const key = customKey || localStorage.getItem('nexus_gemini_key') || process.env.GEMINI_API_KEY;
  if (!key) return null;
  
  if (!aiInstance || customKey) {
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

const ADVANCED_MODEL = "gemini-3.1-pro-preview";

// Proactive Memory Interface
export interface ProactiveMemory {
  id?: string;
  industry: string;
  xFactor: string; // The environmental signal that caused the issue
  spikeType: string; // e.g., 'Energy Spike', 'Grid Failure'
  adjustment: string; // The self-adjustment made to prevent it
  timestamp: number;
  impactScore: number;
}

// Real-time Data Ingestion
export async function fetchLiveSignals(industry: string) {
  try {
    if (industry === 'Agriculture') {
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=36.37&longitude=-119.27&current_24h=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m");
      const data = await res.json();
      return {
        temperature: data.current_24h.temperature_2m,
        humidity: data.current_24h.relative_humidity_2m,
        precipitation: data.current_24h.precipitation,
        wind: data.current_24h.wind_speed_10m,
        soilMoisture: 35 + Math.random() * 10,
        phLevel: 6.5 + Math.random(),
        source: 'Open-Meteo + Nexus Sensors'
      };
    }
    
    if (industry === 'Logistics') {
      return {
        fleetUtilization: 82 + Math.random() * 10,
        deliveryLatency: 12 + Math.random() * 5,
        fuelEfficiency: 94 + Math.random() * 4,
        activeRoutes: 142,
        source: 'Nexus Logistics Grid'
      };
    }

    if (industry === 'Energy') {
      // Simulate an "X Factor" (e.g., extreme heat + solar flare interference)
      const isXFactorPresent = Math.random() > 0.85;
      const gridLoad = isXFactorPresent ? 95 + Math.random() * 10 : 75 + Math.random() * 15;
      
      return {
        gridLoad,
        renewableMix: 42 + Math.random() * 20,
        storageCapacity: 88 + Math.random() * 5,
        frequency: 60.02,
        xFactorDetected: isXFactorPresent ? 'Solar Flare Interference + Thermal Peak' : 'None',
        source: 'Nexus Energy Node'
      };
    }

    if (industry === 'Infrastructure') {
      return {
        structuralIntegrity: 98.2,
        trafficFlow: 65 + Math.random() * 20,
        maintenancePriority: 'Low',
        vibrationLevel: 0.02 + Math.random() * 0.05,
        source: 'Nexus Smart City API'
      };
    }

    if (industry === 'Healthcare') {
      return {
        patientThroughput: 45 + Math.random() * 10,
        resourceAllocation: 92,
        criticalCareCapacity: 15 + Math.random() * 5,
        avgWaitTime: 12,
        source: 'Nexus Health Network'
      };
    }

    if (industry === 'Cybersecurity') {
      return {
        threatLevel: 'Low',
        packetLatency: 2 + Math.random() * 5,
        breachAttempts: Math.floor(Math.random() * 5),
        encryptionStrength: 256,
        source: 'Nexus Security Shield'
      };
    }

    if (industry === 'Defense') {
      return {
        assetReadiness: 95 + Math.random() * 4,
        signalIntelligence: 88,
        perimeterIntegrity: 100,
        activeThreats: 0,
        source: 'Nexus Defense Core'
      };
    }
  } catch (e) {
    console.error("Live feed error:", e);
  }

  // Fallback
  return { 
    load: Math.random() * 100, 
    latency: Math.random() * 50, 
    source: 'Nexus Internal Telemetry' 
  };
}

// Local Node Integration (Ollama / LocalAI)
async function callLocalNode(prompt: string, endpoint: string) {
  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama3", // Default to llama3 for local nodes
        prompt: prompt,
        stream: false,
        format: "json"
      })
    });
    
    if (!response.ok) throw new Error(`Local Node Error: ${response.statusText}`);
    const data = await response.json();
    return { text: data.response };
  } catch (e) {
    console.error("Local Node Failure:", e);
    throw new Error("LOCAL_NODE_UNREACHABLE");
  }
}

export async function generatePrediction(industry: string, state: any, customKey?: string) {
  const localEnabled = localStorage.getItem('nexus_local_node_enabled') === 'true';
  const localUrl = localStorage.getItem('nexus_local_node_url') || 'http://localhost:11434';
  
  const prompt = `As the Nexus Prediction Layer for ${industry}, analyze this state: ${JSON.stringify(state)}. 
    Provide a short-term prediction (next 24h) and a recommended action. 
    Return as JSON: { "prediction": "...", "action": "...", "probability": 0.85 }`;

  let responseText: string;

  if (localEnabled) {
    const res = await callLocalNode(prompt, localUrl);
    responseText = res.text;
  } else {
    const ai = getAI(customKey);
    if (!ai) throw new Error("AI_NOT_INITIALIZED");

    const response = await ai.models.generateContent({
      model: ADVANCED_MODEL,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    responseText = response.text;
  }
  
  const prediction = JSON.parse(responseText);
  
  // Log Prediction to Immutable Ledger
  await NexusKernel.processEvent('PREDICTION_GENERATED', prediction, [{
    type: AuthorityType.POLICY,
    id: 'PREDICTION_ENGINE_01',
    claims: ['FORECAST_STATE']
  }]);

  // Persist to Firestore for Learning Loop
  try {
    await addDoc(collection(db, `systems/${industry}/predictions`), {
      ...prediction,
      timestamp: Date.now(),
      stateSnapshot: state
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `systems/${industry}/predictions`);
  }

  return prediction;
}

export async function analyzeNervousSystem(state: any, logs: string[], customKey?: string) {
  const localEnabled = localStorage.getItem('nexus_local_node_enabled') === 'true';
  const localUrl = localStorage.getItem('nexus_local_node_url') || 'http://localhost:11434';
  
  const prompt = `Analyze the system's nervous system. 
    State: ${JSON.stringify(state)}
    Recent Logs: ${logs.join('\n')}
    Provide a deep reasoning analysis of the system's health and suggest a 'self-healing' optimization.
    Return as JSON: { "analysis": "...", "healingAction": "...", "confidence": 0.98 }`;

  let responseText: string;

  if (localEnabled) {
    const res = await callLocalNode(prompt, localUrl);
    responseText = res.text;
  } else {
    const ai = getAI(customKey);
    if (!ai) throw new Error("AI_NOT_INITIALIZED");

    const response = await ai.models.generateContent({
      model: ADVANCED_MODEL,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    responseText = response.text;
  }
  return JSON.parse(responseText);
}

export async function generateDecision(industry: string, state: any, prediction: any, weights: any, customKey?: string) {
  const localEnabled = localStorage.getItem('nexus_local_node_enabled') === 'true';
  const localUrl = localStorage.getItem('nexus_local_node_url') || 'http://localhost:11434';

  // Fetch Proactive Memory for this industry
  let proactiveContext = "";
  try {
    const memoryQuery = query(
      collection(db, `systems/${industry}/memory`),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const memorySnapshot = await getDocs(memoryQuery);
    const memories = memorySnapshot.docs.map(d => d.data());
    if (memories.length > 0) {
      proactiveContext = `HISTORICAL PROACTIVE CONTEXT (Learned from past spikes):
        ${memories.map(m => `- Detected "${m.xFactor}" caused "${m.spikeType}". Adjustment made: "${m.adjustment}"`).join('\n')}
        If current signals match any of these "X factors", SELF-ADJUST parameters proactively to prevent recurrence.`;
    }
  } catch (e) {
    console.warn("Memory fetch failed, proceeding without context.");
  }

  const prompt = `As the Nexus Decision Engine for ${industry}, generate a concrete decision.
    
    ${proactiveContext}

    You must analyze the system across 5 Dimensions of State:
    1. Temporal (Current Time: ${state.timestamp})
    2. Magnitude (Performance Value: ${state.value})
    3. Vector (Rate of Change/Drift: ${state.drift})
    4. Confidence (Uncertainty Level: ${state.uncertainty})
    5. Contextual (Environmental Signals: ${JSON.stringify(state.raw_data)})
    6. Integrity (System Drift: ${state.integrityDrift || 0})

    Apply these Optimization Weights to your reasoning:
    - Accuracy Weight: ${weights.accuracy}
    - Efficiency Weight: ${weights.efficiency}
    - Risk Tolerance: ${weights.risk}

    Prediction Context: ${JSON.stringify(prediction)}
    
    Optimize for cost, risk, and impact.
    Return as JSON: { 
      "action": "...", 
      "cost": 1250.00, 
      "risk": "Low", 
      "impact": 0.95,
      "proactiveAdjustment": "...", // Describe any proactive adjustment made to prevent a future spike
      "isProactive": true/false 
    }`;

  let responseText: string;

  if (localEnabled) {
    const res = await callLocalNode(prompt, localUrl);
    responseText = res.text;
  } else {
    const ai = getAI(customKey);
    if (!ai) throw new Error("AI_NOT_INITIALIZED");

    const response = await ai.models.generateContent({
      model: ADVANCED_MODEL,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    responseText = response.text;
  }
  
  const decision = JSON.parse(responseText);
  
  // Log Decision to Immutable Ledger
  await NexusKernel.processEvent('DECISION_GENERATED', decision, [{
    type: AuthorityType.POLICY,
    id: 'DECISION_ENGINE_01',
    claims: ['EXECUTE_STRATEGY']
  }]);

  // Persist to Firestore
  try {
    await addDoc(collection(db, `systems/${industry}/decisions`), {
      ...decision,
      timestamp: Date.now(),
      stateSnapshot: state,
      predictionSnapshot: prediction
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `systems/${industry}/decisions`);
  }

  return decision;
}

export async function performDeepResearch(query: string, customKey?: string): Promise<ResearchResult> {
  if (!NexusKernel.getConfig().subscriptionActive) {
    throw new Error("HALT: LICENSE_EXPIRED_OR_INVALID");
  }

  const ai = getAI(customKey);
  if (!ai) throw new Error("AI_NOT_INITIALIZED");

  const response = await ai.models.generateContent({
    model: ADVANCED_MODEL,
    contents: `As the Nexus Deep Research Agent, perform an exhaustive analysis on: "${query}".
    Focus on technical feasibility, market dynamics, and infrastructure implications.
    Use Google Search to find the latest data.
    
    Return as JSON: { 
      "summary": "...", 
      "keyFindings": ["...", "..."], 
      "nextSteps": ["...", "..."]
    }`,
    config: { 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      tools: [{ googleSearch: {} }]
    }
  });
  
  const result = JSON.parse(response.text);
  
  // Extract grounding URLs
  const sources: { title: string; url: string }[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({ title: chunk.web.title || 'Source', url: chunk.web.uri });
      }
    });
  }

  return {
    ...result,
    sources: sources.slice(0, 5) // Limit to top 5 sources
  };
}

export async function getNarration(text: string, customKey?: string): Promise<string> {
  const ai = getAI(customKey);
  if (!ai) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this with a professional, grounded, authoritative male voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
  } catch (error) {
    console.error("TTS Error:", error);
  }
  return "";
}
