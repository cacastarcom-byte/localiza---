import { GoogleGenAI } from "@google/genai";
import { Friend } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIStatusUpdate = async (friend: Friend): Promise<string> => {
  try {
    const speed = friend.location?.speed ? (friend.location.speed * 3.6).toFixed(1) : 0; // Converter m/s para km/h
    let heading = friend.location?.heading || 0;
    
    // Determinar direção aproximada
    const directions = ['Norte', 'Nordeste', 'Leste', 'Sudeste', 'Sul', 'Sudoeste', 'Oeste', 'Noroeste'];
    const index = Math.round(((heading %= 360) < 0 ? heading + 360 : heading) / 45) % 8;
    const directionStr = directions[index];

    const prompt = `
      Gere uma atualização de status curta, espirituosa ou útil para uma pessoa chamada "${friend.name}" com base em sua telemetria de localização.
      
      Telemetria:
      - Velocidade: ${speed} km/h
      - Direção: ${directionStr}
      - Hora: ${new Date().toLocaleTimeString('pt-BR')}
      
      Instruções:
      - Responda em Português do Brasil.
      - Máximo de 15 palavras.
      - Se a velocidade for 0, assuma que estão parados/descansando.
      - Se a velocidade for > 40, assuma que estão dirigindo.
      - Se a velocidade for > 4, assuma que estão caminhando/correndo.
      - Seja observador e divertido.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Status desconhecido. Sinal perdido no espaço.";
  }
};