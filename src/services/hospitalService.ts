import { GoogleGenAI } from "@google/genai";

export interface Hospital {
  name: string;
  phone: string;
  address?: string;
  distance?: string;
}

export async function getNearestHospital(lat: number, lng: number): Promise<Hospital | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `I am at coordinates ${lat}, ${lng}. Find the single nearest hospital with a 24/7 emergency department. 
      Return ONLY a JSON object with the following structure:
      {
        "name": "Hospital Name",
        "phone": "Phone Number (with country code)",
        "address": "Full Address",
        "distance": "Approximate distance from my location"
      }
      If you cannot find a specific phone number, use the local emergency number (e.g., 102 or 108 in India).`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    const text = response.text || '';
    // Extract JSON from text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const hospital = JSON.parse(jsonMatch[0]);
        return {
          name: hospital.name || "Nearby Hospital",
          phone: hospital.phone || "112",
          address: hospital.address,
          distance: hospital.distance
        };
      } catch (e) {
        console.error("Failed to parse hospital JSON", e);
      }
    }

    // Fallback: try to extract from grounding chunks
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      const firstChunk = chunks.find(c => c.maps);
      if (firstChunk && firstChunk.maps) {
        return {
          name: firstChunk.maps.title || "Nearby Hospital",
          phone: "112"
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error in getNearestHospital:", error);
    return null;
  }
}

export async function getTop3Hospitals(lat: number, lng: number): Promise<Hospital[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `I am at coordinates ${lat}, ${lng}. Find the TOP 3 nearest hospitals with 24/7 emergency departments. 
      Return ONLY a JSON array of objects with the following structure:
      [
        {
          "name": "Hospital Name",
          "phone": "Phone Number",
          "address": "Full Address",
          "distance": "Approx distance"
        }
      ]`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error("Error in getTop3Hospitals:", error);
    return [];
  }
}

export async function downloadHospitalDatabase(lat: number, lng: number, rangeKm: number): Promise<void> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const prompt = rangeKm === 0 
      ? "Find a comprehensive list of major emergency hospitals across all of India. Include name, phone, and address for at least 50 major ones."
      : `Find a list of all major emergency hospitals within a ${rangeKm}km radius of coordinates ${lat}, ${lng}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${prompt} Return ONLY a JSON array of objects: [{ "name": "...", "phone": "...", "address": "...", "lat": number, "lng": number }]`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const hospitals = JSON.parse(jsonMatch[0]);
      localStorage.setItem('local_hospital_db', JSON.stringify(hospitals));
      localStorage.setItem('local_hospital_db_info', JSON.stringify({
        downloadedAt: new Date().toISOString(),
        range: rangeKm,
        center: { lat, lng }
      }));
    }
  } catch (error) {
    console.error("Error downloading hospital database:", error);
    throw error;
  }
}

export function searchLocalHospitals(lat: number, lng: number): Hospital[] {
  const dbStr = localStorage.getItem('local_hospital_db');
  if (!dbStr) return [];

  try {
    const hospitals = JSON.parse(dbStr);
    // Simple distance calculation (Haversine-like or just Euclidean for top 3)
    const sorted = hospitals.map((h: any) => {
      const d = Math.sqrt(Math.pow(h.lat - lat, 2) + Math.pow(h.lng - lng, 2));
      return { ...h, distanceVal: d };
    }).sort((a: any, b: any) => a.distanceVal - b.distanceVal);

    return sorted.slice(0, 3).map((h: any) => ({
      name: h.name,
      phone: h.phone,
      address: h.address,
      distance: `${(h.distanceVal * 111).toFixed(1)} km` // Rough conversion
    }));
  } catch (e) {
    console.error("Error searching local DB:", e);
    return [];
  }
}
