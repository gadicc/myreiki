export interface Treatment {
  _id: string;
  patientId: string;
  practitionerId: string;
  date: Date;
  duration: number;
  type: "regular" | "self" | "distance" | "animal";
  notes: string;
}
