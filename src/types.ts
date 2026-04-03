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
  record_type: 'Checkup' | 'Lab Report' | 'Prescription' | 'Vaccination';
  hospital: string;
  doctor: string;
  status: 'Completed' | 'Pending';
  created_at: string;
}

export interface PatientData {
  id: string;
  user_id: string;
  age?: number;
  blood_group?: string;
  allergies?: string[];
  medications?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  hospital_db_downloaded?: boolean;
  hospital_db_range?: number; // in km, 0 means full India
  created_at: string;
}
