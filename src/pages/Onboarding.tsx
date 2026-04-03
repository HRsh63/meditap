import { motion } from 'motion/react';
import { Shield, Zap, Users, FileText, ArrowRight, Activity, Clock, Upload, CheckCircle, AlertCircle, Search, Smartphone, User, Heart, Droplet, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bloodGroup: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    age: ''
  });
  const navigate = useNavigate();

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('patient_data')
        .upsert({
          user_id: user.id,
          blood_group: formData.bloodGroup,
          allergies: formData.allergies.split(',').map(s => s.trim()).filter(Boolean),
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          age: parseInt(formData.age) || null
        });

      if (error) throw error;

      // Update profile to mark onboarding as complete if needed
      // For now just navigate
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
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-2 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'candy-gradient' : 'bg-gray-100'}`}
            ></div>
          ))}
        </div>

        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 candy-gradient rounded-3xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-8 shadow-xl">M</div>
            <h1 className="text-4xl font-bold mb-4">Welcome to MediTap</h1>
            <p className="text-gray-500 text-lg mb-12">The world's first instant medical identity platform. Let's get you set up.</p>
            <button onClick={nextStep} className="candy-button-primary w-full text-lg py-4 flex items-center justify-center gap-2">
              Get Started <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-bold mb-2">Setup your profile</h2>
            <p className="text-gray-500 mb-8">Choose how you want to import your medical data.</p>
            
            <div className="space-y-4 mb-12">
              <button onClick={nextStep} className="candy-card p-6 w-full text-left flex items-center gap-6 hover:border-brand-pink group">
                <div className="w-16 h-16 bg-blue-100 text-brand-blue rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Sync Insurance</h4>
                  <p className="text-sm text-gray-500">Auto-import records from your provider.</p>
                </div>
              </button>

              <button onClick={nextStep} className="candy-card p-6 w-full text-left flex items-center gap-6 hover:border-brand-pink group">
                <div className="w-16 h-16 bg-purple-100 text-brand-purple rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Manual Entry</h4>
                  <p className="text-sm text-gray-500">Upload your records and enter details manually.</p>
                </div>
              </button>
            </div>
            
            <button onClick={prevStep} className="text-gray-400 font-bold w-full text-center hover:text-gray-600">Go Back</button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-3xl font-bold mb-2">Critical Info</h2>
            <p className="text-gray-500 mb-8">This information will be available in case of emergency.</p>
            
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
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Age</label>
                  <input 
                    type="number" 
                    placeholder="25" 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Emergency Name</label>
                  <input 
                    type="text" 
                    placeholder="Contact Name" 
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({...formData, emergencyContactName: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Allergies (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Penicillin, Peanuts" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                  value={formData.allergies}
                  onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Emergency Phone</label>
                <input 
                  type="text" 
                  placeholder="+1 (555) 000-0000" 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-brand-pink outline-none transition-all"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({...formData, emergencyContactPhone: e.target.value})}
                />
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
