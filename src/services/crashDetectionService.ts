import { getNearestHospital, Hospital } from './hospitalService';
import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";
import { chatService } from './chatService';

export interface CrashEvent {
  timestamp: number;
  type: 'crash' | 'fall';
  location: {
    lat: number;
    lng: number;
  };
  hospital: Hospital | null;
}

interface SensorSample {
  t: number;
  ax: number;
  ay: number;
  az: number;
}

class CrashDetectionService {
  private isMonitoring: boolean = false;
  private isTriggering: boolean = false;
  private isVerifying: boolean = false;
  private lastAcceleration: number = 0;
  private stasisStartTime: number | null = null;
  private onCrashDetected: (event: CrashEvent) => void = () => {};
  private onData: (acc: number) => void = () => {};
  private onCountdown: (seconds: number | null) => void = () => {};
  
  // Sensor Buffer for AI Analysis (Last 3 seconds)
  private sensorBuffer: SensorSample[] = [];
  private readonly BUFFER_LIMIT = 60; // 20Hz * 3s = 60 samples
  private lastSampleTime: number = 0;

  // Thresholds (using accelerationIncludingGravity where gravity is ~9.81)
  private readonly IMPACT_THRESHOLD = 20.0; // Significant impact
  private readonly STASIS_LOWER = 8.5;     // Near gravity (9.81)
  private readonly STASIS_UPPER = 11.5;    // Near gravity (9.81)
  private readonly STASIS_DURATION = 2000; // 2 seconds of immobility

  setCrashCallback(callback: (event: CrashEvent) => void) {
    this.onCrashDetected = callback;
  }

  setDataCallback(callback: (acc: number) => void) {
    this.onData = callback;
  }

  setCountdownCallback(callback: (seconds: number | null) => void) {
    this.onCountdown = callback;
  }

  async requestPermissions(): Promise<{ granted: boolean; error?: string }> {
    const isInIframe = window.self !== window.top;
    
    if (typeof DeviceMotionEvent === 'undefined') {
      return { 
        granted: false, 
        error: 'DeviceMotion is not supported by this browser or device.' 
      };
    }

    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') return { granted: true };
        return { granted: false, error: 'Permission denied by user.' };
      } catch (error) {
        console.error('Error requesting motion permission:', error);
        return { 
          granted: false, 
          error: isInIframe 
            ? 'Permission request failed. This often happens in iframes. Try opening the app in a new tab.' 
            : 'Permission request failed.' 
        };
      }
    }

    return new Promise((resolve) => {
      let receivedData = false;
      const testHandler = (e: DeviceMotionEvent) => {
        if (e.accelerationIncludingGravity) {
          receivedData = true;
          window.removeEventListener('devicemotion', testHandler);
          resolve({ granted: true });
        }
      };

      window.addEventListener('devicemotion', testHandler);

      setTimeout(() => {
        window.removeEventListener('devicemotion', testHandler);
        if (!receivedData) {
          resolve({ 
            granted: false, 
            error: isInIframe 
              ? 'No sensor data received. Sensors are likely blocked in the preview. Please open the app in a new tab to use this feature.' 
              : 'No sensor data received. Your device may not have the required sensors.' 
          });
        }
      }, 500);
    });
  }

  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.isTriggering = false;
    this.sensorBuffer = [];
    window.addEventListener('devicemotion', this.handleMotion);
    console.log('Fall & Crash detection started');
  }

  stop() {
    this.isMonitoring = false;
    window.removeEventListener('devicemotion', this.handleMotion);
    this.stasisStartTime = null;
    console.log('Fall & Crash detection stopped');
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    if (this.isTriggering) return;
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const now = Date.now();
    
    const totalAcc = Math.sqrt(
      (acc.x || 0) ** 2 + 
      (acc.y || 0) ** 2 + 
      (acc.z || 0) ** 2
    );

    // Maintain sensor buffer for AI analysis
    if (now - this.lastSampleTime > 50) {
      this.sensorBuffer.push({ t: now, ax: acc.x || 0, ay: acc.y || 0, az: acc.z || 0 });
      if (this.sensorBuffer.length > this.BUFFER_LIMIT) this.sensorBuffer.shift();
      this.lastSampleTime = now;
    }

    this.onData(totalAcc);

    // 1. Detect Impact
    if (totalAcc > this.IMPACT_THRESHOLD && !this.stasisStartTime) {
      console.log('High impact detected:', totalAcc);
      this.stasisStartTime = now;
      this.verifyFallWithAI(); // Run AI in parallel but continue sensor check
      return;
    }

    // 2. Detect Immobility after Impact
    if (this.stasisStartTime) {
      const isStill = totalAcc > this.STASIS_LOWER && totalAcc < this.STASIS_UPPER;
      
      if (isStill) {
        const timeInStasis = now - this.stasisStartTime;
        if (timeInStasis > this.STASIS_DURATION) {
          console.log('Fall confirmed: Impact followed by stasis');
          this.initiateEmergencySequence('fall');
          this.stasisStartTime = null;
        }
      } else if (totalAcc > this.IMPACT_THRESHOLD) {
        // Reset stasis timer on new impact
        this.stasisStartTime = now;
      } else if (now - this.stasisStartTime > 10000) {
        // Timeout stasis after 10s if no confirmation
        this.stasisStartTime = null;
      }
    }
  };

  private async verifyFallWithAI() {
    if (this.isTriggering || this.isVerifying) return;
    this.isVerifying = true;
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY is not set. Proceeding with sensor-only detection.');
        this.initiateEmergencySequence('fall');
        return;
      }

      // Collect a bit more data after the trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      const ai = new GoogleGenAI({ apiKey });
      const sensorDataStr = this.sensorBuffer
        .map(s => `[${s.ax.toFixed(2)},${s.ay.toFixed(2)},${s.az.toFixed(2)}]`)
        .join(',');

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Analyze this sequence of accelerometer [x,y,z] readings during a potential fall event. 
        Detection Window: ${sensorDataStr}
        Return a JSON object: {"isFall": boolean, "confidence": number, "reason": string}.
        Only mark true if it looks like a sudden impact followed by lack of movement.`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      const result = JSON.parse(text);
      if (result.isFall && result.confidence > 0.6) {
        console.log('AI Studio CONFIRMED FALL:', result.reason);
        this.initiateEmergencySequence('fall');
      } else {
        console.log('AI Studio dismissed potential fall:', result.reason || 'No reason provided');
      }
    } catch (error: any) {
      console.error('Error verifying fall with AI Studio:', error);
      
      // BROAD FALLBACK: If Gemini fails for ANY reason (Quota, Network, Auth),
      // we proceed with the emergency sequence for safety since the physical sensors triggered.
      console.warn('AI Verification failed. Proceeding with sensor-only detection for safety.');
      this.initiateEmergencySequence('fall');
    } finally {
      this.isVerifying = false;
    }
  }

  private async initiateEmergencySequence(type: 'crash' | 'fall') {
    if (this.isTriggering) return;
    this.isTriggering = true;
    
    // Start 10s countdown
    let timeLeft = 10;
    this.onCountdown(timeLeft);

    const countdownInterval = setInterval(() => {
      timeLeft--;
      this.onCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        this.triggerEmergency(type);
      }
    }, 1000);

    // Store interval to allow cancellation
    (this as any)._activeCountdown = countdownInterval;
  }

  cancelEmergency() {
    if ((this as any)._activeCountdown) {
      clearInterval((this as any)._activeCountdown);
      (this as any)._activeCountdown = null;
      this.isTriggering = false;
      this.onCountdown(null);
      console.log('Emergency cancelled by user');
    }
  }

  private async triggerEmergency(type: 'crash' | 'fall' = 'crash') {
    this.onCountdown(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      const { latitude: lat, longitude: lng } = position.coords;
      const hospital = await getNearestHospital(lat, lng);

      // 1. Notify Emergency Contacts & Broadcast SOS to Friends
      await this.notifyEmergencyContacts(lat, lng, hospital, type);
      await this.broadcastSOSToFriends(lat, lng, type);

      this.onCrashDetected({
        timestamp: Date.now(),
        type,
        location: { lat, lng },
        hospital
      });

      // Emergency Call: Prioritize dialing 112 as requested
      console.log('TRIGGERING AUTO-DIAL 112');
      if (window.top) {
        window.top.postMessage('DIALING_112', '*');
      }
      window.location.href = `tel:112`;

    } catch (error) {
      console.error('Error in emergency trigger:', error);
      this.isTriggering = false; // Allow retry on failure
    }
  }

  private async broadcastSOSToFriends(lat: number, lng: number, type: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Broadcast via Supabase Realtime Channel
      // Every friend listening to their own "friend_notifications" channel will receive this
      const channel = supabase.channel(`sos_alerts`);
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.send({
            type: 'broadcast',
            event: 'sos_alert',
            payload: {
              senderId: user.id,
              senderName: (user.user_metadata as any).name || 'Your Friend',
              type,
              lat,
              lng,
              timestamp: Date.now(),
              mapsLink: `https://www.google.com/maps?q=${lat},${lng}`
            }
          });
          // Also broadcast via Chat
          chatService.broadcastSOSToAllFriends(`AUTOMATIC SOS: ${type.toUpperCase()} DETECTED! Need immediate assistance. My live location is attached.`, lat, lng, type);
        }
      });
    } catch (error) {
      console.error('Error broadcasting SOS to friends:', error);
    }
  }

  private async notifyEmergencyContacts(lat: number, lng: number, hospital: Hospital | null, type: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: patientData } = await supabase
        .from('patient_data')
        .select('emergency_contact_phone, emergency_contact_name')
        .eq('user_id', user.id)
        .single();

      if (patientData?.emergency_contact_phone) {
        await supabase.from('emergency_alerts').insert({
          user_id: user.id,
          type: type === 'fall' ? 'fall_detected' : 'crash_detected',
          location_lat: lat,
          location_lng: lng,
          hospital_name: hospital?.name,
          contact_notified: patientData.emergency_contact_phone,
          metadata: { pipeline: 'AI_STUDIO_VERIFIED' }
        });
      }
    } catch (error) {
      console.error('Error notifying emergency contacts:', error);
    }
  }
}

export const crashDetectionService = new CrashDetectionService();
