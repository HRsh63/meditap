import { GoogleGenAI } from "@google/genai";

export interface Hospital {
  name: string;
  phone: string;
  address?: string;
  distance?: string;
}

export async function getNearestHospital(lat: number, lng: number): Promise<Hospital | null> {
  const DEFAULT_HOSPITAL: Hospital = { 
    name: "National Emergency Service", 
    phone: "112", 
    address: "Nearest Emergency Responder",
    distance: "Priority Access"
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY found. Falling back to 112.");
      return DEFAULT_HOSPITAL;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Try with tools first
    try {
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `I am at coordinates ${lat}, ${lng}. Find the single nearest hospital with a 24/7 emergency department. Return ONLY a JSON object: {"name": "...", "phone": "...", "address": "...", "distance": "..."}`,
        config: {
          tools: [{ googleMaps: {} } as any],
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (text) {
        const hospital = JSON.parse(text);
        return {
          name: hospital.name || DEFAULT_HOSPITAL.name,
          phone: hospital.phone || DEFAULT_HOSPITAL.phone,
          address: hospital.address || DEFAULT_HOSPITAL.address,
          distance: hospital.distance || DEFAULT_HOSPITAL.distance
        };
      }
    } catch (toolError) {
      console.warn("Gemini Maps tool failed, attempting text-only fallback:", toolError);
      
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `GIVE ME A JSON OBJECT FOR THE NEAREST HOSPITAL TO LAT ${lat}, LNG ${lng}. Format: {"name": "...", "phone": "...", "address": "...", "distance": "..."}. If unknown, use "112" as phone.`
      });
      
      const text = fallbackResponse.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const hospital = JSON.parse(jsonMatch[0]);
        return {
          name: hospital.name || DEFAULT_HOSPITAL.name,
          phone: hospital.phone || DEFAULT_HOSPITAL.phone,
          address: hospital.address || DEFAULT_HOSPITAL.address,
          distance: hospital.distance || DEFAULT_HOSPITAL.distance
        };
      }
    }

    return DEFAULT_HOSPITAL;
  } catch (error) {
    console.error("Critical error in getNearestHospital:", error);
    return DEFAULT_HOSPITAL;
  }
}

export async function getTop3Hospitals(lat: number, lng: number): Promise<Hospital[]> {
  const DEFAULT_HOSPITALS: Hospital[] = [
    { name: "Emergency Services", phone: "112", address: "National Helpline", distance: "0 km" },
    { name: "Ambulance Network", phone: "108", address: "Emergency Medical Transport", distance: "Live Tracking" },
    { name: "Police Emergency", phone: "100", address: "Emergency Assistance", distance: "Rapid Response" }
  ];

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return DEFAULT_HOSPITALS;

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `User at ${lat}, ${lng}. List top 3 hospitals (24/7 ER) with name, phone, address, dist. JSON array only.`,
      config: {
        tools: [{ googleMaps: {} } as any],
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (text) {
      const hospitals = JSON.parse(text);
      if (Array.isArray(hospitals) && hospitals.length > 0) {
        return hospitals.map(h => ({
          ...h,
          phone: h.phone?.replace(/\s+/g, '') || "112" // Sanitize for tel: links
        }));
      }
    }
    
    // Fallback to local search if Gemini returns empty or invalid
    const local = searchLocalHospitals(lat, lng);
    return local.length > 0 ? local : DEFAULT_HOSPITALS;

  } catch (error) {
    console.error("Error in getTop3Hospitals:", error);
    // On API failure (quota etc), use local search then static defaults
    const local = searchLocalHospitals(lat, lng);
    return local.length > 0 ? local : DEFAULT_HOSPITALS;
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
