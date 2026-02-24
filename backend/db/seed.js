const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function seedDatabase(db) {
    // Check if already seeded
    const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (existingUsers && existingUsers.count > 0) {
        console.log('📋 Database already seeded');
        return;
    }

    console.log('🌱 Seeding database...');

    // --- USERS ---
    const passwordHash = bcrypt.hashSync('password123', 10);
    const users = [
        ['u-001', 'dr.smith', passwordHash, 'Dr. Sarah Smith', 'doctor', 'Internal Medicine'],
        ['u-002', 'dr.patel', passwordHash, 'Dr. Raj Patel', 'doctor', 'Cardiology'],
        ['u-003', 'nurse.jones', passwordHash, 'Emily Jones, RN', 'nurse', 'ICU'],
        ['u-004', 'admin', passwordHash, 'System Admin', 'admin', null],
    ];
    users.forEach(u => db.prepare('INSERT INTO users (id, username, password_hash, full_name, role, specialty) VALUES (?, ?, ?, ?, ?, ?)').run(...u));

    // --- PATIENTS ---
    const patients = [
        ['pt-001', 'MRN-2024-001', 'James', 'Morrison', '1959-03-15', 'Male', 'A+', '(555) 123-4567', 'j.morrison@email.com', '123 Oak St, Springfield, IL 62701', 'Linda Morrison', '(555) 123-4568', 'Blue Cross Blue Shield', 'BCBS-99281', 'Type 2 Diabetes Mellitus with chronic kidney disease', 'Penicillin, Sulfa drugs', 'active', 'high'],
        ['pt-002', 'MRN-2024-002', 'Maria', 'Garcia', '1975-08-22', 'Female', 'O+', '(555) 234-5678', 'm.garcia@email.com', '456 Pine Ave, Springfield, IL 62702', 'Carlos Garcia', '(555) 234-5679', 'Aetna', 'AET-44521', 'Hypertension with heart failure (NYHA Class II)', 'Aspirin', 'active', 'medium'],
        ['pt-003', 'MRN-2024-003', 'Robert', 'Chen', '1948-11-03', 'Male', 'B+', '(555) 345-6789', 'r.chen@email.com', '789 Elm Blvd, Springfield, IL 62703', 'Susan Chen', '(555) 345-6790', 'Medicare', 'MCR-77834', 'COPD with recurrent pneumonia, post-CABG', 'Codeine, Latex', 'active', 'critical'],
        ['pt-004', 'MRN-2024-004', 'Aisha', 'Williams', '1990-05-17', 'Female', 'AB-', '(555) 456-7890', 'a.williams@email.com', '321 Maple Dr, Springfield, IL 62704', 'David Williams', '(555) 456-7891', 'United Healthcare', 'UHC-55612', 'Systemic Lupus Erythematosus (SLE)', 'None known', 'active', 'medium'],
        ['pt-005', 'MRN-2024-005', 'Thomas', 'Anderson', '1965-09-28', 'Male', 'O-', '(555) 567-8901', 't.anderson@email.com', '654 Cedar Ln, Springfield, IL 62705', 'Helen Anderson', '(555) 567-8902', 'Cigna', 'CIG-33298', 'Chronic liver disease (NASH cirrhosis)', 'Morphine, Ibuprofen', 'active', 'high'],
        ['pt-006', 'MRN-2024-006', 'Emily', 'Nakamura', '1982-12-01', 'Female', 'A-', '(555) 678-9012', 'e.nakamura@email.com', '987 Birch Way, Springfield, IL 62706', 'Ken Nakamura', '(555) 678-9013', 'Humana', 'HUM-88745', 'Asthma (moderate persistent) with anxiety disorder', 'Erythromycin', 'active', 'low'],
    ];
    patients.forEach(p => db.prepare('INSERT INTO patients (id, mrn, first_name, last_name, date_of_birth, gender, blood_type, phone, email, address, emergency_contact, emergency_phone, insurance_provider, insurance_id, primary_diagnosis, allergies, status, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...p));

    // --- ENCOUNTERS ---
    const encounters = [
        [uuidv4(), 'pt-001', 'Emergency', '2025-12-15', 'Dr. Sarah Smith', 'Emergency', 'Hypoglycemic episode with confusion', 'Severe hypoglycemia secondary to insulin overdose', 'Patient found disoriented by family. BG 38 mg/dL. D50 administered IV. Recovered rapidly. Insulin dosing adjusted.', 'Discharged with follow-up'],
        [uuidv4(), 'pt-001', 'Outpatient', '2025-11-20', 'Dr. Raj Patel', 'Nephrology', 'Routine CKD follow-up', 'CKD Stage 3b, progression noted', 'eGFR declined from 38 to 28 over 6 months. Proteinuria increasing. Discussed dialysis planning.', 'Follow up 4 weeks'],
        [uuidv4(), 'pt-001', 'Emergency', '2025-10-05', 'Dr. Smith', 'Emergency', 'Chest pain and shortness of breath', 'Acute heart failure exacerbation', 'BNP elevated at 1250. CXR bilateral pleural effusions. IV furosemide started.', 'Admitted'],
        [uuidv4(), 'pt-001', 'Inpatient', '2025-08-12', 'Dr. Patel', 'Internal Medicine', 'Diabetic foot ulcer infection', 'Infected diabetic foot ulcer, left great toe', 'Wound culture positive for MRSA. IV vancomycin started.', 'Discharged day 5'],
        [uuidv4(), 'pt-001', 'Outpatient', '2025-06-01', 'Dr. Smith', 'Primary Care', 'Annual diabetes review', 'Uncontrolled T2DM, HbA1c 9.2%', 'HbA1c worsening. Added GLP-1 agonist. Retinopathy screening ordered.', 'Follow up 3 months'],
        [uuidv4(), 'pt-002', 'Outpatient', '2025-12-10', 'Dr. Patel', 'Cardiology', 'Follow-up for heart failure', 'Stable NYHA Class II heart failure', 'EF stable at 40%. Tolerating sacubitril-valsartan.', 'Continue current regimen'],
        [uuidv4(), 'pt-002', 'Emergency', '2025-09-18', 'Dr. Smith', 'Emergency', 'Palpitations and dizziness', 'Paroxysmal atrial fibrillation', 'HR 142 irregular. Cardioverted with IV amiodarone. Started apixaban.', 'Admitted for monitoring'],
        [uuidv4(), 'pt-002', 'Outpatient', '2025-07-05', 'Dr. Patel', 'Cardiology', 'New onset dyspnea on exertion', 'Heart failure with reduced EF', 'Echo: EF 38%. BNP 890. Started on ACEi, beta-blocker, diuretic.', 'Follow up 6 weeks'],
        [uuidv4(), 'pt-003', 'Emergency', '2025-12-20', 'Dr. Smith', 'Emergency', 'Acute shortness of breath and fever', 'Community-acquired pneumonia with COPD exacerbation', 'SpO2 84% on room air. CXR right lower lobe consolidation. BiPAP initiated.', 'Admitted to ICU'],
        [uuidv4(), 'pt-003', 'Inpatient', '2025-12-20', 'Dr. Patel', 'ICU', 'Respiratory failure', 'Acute respiratory failure, sepsis', 'Intubated for worsening respiratory failure. Blood cultures positive S. pneumoniae.', 'ICU day 4, extubated'],
        [uuidv4(), 'pt-003', 'Outpatient', '2025-10-01', 'Dr. Smith', 'Pulmonology', 'COPD management', 'COPD GOLD Stage III', 'FEV1 42% predicted. Frequent exacerbations. Added roflumilast.', 'Follow up 2 months'],
        [uuidv4(), 'pt-003', 'Outpatient', '2025-06-15', 'Dr. Patel', 'Cardiology', 'Post-CABG follow-up', 'Stable post-CABG, mild aortic stenosis', 'Stress test no ischemia. Echo: mild AS, EF 50%.', 'Annual follow-up'],
        [uuidv4(), 'pt-004', 'Outpatient', '2025-12-05', 'Dr. Smith', 'Rheumatology', 'Joint pain flare-up', 'SLE flare with polyarthritis', 'Swollen joints hands and knees. Anti-dsDNA elevated. Increased HCQ.', 'Follow up 2 weeks'],
        [uuidv4(), 'pt-004', 'Outpatient', '2025-09-10', 'Dr. Patel', 'Nephrology', 'Proteinuria evaluation', 'Class III lupus nephritis', 'Renal biopsy confirmed class III. Started mycophenolate mofetil.', 'Monthly labs'],
        [uuidv4(), 'pt-005', 'Emergency', '2025-12-18', 'Dr. Smith', 'Emergency', 'Hematemesis', 'Upper GI bleed, esophageal varices', 'Vomited ~500mL blood. Resuscitated. Urgent EGD: grade III varices banded.', 'Admitted to ICU'],
        [uuidv4(), 'pt-005', 'Outpatient', '2025-10-22', 'Dr. Smith', 'Hepatology', 'Cirrhosis management', 'NASH cirrhosis, Child-Pugh B', 'MELD score 18. Ascites requiring paracentesis. Listed for transplant eval.', 'Follow up monthly'],
        [uuidv4(), 'pt-006', 'Outpatient', '2025-11-30', 'Dr. Smith', 'Primary Care', 'Asthma control assessment', 'Moderate persistent asthma, well-controlled', 'ICS-LABA daily. Rescue <2x/week. Anxiety managed with sertraline.', 'Continue, annual review'],
        [uuidv4(), 'pt-006', 'Emergency', '2025-07-20', 'Dr. Smith', 'Emergency', 'Acute asthma exacerbation', 'Severe asthma exacerbation', 'SpO2 91%. Continuous nebulizer + IV steroids. Improved over 4 hours.', 'Discharged with plan'],
    ];
    encounters.forEach(e => db.prepare('INSERT INTO encounters (id, patient_id, encounter_type, date, provider, department, chief_complaint, diagnosis, notes, disposition) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...e));

    // --- LAB RESULTS ---
    const labs = [
        [uuidv4(), 'pt-001', 'HbA1c', '9.2', '%', '4.0-5.6', 'critical', '2025-12-15', 'Dr. Smith'],
        [uuidv4(), 'pt-001', 'Creatinine', '2.8', 'mg/dL', '0.7-1.3', 'high', '2025-12-15', 'Dr. Smith'],
        [uuidv4(), 'pt-001', 'eGFR', '28', 'mL/min', '>60', 'critical', '2025-12-15', 'Dr. Patel'],
        [uuidv4(), 'pt-001', 'BUN', '42', 'mg/dL', '7-20', 'high', '2025-12-15', 'Dr. Smith'],
        [uuidv4(), 'pt-001', 'Potassium', '5.4', 'mEq/L', '3.5-5.0', 'high', '2025-12-15', 'Dr. Smith'],
        [uuidv4(), 'pt-001', 'BNP', '1250', 'pg/mL', '<100', 'critical', '2025-10-05', 'Dr. Patel'],
        [uuidv4(), 'pt-001', 'Glucose (fasting)', '210', 'mg/dL', '70-100', 'high', '2025-12-15', 'Dr. Smith'],
        [uuidv4(), 'pt-001', 'Hemoglobin', '10.2', 'g/dL', '13.5-17.5', 'low', '2025-12-15', 'Dr. Smith'],
        [uuidv4(), 'pt-002', 'BNP', '340', 'pg/mL', '<100', 'high', '2025-12-10', 'Dr. Patel'],
        [uuidv4(), 'pt-002', 'Troponin I', '0.02', 'ng/mL', '<0.04', 'normal', '2025-09-18', 'Dr. Smith'],
        [uuidv4(), 'pt-002', 'INR', '2.1', '', '2.0-3.0', 'normal', '2025-12-10', 'Dr. Patel'],
        [uuidv4(), 'pt-002', 'Creatinine', '1.1', 'mg/dL', '0.6-1.1', 'normal', '2025-12-10', 'Dr. Patel'],
        [uuidv4(), 'pt-002', 'Potassium', '4.2', 'mEq/L', '3.5-5.0', 'normal', '2025-12-10', 'Dr. Patel'],
        [uuidv4(), 'pt-003', 'WBC', '18.5', 'K/uL', '4.5-11.0', 'critical', '2025-12-20', 'Dr. Smith'],
        [uuidv4(), 'pt-003', 'Lactate', '4.8', 'mmol/L', '0.5-2.0', 'critical', '2025-12-20', 'Dr. Smith'],
        [uuidv4(), 'pt-003', 'Procalcitonin', '8.2', 'ng/mL', '<0.1', 'critical', '2025-12-20', 'Dr. Smith'],
        [uuidv4(), 'pt-003', 'CRP', '185', 'mg/L', '<10', 'critical', '2025-12-20', 'Dr. Smith'],
        [uuidv4(), 'pt-003', 'SpO2', '84', '%', '95-100', 'critical', '2025-12-20', 'Dr. Smith'],
        [uuidv4(), 'pt-003', 'Blood Culture', 'S. pneumoniae', '', 'No growth', 'critical', '2025-12-21', 'Dr. Smith'],
        [uuidv4(), 'pt-004', 'Anti-dsDNA', '320', 'IU/mL', '<30', 'high', '2025-12-05', 'Dr. Smith'],
        [uuidv4(), 'pt-004', 'C3 Complement', '52', 'mg/dL', '90-180', 'low', '2025-12-05', 'Dr. Smith'],
        [uuidv4(), 'pt-004', 'C4 Complement', '8', 'mg/dL', '10-40', 'low', '2025-12-05', 'Dr. Smith'],
        [uuidv4(), 'pt-004', 'Urine Protein/Cr', '1.8', 'g/g', '<0.2', 'high', '2025-09-10', 'Dr. Patel'],
        [uuidv4(), 'pt-004', 'ESR', '68', 'mm/hr', '0-20', 'high', '2025-12-05', 'Dr. Smith'],
        [uuidv4(), 'pt-005', 'ALT', '78', 'U/L', '7-56', 'high', '2025-12-18', 'Dr. Smith'],
        [uuidv4(), 'pt-005', 'AST', '92', 'U/L', '10-40', 'high', '2025-12-18', 'Dr. Smith'],
        [uuidv4(), 'pt-005', 'Albumin', '2.6', 'g/dL', '3.5-5.0', 'low', '2025-12-18', 'Dr. Smith'],
        [uuidv4(), 'pt-005', 'INR', '1.8', '', '0.8-1.1', 'high', '2025-12-18', 'Dr. Smith'],
        [uuidv4(), 'pt-005', 'Platelet Count', '82', 'K/uL', '150-400', 'low', '2025-12-18', 'Dr. Smith'],
        [uuidv4(), 'pt-005', 'Hemoglobin', '8.1', 'g/dL', '13.5-17.5', 'critical', '2025-12-18', 'Dr. Smith'],
        [uuidv4(), 'pt-005', 'Total Bilirubin', '3.4', 'mg/dL', '0.1-1.2', 'high', '2025-12-18', 'Dr. Smith'],
        [uuidv4(), 'pt-006', 'IgE (Total)', '280', 'IU/mL', '<100', 'high', '2025-11-30', 'Dr. Smith'],
        [uuidv4(), 'pt-006', 'Eosinophils', '6.2', '%', '1-4', 'high', '2025-11-30', 'Dr. Smith'],
        [uuidv4(), 'pt-006', 'CBC', 'WNL', '', 'Normal', 'normal', '2025-11-30', 'Dr. Smith'],
    ];
    labs.forEach(l => db.prepare('INSERT INTO lab_results (id, patient_id, test_name, value, unit, reference_range, status, date, ordered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...l));

    // --- MEDICATIONS ---
    const meds = [
        [uuidv4(), 'pt-001', 'Metformin', '1000mg', 'Twice daily', 'oral', '2020-03-15', 'Dr. Smith', 'active', 'Monitor renal function - eGFR declining'],
        [uuidv4(), 'pt-001', 'Insulin Glargine', '32 units', 'Once daily at bedtime', 'subcutaneous', '2023-06-01', 'Dr. Smith', 'active', 'Reduce to 28u after hypo episode'],
        [uuidv4(), 'pt-001', 'Lisinopril', '20mg', 'Once daily', 'oral', '2021-01-10', 'Dr. Patel', 'active', 'Renoprotective. Monitor K+'],
        [uuidv4(), 'pt-001', 'Furosemide', '40mg', 'Once daily', 'oral', '2025-10-05', 'Dr. Patel', 'active', 'Added after HF exacerbation'],
        [uuidv4(), 'pt-001', 'Semaglutide', '0.5mg', 'Once weekly', 'subcutaneous', '2025-06-01', 'Dr. Smith', 'active', 'GLP-1 for diabetes + weight'],
        [uuidv4(), 'pt-001', 'Atorvastatin', '40mg', 'Once daily', 'oral', '2019-01-01', 'Dr. Smith', 'active', ''],
        [uuidv4(), 'pt-002', 'Sacubitril-Valsartan', '97/103mg', 'Twice daily', 'oral', '2025-07-05', 'Dr. Patel', 'active', ''],
        [uuidv4(), 'pt-002', 'Carvedilol', '25mg', 'Twice daily', 'oral', '2025-07-05', 'Dr. Patel', 'active', ''],
        [uuidv4(), 'pt-002', 'Apixaban', '5mg', 'Twice daily', 'oral', '2025-09-18', 'Dr. Smith', 'active', 'For AFib'],
        [uuidv4(), 'pt-002', 'Furosemide', '20mg', 'Once daily', 'oral', '2025-07-05', 'Dr. Patel', 'active', ''],
        [uuidv4(), 'pt-003', 'Tiotropium', '18mcg', 'Once daily', 'inhalation', '2023-01-01', 'Dr. Smith', 'active', ''],
        [uuidv4(), 'pt-003', 'Budesonide-Formoterol', '160/4.5mcg', 'Twice daily', 'inhalation', '2023-01-01', 'Dr. Smith', 'active', ''],
        [uuidv4(), 'pt-003', 'Roflumilast', '500mcg', 'Once daily', 'oral', '2025-10-01', 'Dr. Smith', 'active', 'Frequent exacerbations'],
        [uuidv4(), 'pt-003', 'Ceftriaxone', '2g', 'Once daily', 'IV', '2025-12-20', 'Dr. Smith', 'active', 'Pneumonia 7 day course'],
        [uuidv4(), 'pt-003', 'Aspirin', '81mg', 'Once daily', 'oral', '2020-06-01', 'Dr. Patel', 'active', 'Post-CABG'],
        [uuidv4(), 'pt-004', 'Hydroxychloroquine', '400mg', 'Once daily', 'oral', '2022-03-01', 'Dr. Smith', 'active', 'Baseline eye exam done'],
        [uuidv4(), 'pt-004', 'Mycophenolate Mofetil', '1000mg', 'Twice daily', 'oral', '2025-09-10', 'Dr. Patel', 'active', 'For lupus nephritis'],
        [uuidv4(), 'pt-004', 'Prednisone', '20mg', 'Once daily (taper)', 'oral', '2025-12-05', 'Dr. Smith', 'active', 'Taper by 5mg/week'],
        [uuidv4(), 'pt-005', 'Propranolol', '40mg', 'Twice daily', 'oral', '2025-10-22', 'Dr. Smith', 'active', 'Variceal prophylaxis'],
        [uuidv4(), 'pt-005', 'Lactulose', '30mL', 'Three times daily', 'oral', '2025-10-22', 'Dr. Smith', 'active', 'Titrate to 3 BM/day'],
        [uuidv4(), 'pt-005', 'Spironolactone', '100mg', 'Once daily', 'oral', '2025-10-22', 'Dr. Smith', 'active', 'For ascites'],
        [uuidv4(), 'pt-005', 'Rifaximin', '550mg', 'Twice daily', 'oral', '2025-10-22', 'Dr. Smith', 'active', 'HE prophylaxis'],
        [uuidv4(), 'pt-006', 'Fluticasone-Salmeterol', '250/50mcg', 'Twice daily', 'inhalation', '2024-01-01', 'Dr. Smith', 'active', ''],
        [uuidv4(), 'pt-006', 'Albuterol', '90mcg', 'As needed', 'inhalation', '2024-01-01', 'Dr. Smith', 'active', 'Rescue inhaler'],
        [uuidv4(), 'pt-006', 'Sertraline', '100mg', 'Once daily', 'oral', '2024-06-01', 'Dr. Smith', 'active', 'Generalized anxiety'],
    ];
    meds.forEach(m => db.prepare('INSERT INTO medications (id, patient_id, name, dosage, frequency, route, start_date, prescriber, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...m));

    // --- VITALS ---
    const vitals = [
        [uuidv4(), 'pt-001', '2025-12-15', 92, 158, 94, 98.6, 18, 96, 220],
        [uuidv4(), 'pt-001', '2025-11-20', 88, 152, 90, 98.4, 16, 97, 218],
        [uuidv4(), 'pt-001', '2025-10-05', 110, 168, 100, 98.8, 24, 92, 225],
        [uuidv4(), 'pt-001', '2025-08-12', 96, 145, 88, 101.2, 20, 95, 222],
        [uuidv4(), 'pt-001', '2025-06-01', 82, 142, 86, 98.6, 16, 97, 215],
        [uuidv4(), 'pt-002', '2025-12-10', 72, 128, 78, 98.4, 16, 98, 165],
        [uuidv4(), 'pt-002', '2025-09-18', 142, 105, 68, 98.6, 20, 96, 162],
        [uuidv4(), 'pt-002', '2025-07-05', 88, 148, 92, 98.4, 18, 97, 168],
        [uuidv4(), 'pt-003', '2025-12-20', 118, 90, 55, 103.2, 32, 84, 155],
        [uuidv4(), 'pt-003', '2025-12-21', 105, 95, 60, 101.8, 28, 88, 155],
        [uuidv4(), 'pt-003', '2025-10-01', 85, 135, 82, 98.6, 20, 92, 158],
        [uuidv4(), 'pt-003', '2025-06-15', 78, 130, 78, 98.4, 18, 94, 160],
        [uuidv4(), 'pt-004', '2025-12-05', 82, 118, 72, 99.1, 16, 98, 140],
        [uuidv4(), 'pt-004', '2025-09-10', 78, 122, 76, 98.6, 16, 99, 142],
        [uuidv4(), 'pt-005', '2025-12-18', 118, 88, 52, 98.2, 22, 95, 185],
        [uuidv4(), 'pt-005', '2025-10-22', 78, 110, 68, 98.4, 16, 97, 190],
        [uuidv4(), 'pt-006', '2025-11-30', 72, 115, 72, 98.4, 14, 99, 132],
        [uuidv4(), 'pt-006', '2025-07-20', 102, 128, 80, 98.6, 26, 91, 130],
    ];
    vitals.forEach(v => db.prepare('INSERT INTO vitals (id, patient_id, date, heart_rate, systolic_bp, diastolic_bp, temperature, respiratory_rate, oxygen_saturation, weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...v));

    console.log(`✅ Seeded: ${users.length} users, ${patients.length} patients, ${encounters.length} encounters, ${labs.length} labs, ${meds.length} medications, ${vitals.length} vitals`);
}

module.exports = { seedDatabase };
