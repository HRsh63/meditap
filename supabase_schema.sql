-- Final Robust Supabase Schema for MediTap
-- This version uses triggers to handle profile creation, avoiding RLS issues during signup.

-- 1. Clean up existing tables
DROP TABLE IF EXISTS public.access_logs CASCADE;
DROP TABLE IF EXISTS public.medical_records CASCADE;
DROP TABLE IF EXISTS public.patient_data CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('patient', 'hospital', 'insurance')),
  profile_image TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create patient_data table
CREATE TABLE public.patient_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  age INTEGER,
  blood_group TEXT,
  allergies TEXT[],
  medications TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

-- 4. Create medical_records table
CREATE TABLE public.medical_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  record_type TEXT CHECK (record_type IN ('Checkup', 'Lab Report', 'Prescription', 'Vaccination')),
  hospital TEXT,
  doctor TEXT,
  status TEXT CHECK (status IN ('Completed', 'Pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create access_logs table
CREATE TABLE public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  accessed_by_name TEXT,
  accessed_by_role TEXT,
  access_type TEXT,
  status TEXT,
  action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create vitals table
CREATE TABLE public.vitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'Blood Pressure', 'Weight', 'Heart Rate', etc.
  value TEXT NOT NULL,
  unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create appointments table
CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  doctor TEXT,
  location TEXT,
  appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'Scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create claims table
CREATE TABLE public.claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT DEFAULT 'Processing',
  claim_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- 10. Create Policies

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Patient Data
CREATE POLICY "Patients can view own data." ON public.patient_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Hospitals can view patient data." ON public.patient_data FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hospital')
);
CREATE POLICY "Patients can update own data." ON public.patient_data FOR UPDATE USING (auth.uid() = user_id);

-- Medical Records
CREATE POLICY "Patients can view own records." ON public.medical_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Hospitals can view records." ON public.medical_records FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hospital')
);
CREATE POLICY "Patients can manage own records." ON public.medical_records FOR ALL USING (auth.uid() = user_id);

-- Access Logs
CREATE POLICY "Patients can view own access logs." ON public.access_logs FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Hospitals can insert access logs." ON public.access_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hospital')
);

-- Vitals
CREATE POLICY "Users can manage own vitals." ON public.vitals FOR ALL USING (auth.uid() = user_id);

-- Appointments
CREATE POLICY "Users can manage own appointments." ON public.appointments FOR ALL USING (auth.uid() = user_id);

-- Claims
CREATE POLICY "Users can manage own claims." ON public.claims FOR ALL USING (auth.uid() = user_id);

-- 11. Automation Triggers

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.email, 
    new.raw_user_meta_data->>'role'
  );

  -- If the user is a patient, also create a patient_data entry
  IF (new.raw_user_meta_data->>'role' = 'patient') THEN
    INSERT INTO public.patient_data (user_id)
    VALUES (new.id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
