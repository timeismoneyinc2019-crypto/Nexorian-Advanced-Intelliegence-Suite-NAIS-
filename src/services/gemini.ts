import { GoogleGenAI, Modality, ThinkingLevel, Type } from "@google/genai";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { ResearchResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ADVANCED_MODEL = "gemini-3.1-pro-preview";

// Real-time Data Ingestion (Example: Agriculture Weather)
export async function fetchLiveSignals(industry: string) {
  if (industry === 'Agriculture') {
    try {
      // Fetching real weather data for a sample location (e.g., California Central Valley)
      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=36.37&longitude=-119.27&current_24h=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m");
      const data = await res.json();
      return {
        temperature: data.current_24h.temperature_2m,
        humidity: data.current_24h.relative_humidity_2m,
        precipitation: data.current_24h.precipitation,
        wind: data.current_24h.wind_speed_10m,
        source: 'Open-Meteo Live Feed'
      };
    } catch (e) {
      console.error("Live feed error:", e);
    }
  }
  // Fallback to simulated but structured signals for other industries
  return { 
    load: Math.random() * 100, 
    latency: Math.random() * 50, 
    source: 'Nexus Internal Telemetry' 
  };
}

export async function generatePrediction(industry: string, state: any) {
  const response = await ai.models.generateContent({
    model: ADVANCED_MODEL,
    contents: `As the Nexus Prediction Layer for ${industry}, analyze this state: ${JSON.stringify(state)}. 
    Provide a short-term prediction (next 24h) and a recommended action. 
    Return as JSON: { "prediction": "...", "action": "...", "probability": 0.85 }`,
    config: { 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  
  const prediction = JSON.parse(response.text);
  
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

export async function analyzeNervousSystem(state: any, logs: string[]) {
  const response = await ai.models.generateContent({
    model: ADVANCED_MODEL,
    contents: `Analyze the system's nervous system. 
    State: ${JSON.stringify(state)}
    Recent Logs: ${logs.join('\n')}
    Provide a deep reasoning analysis of the system's health and suggest a 'self-healing' optimization.
    Return as JSON: { "analysis": "...", "healingAction": "...", "confidence": 0.98 }`,
    config: { 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  return JSON.parse(response.text);
}

export async function generateDecision(industry: string, state: any, prediction: any, weights: any) {
  const response = await ai.models.generateContent({
    model: ADVANCED_MODEL,
    contents: `As the Nexus Decision Engine for ${industry}, generate a concrete decision.
    
    You must analyze the system across 5 Dimensions of State:
    1. Temporal (Current Time: ${state.timestamp})
    2. Magnitude (Performance Value: ${state.value})
    3. Vector (Rate of Change/Drift: ${state.drift})
    4. Confidence (Uncertainty Level: ${state.uncertainty})
    5. Contextual (Environmental Signals: ${JSON.stringify(state.raw_data)})

    Apply these Optimization Weights to your reasoning:
    - Accuracy Weight: ${weights.accuracy}
    - Efficiency Weight: ${weights.efficiency}
    - Risk Tolerance: ${weights.risk}

    Prediction Context: ${JSON.stringify(prediction)}
    
    Optimize for cost, risk, and impact.
    Return as JSON: { "action": "...", "cost": 1250.00, "risk": "Low", "impact": 0.95 }`,
    config: { 
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
    }
  });
  
  const decision = JSON.parse(response.text);
  
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

export async function performDeepResearch(query: string): Promise<ResearchResult> {
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

export async function getNarration(text: string): Promise<string> {
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
