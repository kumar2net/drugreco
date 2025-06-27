const drugs = [
  {
    name: "Paracetamol 500mg",
    category: "Pain Relief",
    price: 35,
    combination: "Paracetamol",
    strength: "500mg",
    dosageForm: "Tablet",
    manufacturer: "Sun Pharma",
    sideEffects: ["Nausea", "Liver problems in high doses", "Allergic reactions"],
    alternatives: ["Dolo 650", "Crocin", "Calpol"]
  },
  {
    name: "Dolo 650",
    category: "Pain Relief",
    price: 42,
    combination: "Paracetamol",
    strength: "650mg",
    dosageForm: "Tablet",
    manufacturer: "Micro Labs",
    sideEffects: ["Nausea", "Liver problems in high doses", "Allergic reactions"],
    alternatives: ["Paracetamol 500mg", "Crocin", "Calpol"]
  },
  {
    name: "Azithromycin 500mg",
    category: "Antibiotics",
    price: 95,
    combination: "Azithromycin",
    strength: "500mg",
    dosageForm: "Tablet",
    manufacturer: "Cipla",
    sideEffects: ["Diarrhea", "Nausea", "Abdominal pain"],
    alternatives: ["Zithromax", "Zithral", "Azee"]
  },
  {
    name: "Metformin 500mg",
    category: "Diabetes",
    price: 65,
    combination: "Metformin",
    strength: "500mg",
    dosageForm: "Tablet",
    manufacturer: "USV Ltd",
    sideEffects: ["Nausea", "Diarrhea", "Vitamin B12 deficiency"],
    alternatives: ["Glycomet", "Glucophage", "Metlong"]
  },
  {
    name: "Amlodipine 5mg",
    category: "Hypertension",
    price: 78,
    combination: "Amlodipine",
    strength: "5mg",
    dosageForm: "Tablet",
    manufacturer: "MSD",
    sideEffects: ["Swelling in ankles", "Headache", "Dizziness"],
    alternatives: ["Amlong", "Amlovas", "Stamlo"]
  },
  {
    name: "Omeprazole 20mg",
    category: "Gastrointestinal",
    price: 88,
    combination: "Omeprazole",
    strength: "20mg",
    dosageForm: "Capsule",
    manufacturer: "Sun Pharma",
    sideEffects: ["Headache", "Diarrhea", "Abdominal pain"],
    alternatives: ["Pantoprazole", "Esomeprazole", "Rabeprazole"]
  },
  {
    name: "Cetirizine 10mg",
    category: "Antiallergic",
    price: 52,
    combination: "Cetirizine",
    strength: "10mg",
    dosageForm: "Tablet",
    manufacturer: "USV Ltd",
    sideEffects: ["Drowsiness", "Dry mouth", "Headache"],
    alternatives: ["Levocet", "Alerid", "Zyrtec"]
  },
  {
    name: "Atorvastatin 20mg",
    category: "Cardiovascular",
    price: 125,
    combination: "Atorvastatin",
    strength: "20mg",
    dosageForm: "Tablet",
    manufacturer: "Cipla",
    sideEffects: ["Muscle pain", "Liver problems", "Digestive issues"],
    alternatives: ["Lipitor", "Atorva", "Torvacard"]
  },
  // Additional Pain Relief drugs
  {
    name: "Ibuprofen 400mg",
    category: "Pain Relief",
    price: 45,
    combination: "Ibuprofen",
    strength: "400mg",
    dosageForm: "Tablet",
    manufacturer: "Cipla",
    sideEffects: ["Stomach pain", "Heartburn", "Dizziness"],
    alternatives: ["Brufen", "Advil", "Nurofen"]
  },
  {
    name: "Diclofenac 50mg",
    category: "Pain Relief",
    price: 48,
    combination: "Diclofenac",
    strength: "50mg",
    dosageForm: "Tablet",
    manufacturer: "Novartis",
    sideEffects: ["Stomach ulcers", "Kidney problems", "High blood pressure"],
    alternatives: ["Voveran", "Cataflam", "Voltaren"]
  },
  {
    name: "Naproxen 500mg",
    category: "Pain Relief",
    price: 62,
    combination: "Naproxen",
    strength: "500mg",
    dosageForm: "Tablet",
    manufacturer: "Sun Pharma",
    sideEffects: ["Stomach pain", "Heartburn", "Drowsiness"],
    alternatives: ["Naprosyn", "Aleve", "Anaprox"]
  },
  {
    name: "Aspirin 75mg",
    category: "Pain Relief",
    price: 28,
    combination: "Aspirin",
    strength: "75mg",
    dosageForm: "Tablet",
    manufacturer: "Bayer",
    sideEffects: ["Stomach bleeding", "Allergic reactions", "Ringing in ears"],
    alternatives: ["Ecosprin", "Disprin", "Aspilet"]
  },
  {
    name: "Tramadol 50mg",
    category: "Pain Relief",
    price: 72,
    combination: "Tramadol",
    strength: "50mg",
    dosageForm: "Capsule",
    manufacturer: "Cipla",
    sideEffects: ["Dizziness", "Nausea", "Constipation"],
    alternatives: ["Ultram", "Tramal", "Contramal"]
  },
  // Additional Antibiotics
  {
    name: "Amoxicillin 500mg",
    category: "Antibiotics",
    price: 82,
    combination: "Amoxicillin",
    strength: "500mg",
    dosageForm: "Capsule",
    manufacturer: "Cipla",
    sideEffects: ["Diarrhea", "Rash", "Allergic reactions"],
    alternatives: ["Novamox", "Amoxil", "Trimox"]
  },
  {
    name: "Ciprofloxacin 500mg",
    category: "Antibiotics",
    price: 105,
    combination: "Ciprofloxacin",
    strength: "500mg",
    dosageForm: "Tablet",
    manufacturer: "Bayer",
    sideEffects: ["Tendon rupture", "Nausea", "Diarrhea"],
    alternatives: ["Ciplox", "Cipro", "Ciprobay"]
  },
  {
    name: "Doxycycline 100mg",
    category: "Antibiotics",
    price: 92,
    combination: "Doxycycline",
    strength: "100mg",
    dosageForm: "Capsule",
    manufacturer: "Pfizer",
    sideEffects: ["Photosensitivity", "Nausea", "Esophageal irritation"],
    alternatives: ["Vibramycin", "Doxy", "Monodox"]
  },
  {
    name: "Clarithromycin 500mg",
    category: "Antibiotics",
    price: 115,
    combination: "Clarithromycin",
    strength: "500mg",
    dosageForm: "Tablet",
    manufacturer: "Abbott",
    sideEffects: ["Diarrhea", "Nausea", "Abnormal taste"],
    alternatives: ["Biaxin", "Klaricid", "Claribid"]
  },
  {
    name: "Metronidazole 400mg",
    category: "Antibiotics",
    price: 75,
    combination: "Metronidazole",
    strength: "400mg",
    dosageForm: "Tablet",
    manufacturer: "Sun Pharma",
    sideEffects: ["Metallic taste", "Nausea", "Dark urine"],
    alternatives: ["Flagyl", "Metrogyl", "Nidazol"]
  },
  // Additional Diabetes drugs
  {
    name: "Glimepiride 2mg",
    category: "Diabetes",
    price: 72,
    combination: "Glimepiride",
    strength: "2mg",
    dosageForm: "Tablet",
    manufacturer: "Sanofi",
    sideEffects: ["Hypoglycemia", "Weight gain", "Nausea"],
    alternatives: ["Amaryl", "Glimepiride", "Glimestar"]
  },
  {
    name: "Sitagliptin 100mg",
    category: "Diabetes",
    price: 165,
    combination: "Sitagliptin",
    strength: "100mg",
    dosageForm: "Tablet",
    manufacturer: "Merck",
    sideEffects: ["Upper respiratory infection", "Headache", "Joint pain"],
    alternatives: ["Januvia", "Xelevia", "Istavel"]
  },
  {
    name: "Empagliflozin 25mg",
    category: "Diabetes",
    price: 185,
    combination: "Empagliflozin",
    strength: "25mg",
    dosageForm: "Tablet",
    manufacturer: "Boehringer",
    sideEffects: ["UTI", "Dehydration", "Ketoacidosis"],
    alternatives: ["Jardiance", "Glyxambi", "Synjardy"]
  },
  {
    name: "Pioglitazone 15mg",
    category: "Diabetes",
    price: 98,
    combination: "Pioglitazone",
    strength: "15mg",
    dosageForm: "Tablet",
    manufacturer: "Takeda",
    sideEffects: ["Weight gain", "Edema", "Fracture risk"],
    alternatives: ["Actos", "Pioz", "Piozone"]
  },
  {
    name: "Repaglinide 2mg",
    category: "Diabetes",
    price: 95,
    combination: "Repaglinide",
    strength: "2mg",
    dosageForm: "Tablet",
    manufacturer: "Novo Nordisk",
    sideEffects: ["Hypoglycemia", "Weight gain", "Upper respiratory infections"],
    alternatives: ["Prandin", "Eurepa", "Novonorm"]
  }
];

exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('drugs').del()
    .then(function () {
      // Inserts seed entries
      const drugData = drugs.map(drug => ({
        ...drug,
        sideEffects: JSON.stringify(drug.sideEffects),
        alternatives: JSON.stringify(drug.alternatives)
      }));
      return knex('drugs').insert(drugData);
    });
}; 