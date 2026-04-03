export interface StaticHospital {
  name: string;
  phone: string;
  city: string;
  state: string;
}

// A fallback "database" of major hospitals in India
export const EMERGENCY_HOSPITALS: StaticHospital[] = [
  { name: "Apollo Hospitals", phone: "1066", city: "Chennai", state: "Tamil Nadu" },
  { name: "Fortis Memorial Research Institute", phone: "0124-4962200", city: "Gurugram", state: "Haryana" },
  { name: "AIIMS New Delhi", phone: "011-26588500", city: "New Delhi", state: "Delhi" },
  { name: "Max Super Speciality Hospital", phone: "011-26515050", city: "New Delhi", state: "Delhi" },
  { name: "Medanta - The Medicity", phone: "0124-4141414", city: "Gurugram", state: "Haryana" },
  { name: "Christian Medical College (CMC)", phone: "0416-2281000", city: "Vellore", state: "Tamil Nadu" },
  { name: "Tata Memorial Hospital", phone: "022-24177000", city: "Mumbai", state: "Maharashtra" },
  { name: "Lilavati Hospital", phone: "022-26751000", city: "Mumbai", state: "Maharashtra" },
  { name: "Manipal Hospital", phone: "080-25024444", city: "Bengaluru", state: "Karnataka" },
  { name: "Kokilaben Dhirubhai Ambani Hospital", phone: "022-30999999", city: "Mumbai", state: "Maharashtra" },
  { name: "Amrita Hospital", phone: "0484-2801234", city: "Kochi", state: "Kerala" },
  { name: "Aster CMI Hospital", phone: "080-43420100", city: "Bengaluru", state: "Karnataka" },
  { name: "SevenHills Hospital", phone: "022-67676767", city: "Mumbai", state: "Maharashtra" },
  { name: "Sir Ganga Ram Hospital", phone: "011-25750000", city: "New Delhi", state: "Delhi" },
  { name: "Nanavati Max Super Speciality Hospital", phone: "022-26267500", city: "Mumbai", state: "Maharashtra" }
];
