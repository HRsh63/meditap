import { motion } from 'motion/react';
import { Shield, Zap, Users, FileText, ArrowRight, Activity, Clock, Upload, CheckCircle, AlertCircle, Search, Smartphone, User, Heart, Droplet, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { friendService } from '../services/friendService';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    importMethod: '', // 'insurance' or 'manual'
    name: '',
    dob: '',
    gender: '',
    address: '',
    bloodGroup: '',
    weight: '',
    height: '',
    conditions: '',
    allergies: '',
    medications: '',
    disabilities: '',
    medicalHistory: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  const navigate = useNavigate();

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Generate a unique QR code string (e.g., user ID or a specific token)
      const qrCode = `meditap-${user.id}-${Date.now()}`;

      const { error } = await supabase
        .from('patient_data')
        .upsert({
          user_id: user.id,
          dob: formData.dob,
          gender: formData.gender,
          address: formData.address,
          blood_group: formData.bloodGroup,
          weight: formData.weight,
          height: formData.height,
          conditions: formData.conditions.split(',').map(s => s.trim()).filter(Boolean),
          allergies: formData.allergies.split(',').map(s => s.trim()).filter(Boolean),
          medications: formData.medications.split(',').map(s => s.trim()).filter(Boolean),
          disabilities: formData.disabilities.split(',').map(s => s.trim()).filter(Boolean),
          medical_history: formData.medicalHistory,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          qr_code: qrCode
        });

      if (error) throw error;

      // Update user name if it was changed
      if (formData.name) {
        await supabase.from('profiles').update({ name: formData.name }).eq('id', user.id);
      }

      // Auto-connect with all existing users for demo mode
      await friendService.autoConnectAllUsers();

      navigate('/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      alert('Failed to save your data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-12">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={`h-2 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'candy-gradient' : 'bg-gray-100'}`}
            ></div>
          ))}
        </div>

        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-bold mb-2">Welcome to MediTap</h2>
            <p className="text-gray-500 mb-8">Choose how you want to import your medical data.</p>
            
            <div className="space-y-4 mb-12">
              <button 
                onClick={() => { setFormData({...formData, importMethod: 'insurance'}); nextStep(); }} 
                className={`candy-card p-6 w-full text-left flex items-center gap-6 group transition-all ${formData.importMethod === 'insurance' ? 'border-brand-pink ring-2 ring-brand-pink/20' : 'hover:border-brand-pink'}`}
              >
                <div className="w-16 h-16 bg-blue-100 text-brand-blue rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Sync Insurance</h4>
                  <p className="text-sm text-gray-500">Auto-import records from your provider.</p>
                </div>
              </button>

              <button 
                onClick={() => { setFormData({...formData, importMethod: 'manual'}); nextStep(); }} 
                className={`candy-card p-6 w-full text-left flex items-center gap-6 group transition-all ${formData.importMethod === 'manual' ? 'border-brand-pink ring-2 ring-brand-pink/20' : 'hover:border-brand-pink'}`}
              >
                <div className="w-16 h-16 bg-purple-100 text-brand-purple rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Manual Entry</h4>
                  <p className="text-sm text-gray-500">Enter your details manually.</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-bold mb-2">Basic Info</h2>
            <p className="text-gray-500 mb-8">Let's start with the basics.</p>
            
            <div className="space-y-6 mb-12">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Full Name</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Date of Birth</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={formData.dob}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Gender</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Address</label>
                <textarea 
                  placeholder="123 Medical Way, Health City" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all h-24 resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all">Back</button>
              <button onClick={nextStep} className="flex-[2] candy-button-primary py-4 font-bold">Next Step</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-bold mb-2">Medical Basics</h2>
            <p className="text-gray-500 mb-8">Vital information for medical personnel.</p>
            
            <div className="space-y-6 mb-12">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Blood Group</label>
                <div className="grid grid-cols-4 gap-2">
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                    <button 
                      key={bg} 
                      onClick={() => setFormData({...formData, bloodGroup: bg})}
                      className={`py-3 border-2 rounded-xl font-bold text-sm transition-all ${formData.bloodGroup === bg ? 'border-brand-pink bg-brand-light text-brand-pink' : 'border-gray-100 hover:border-brand-pink'}`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Weight (kg)</label>
                  <input 
                    type="number" 
                    placeholder="70" 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={formData.weight}
                    onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Height (cm)</label>
                  <input 
                    type="number" 
                    placeholder="175" 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={formData.height}
                    onChange={(e) => setFormData({...formData, height: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all">Back</button>
              <button onClick={nextStep} className="flex-[2] candy-button-primary py-4 font-bold">Next Step</button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-bold mb-2">Health Profile</h2>
            <p className="text-gray-500 mb-8">List any conditions or medications.</p>
            
            <div className="space-y-6 mb-12">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Chronic Conditions</label>
                <input 
                  type="text" 
                  placeholder="e.g. Diabetes, Hypertension" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                  value={formData.conditions}
                  onChange={(e) => setFormData({...formData, conditions: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Allergies</label>
                <input 
                  type="text" 
                  placeholder="e.g. Penicillin, Peanuts" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                  value={formData.allergies}
                  onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Current Medications</label>
                <input 
                  type="text" 
                  placeholder="e.g. Metformin, Lisinopril" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                  value={formData.medications}
                  onChange={(e) => setFormData({...formData, medications: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Disabilities</label>
                <input 
                  type="text" 
                  placeholder="e.g. Visual Impairment" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                  value={formData.disabilities}
                  onChange={(e) => setFormData({...formData, disabilities: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button onClick={prevStep} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all">Back</button>
              <button onClick={nextStep} className="flex-[2] candy-button-primary py-4 font-bold">Next Step</button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-bold mb-2">History & Emergency</h2>
            <p className="text-gray-500 mb-8">Final details for your medical profile.</p>
            
            <div className="space-y-6 mb-12">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Medical History Summary</label>
                <textarea 
                  placeholder="e.g. Appendectomy in 2015, Family history of heart disease" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all h-24 resize-none"
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({...formData, medicalHistory: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Emergency Contact</label>
                  <input 
                    type="text" 
                    placeholder="Name" 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Contact Phone</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 000-0000" 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({...formData, emergencyContactPhone: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleComplete} 
                disabled={loading}
                className="candy-button-primary w-full text-lg py-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Complete Setup'}
              </button>
              <button onClick={prevStep} className="text-gray-400 font-bold w-full text-center hover:text-gray-600">Go Back</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
