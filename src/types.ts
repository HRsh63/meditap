export type UserRole = 'patient' | 'hospital' | 'insurance';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profileImage?: string;
  phone?: string;
  created_at: string;
}

export interface MedicalRecord {
  id: string;
  user_id: string;
  title: string;
  record_type: 'Checkup' | 'Lab Report' | 'Prescription' | 'Discharge Note';
  hospital: string;
  doctor: string;
  file_url?: string;
  created_at: string;
}

export interface PatientData {
  id: string;
  user_id: string;
  dob?: string;
  gender?: string;
  address?: string;
  blood_group?: string;
  weight?: string;
  height?: string;
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
  disabilities?: string[];
  medical_history?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  qr_code?: string;
  created_at: string;
}
