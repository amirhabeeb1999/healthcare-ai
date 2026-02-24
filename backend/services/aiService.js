/**
 * Mock AI Service
 * Generates realistic clinical AI outputs based on patient data analysis.
 * In production, these would call actual LLM/ML model APIs.
 */

class AIService {
    // Generate clinical summary from patient data
    static generateSummary(patient, encounters, labs, medications, vitals) {
        const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
        const recentEncounters = encounters.slice(0, 5);
        const activeMeds = medications.filter(m => m.status === 'active');
        const criticalLabs = labs.filter(l => l.status === 'critical' || l.status === 'high');
        const latestVitals = vitals[0];

        let summary = `**Clinical Summary — ${patient.first_name} ${patient.last_name}**\n\n`;
        summary += `${age}-year-old ${patient.gender.toLowerCase()} with primary diagnosis of ${patient.primary_diagnosis}. `;

        // Allergies
        if (patient.allergies && patient.allergies !== 'None known') {
            summary += `Known allergies: ${patient.allergies}. `;
        }

        // Recent encounters summary
        const erVisits = encounters.filter(e => e.encounter_type === 'Emergency');
        const admissions = encounters.filter(e => e.encounter_type === 'Inpatient');
        if (erVisits.length > 0 || admissions.length > 0) {
            summary += `\n\n**Recent Healthcare Utilization:** `;
            summary += `${erVisits.length} ER visit(s) and ${admissions.length} admission(s) in medical record. `;
        }

        // Most recent encounter
        if (recentEncounters.length > 0) {
            const latest = recentEncounters[0];
            summary += `\n\nMost recent encounter (${latest.date}): ${latest.encounter_type} — ${latest.chief_complaint}. `;
            summary += `Diagnosis: ${latest.diagnosis}. ${latest.notes} `;
        }

        // Critical labs
        if (criticalLabs.length > 0) {
            summary += `\n\n**Critical/Abnormal Labs:** `;
            criticalLabs.slice(0, 5).forEach(lab => {
                summary += `\n• ${lab.test_name}: ${lab.value} ${lab.unit} (ref: ${lab.reference_range}) — ${lab.status.toUpperCase()}`;
            });
        }

        // Active medications
        summary += `\n\n**Active Medications (${activeMeds.length}):** `;
        activeMeds.forEach(med => {
            summary += `\n• ${med.name} ${med.dosage} ${med.frequency}`;
        });

        // Vitals trend
        if (latestVitals) {
            summary += `\n\n**Latest Vitals (${latestVitals.date}):** `;
            summary += `HR ${latestVitals.heart_rate}, BP ${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}, `;
            summary += `Temp ${latestVitals.temperature}°F, RR ${latestVitals.respiratory_rate}, SpO2 ${latestVitals.oxygen_saturation}%`;
        }

        // Key concerns
        summary += `\n\n**Key Concerns:**`;
        const concerns = this._identifyConcerns(patient, encounters, labs, medications, vitals);
        concerns.forEach(c => {
            summary += `\n⚠️ ${c}`;
        });

        return {
            summary,
            confidence: 0.87 + Math.random() * 0.1,
            generated_at: new Date().toISOString(),
            key_findings: concerns.length,
            data_points_analyzed: encounters.length + labs.length + medications.length + vitals.length
        };
    }

    // Risk prediction
    static predictRisks(patient, encounters, labs, vitals) {
        const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
        const latestVitals = vitals[0] || {};
        const criticalLabs = labs.filter(l => l.status === 'critical');
        const erVisits = encounters.filter(e => e.encounter_type === 'Emergency');

        // Sepsis risk calculation
        let sepsisScore = 10;
        if (latestVitals.heart_rate > 90) sepsisScore += 15;
        if (latestVitals.heart_rate > 110) sepsisScore += 20;
        if (latestVitals.temperature > 100.4 || latestVitals.temperature < 96.8) sepsisScore += 20;
        if (latestVitals.respiratory_rate > 20) sepsisScore += 15;
        if (latestVitals.systolic_bp < 100) sepsisScore += 20;
        if (latestVitals.oxygen_saturation < 92) sepsisScore += 15;
        const hasInfectionMarker = labs.some(l => (l.test_name === 'WBC' && parseFloat(l.value) > 12) || l.test_name === 'Lactate' || l.test_name === 'Procalcitonin');
        if (hasInfectionMarker) sepsisScore += 20;
        if (age > 65) sepsisScore += 10;
        sepsisScore = Math.min(sepsisScore, 98);

        // Readmission risk
        let readmissionScore = 15;
        readmissionScore += erVisits.length * 12;
        if (age > 65) readmissionScore += 10;
        if (criticalLabs.length > 2) readmissionScore += 15;
        const activeMedCount = labs.length; // proxy
        if (activeMedCount > 5) readmissionScore += 10;
        if (patient.risk_level === 'high') readmissionScore += 15;
        if (patient.risk_level === 'critical') readmissionScore += 25;
        readmissionScore = Math.min(readmissionScore, 95);

        // ICU probability
        let icuScore = 5;
        if (sepsisScore > 50) icuScore += 25;
        if (latestVitals.oxygen_saturation < 90) icuScore += 30;
        if (latestVitals.systolic_bp < 90) icuScore += 25;
        if (criticalLabs.length > 3) icuScore += 15;
        if (patient.risk_level === 'critical') icuScore += 20;
        icuScore = Math.min(icuScore, 95);

        // Length of stay estimate
        let losEstimate = 3;
        if (sepsisScore > 60) losEstimate += 4;
        if (readmissionScore > 50) losEstimate += 2;
        if (age > 75) losEstimate += 2;

        const getRiskLevel = (score) => {
            if (score >= 70) return 'critical';
            if (score >= 50) return 'high';
            if (score >= 30) return 'medium';
            return 'low';
        };

        const getFactors = (type) => {
            const factors = [];
            if (type === 'sepsis') {
                if (latestVitals.heart_rate > 100) factors.push({ factor: 'Tachycardia', detail: `HR ${latestVitals.heart_rate} bpm`, impact: 'high' });
                if (latestVitals.temperature > 100.4) factors.push({ factor: 'Fever', detail: `Temp ${latestVitals.temperature}°F`, impact: 'high' });
                if (latestVitals.systolic_bp < 100) factors.push({ factor: 'Hypotension', detail: `BP ${latestVitals.systolic_bp}/${latestVitals.diastolic_bp}`, impact: 'critical' });
                if (hasInfectionMarker) factors.push({ factor: 'Infection markers elevated', detail: 'WBC/Lactate/Procalcitonin abnormal', impact: 'high' });
                if (latestVitals.oxygen_saturation < 92) factors.push({ factor: 'Hypoxemia', detail: `SpO2 ${latestVitals.oxygen_saturation}%`, impact: 'high' });
                if (age > 65) factors.push({ factor: 'Advanced age', detail: `${age} years old`, impact: 'medium' });
            }
            if (type === 'readmission') {
                if (erVisits.length > 1) factors.push({ factor: 'Frequent ER visits', detail: `${erVisits.length} visits`, impact: 'high' });
                if (criticalLabs.length > 0) factors.push({ factor: 'Critical lab values', detail: `${criticalLabs.length} critical results`, impact: 'high' });
                if (patient.risk_level === 'high' || patient.risk_level === 'critical') factors.push({ factor: 'High-risk classification', detail: patient.primary_diagnosis, impact: 'high' });
            }
            return factors;
        };

        return {
            sepsis: {
                score: sepsisScore,
                level: getRiskLevel(sepsisScore),
                label: 'Sepsis Risk',
                factors: getFactors('sepsis'),
                recommendation: sepsisScore > 50 ? 'Immediate sepsis workup recommended. Consider blood cultures, lactate, and broad-spectrum antibiotics.' : 'Continue monitoring. No immediate sepsis concern.'
            },
            readmission: {
                score: readmissionScore,
                level: getRiskLevel(readmissionScore),
                label: '30-Day Readmission',
                factors: getFactors('readmission'),
                recommendation: readmissionScore > 50 ? 'High readmission risk. Ensure comprehensive discharge planning, follow-up within 7 days, and medication reconciliation.' : 'Standard discharge planning appropriate.'
            },
            icu: {
                score: icuScore,
                level: getRiskLevel(icuScore),
                label: 'ICU Probability',
                factors: [],
                recommendation: icuScore > 40 ? 'Consider ICU-level monitoring. Alert rapid response team.' : 'Floor-level care appropriate.'
            },
            length_of_stay: {
                estimated_days: losEstimate,
                range: `${Math.max(1, losEstimate - 2)}-${losEstimate + 3} days`
            },
            overall_acuity: getRiskLevel(Math.max(sepsisScore, readmissionScore, icuScore)),
            generated_at: new Date().toISOString()
        };
    }

    // Medication safety check
    static checkMedications(patient, medications, labs) {
        const warnings = [];
        const activeMeds = medications.filter(m => m.status === 'active');

        // Check each medication
        activeMeds.forEach(med => {
            const medName = med.name.toLowerCase();

            // Metformin + renal impairment
            if (medName.includes('metformin')) {
                const egfr = labs.find(l => l.test_name === 'eGFR');
                if (egfr && parseFloat(egfr.value) < 30) {
                    warnings.push({
                        severity: 'critical',
                        type: 'contraindication',
                        medication: med.name,
                        message: `CONTRAINDICATED: ${med.name} with eGFR ${egfr.value} mL/min (< 30). High risk of lactic acidosis. Discontinue immediately.`,
                        recommendation: 'Switch to insulin or DPP-4 inhibitor adjusted for renal function.',
                        evidence: 'FDA Black Box Warning; KDIGO Guidelines 2024'
                    });
                }
            }

            // NSAIDs + renal disease
            if (medName.includes('ibuprofen') || medName.includes('naproxen') || medName.includes('nsaid')) {
                const creat = labs.find(l => l.test_name === 'Creatinine');
                if (creat && parseFloat(creat.value) > 1.5) {
                    warnings.push({
                        severity: 'high',
                        type: 'contraindication',
                        medication: med.name,
                        message: `AVOID: ${med.name} with elevated creatinine (${creat.value} mg/dL). Risk of acute kidney injury.`,
                        recommendation: 'Use acetaminophen for pain management.',
                        evidence: 'AKI Prevention Guidelines'
                    });
                }
            }

            // Insulin + hypoglycemia history
            if (medName.includes('insulin')) {
                const glucose = labs.find(l => l.test_name.toLowerCase().includes('glucose'));
                if (glucose && parseFloat(glucose.value) > 200) {
                    warnings.push({
                        severity: 'medium',
                        type: 'dose_adjustment',
                        medication: med.name,
                        message: `Glucose remains elevated (${glucose.value} mg/dL) despite ${med.name} ${med.dosage}. Consider dose adjustment.`,
                        recommendation: 'Review insulin regimen. Consider endocrinology consultation.',
                        evidence: 'ADA Standards of Care 2025'
                    });
                }
            }

            // ACEi/ARB + high potassium
            if (medName.includes('lisinopril') || medName.includes('valsartan') || medName.includes('enalapril')) {
                const potassium = labs.find(l => l.test_name === 'Potassium');
                if (potassium && parseFloat(potassium.value) > 5.2) {
                    warnings.push({
                        severity: 'high',
                        type: 'monitoring',
                        medication: med.name,
                        message: `Hyperkalemia risk: K+ ${potassium.value} mEq/L with ${med.name}. Monitor closely.`,
                        recommendation: 'Consider dose reduction. Check potassium in 48-72 hours. Consider potassium binder if persistent.',
                        evidence: 'ACC/AHA Heart Failure Guidelines'
                    });
                }
            }

            // Allergy check
            if (patient.allergies) {
                const allergies = patient.allergies.toLowerCase();
                if (allergies.includes(medName) || (allergies.includes('sulfa') && medName.includes('sulfamethoxazole'))) {
                    warnings.push({
                        severity: 'critical',
                        type: 'allergy',
                        medication: med.name,
                        message: `ALLERGY ALERT: Patient has documented allergy to ${patient.allergies}. ${med.name} may cross-react.`,
                        recommendation: 'Verify allergy history. Use alternative medication.',
                        evidence: 'Patient allergy record'
                    });
                }
            }
        });

        // Drug interactions
        const medNames = activeMeds.map(m => m.name.toLowerCase());
        if (medNames.some(m => m.includes('apixaban')) && medNames.some(m => m.includes('aspirin'))) {
            warnings.push({
                severity: 'medium',
                type: 'interaction',
                medication: 'Apixaban + Aspirin',
                message: 'Dual antithrombotic therapy increases bleeding risk. Verify clinical indication.',
                recommendation: 'Assess bleeding risk vs thromboembolic benefit. Consider discontinuing aspirin if not indicated.',
                evidence: 'AUGUSTUS Trial'
            });
        }

        if (medNames.some(m => m.includes('spironolactone')) && medNames.some(m => m.includes('lisinopril') || m.includes('valsartan'))) {
            const potassium = labs.find(l => l.test_name === 'Potassium');
            warnings.push({
                severity: 'high',
                type: 'interaction',
                medication: 'Spironolactone + ACEi/ARB',
                message: `Combined use increases hyperkalemia risk. ${potassium ? `Current K+: ${potassium.value}` : 'Monitor potassium closely.'}`,
                recommendation: 'Monitor potassium every 1-2 weeks initially. Dietary potassium restriction.',
                evidence: 'RALES Trial Safety Data'
            });
        }

        return {
            warnings: warnings.sort((a, b) => {
                const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            }),
            total_medications: activeMeds.length,
            warnings_count: warnings.length,
            critical_count: warnings.filter(w => w.severity === 'critical').length,
            generated_at: new Date().toISOString()
        };
    }

    // Treatment suggestions
    static suggestTreatments(patient, encounters, labs, medications) {
        const suggestions = [];
        const diagnosis = patient.primary_diagnosis.toLowerCase();
        const activeMeds = medications.filter(m => m.status === 'active');
        const medNames = activeMeds.map(m => m.name.toLowerCase());

        if (diagnosis.includes('diabetes')) {
            const hba1c = labs.find(l => l.test_name === 'HbA1c');
            if (hba1c && parseFloat(hba1c.value) > 8) {
                suggestions.push({
                    category: 'Glycemic Management',
                    recommendation: 'Intensify diabetes management due to HbA1c > 8%',
                    details: `Current HbA1c: ${hba1c.value}%. Target: < 7% (individualized). Consider adding/optimizing GLP-1 RA or SGLT2 inhibitor.`,
                    confidence: 0.92,
                    evidence: 'ADA Standards of Medical Care in Diabetes — 2025',
                    priority: 'high',
                    actions: ['Review current insulin regimen', 'Consider GLP-1 RA if not on one', 'Endocrinology referral if HbA1c > 9%', 'Continuous glucose monitoring evaluation']
                });
            }
        }

        if (diagnosis.includes('kidney') || diagnosis.includes('ckd')) {
            const egfr = labs.find(l => l.test_name === 'eGFR');
            suggestions.push({
                category: 'Renal Protection',
                recommendation: 'Optimize renoprotective therapy',
                details: `${egfr ? `eGFR: ${egfr.value} mL/min. ` : ''}Consider SGLT2 inhibitor for renal protection. Avoid nephrotoxic agents.`,
                confidence: 0.88,
                evidence: 'KDIGO CKD Guidelines 2024; CREDENCE Trial',
                priority: 'high',
                actions: ['Add SGLT2 inhibitor (dapagliflozin/empagliflozin)', 'Nephrology follow-up in 4 weeks', 'Dietary protein restriction counseling', 'Dialysis access planning if eGFR < 20']
            });
        }

        if (diagnosis.includes('heart failure') || diagnosis.includes('hf')) {
            suggestions.push({
                category: 'Heart Failure Management',
                recommendation: 'Ensure guideline-directed medical therapy (GDMT)',
                details: 'Verify patient is on all four pillars: ACEi/ARB/ARNI, beta-blocker, MRA, and SGLT2i.',
                confidence: 0.91,
                evidence: 'AHA/ACC/HFSA Heart Failure Guidelines 2023',
                priority: 'high',
                actions: ['Confirm ARNI titration to target dose', 'Add SGLT2 inhibitor if not present', 'Cardiac rehab referral', 'Remote monitoring enrollment']
            });
        }

        if (diagnosis.includes('copd')) {
            suggestions.push({
                category: 'COPD Management',
                recommendation: 'Step-up therapy for frequent exacerbations',
                details: 'Consider adding PDE4 inhibitor or long-term azithromycin for exacerbation prevention.',
                confidence: 0.85,
                evidence: 'GOLD 2025 COPD Guidelines',
                priority: 'medium',
                actions: ['Pulmonary rehabilitation', 'Annual influenza and pneumococcal vaccination', 'Home oxygen assessment', 'Smoking cessation review']
            });
        }

        if (diagnosis.includes('lupus') || diagnosis.includes('sle')) {
            suggestions.push({
                category: 'SLE Management',
                recommendation: 'Monitor for renal involvement progression',
                details: 'Continue immunosuppression. Monitor proteinuria and complement levels. Consider belimumab if recurrent flares.',
                confidence: 0.84,
                evidence: 'EULAR/ERA-EDTA Lupus Nephritis Guidelines 2024',
                priority: 'high',
                actions: ['Monthly urine protein monitoring', 'Quarterly complement levels', 'Ophthalmology screening for HCQ', 'Bone density screening on steroids']
            });
        }

        if (diagnosis.includes('cirrhosis') || diagnosis.includes('liver')) {
            suggestions.push({
                category: 'Liver Disease Management',
                recommendation: 'Variceal surveillance and transplant evaluation',
                details: 'Continue non-selective beta-blocker. Regular EGD screening. Avoid hepatotoxic drugs.',
                confidence: 0.89,
                evidence: 'AASLD Practice Guidelines for Cirrhosis 2024',
                priority: 'critical',
                actions: ['Liver transplant evaluation (MELD-based)', 'EGD every 6 months for varices', 'HCC screening with US + AFP every 6 months', 'Avoid all NSAIDs and acetaminophen > 2g/day']
            });
        }

        // Generic preventive care
        const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
        if (age >= 50) {
            suggestions.push({
                category: 'Preventive Care',
                recommendation: 'Age-appropriate screening',
                details: 'Ensure up-to-date cancer screening, cardiovascular risk assessment, and vaccination schedule.',
                confidence: 0.95,
                evidence: 'USPSTF Screening Recommendations 2025',
                priority: 'low',
                actions: ['Colorectal cancer screening', 'Lipid panel if not recent', 'Flu + COVID + pneumonia vaccines', 'Fall risk assessment if > 65']
            });
        }

        return {
            suggestions: suggestions.sort((a, b) => {
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }),
            total_suggestions: suggestions.length,
            generated_at: new Date().toISOString()
        };
    }

    // Chat with patient chart
    static chatResponse(question, patient, encounters, labs, medications, vitals) {
        const q = question.toLowerCase();
        const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();

        if (q.includes('summary') || q.includes('overview') || q.includes('who is')) {
            return `${patient.first_name} ${patient.last_name} is a ${age}-year-old ${patient.gender.toLowerCase()} with ${patient.primary_diagnosis}. They have ${encounters.length} encounters on record, ${medications.filter(m => m.status === 'active').length} active medications, and ${labs.filter(l => l.status === 'critical').length} critical lab values. Known allergies: ${patient.allergies || 'None'}.`;
        }

        if (q.includes('risk') || q.includes('danger') || q.includes('concern') || q.includes('worry')) {
            const concerns = this._identifyConcerns(patient, encounters, labs, medications, vitals);
            return `Key concerns for ${patient.first_name}:\n\n${concerns.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nI recommend reviewing the Risk Prediction panel for quantitative risk scores.`;
        }

        if (q.includes('medication') || q.includes('drug') || q.includes('prescription') || q.includes('med')) {
            const activeMeds = medications.filter(m => m.status === 'active');
            return `${patient.first_name} is currently on ${activeMeds.length} active medications:\n\n${activeMeds.map(m => `• ${m.name} ${m.dosage} — ${m.frequency}`).join('\n')}\n\nCheck the Medication Safety panel for interaction warnings.`;
        }

        if (q.includes('lab') || q.includes('test') || q.includes('result')) {
            const recentLabs = labs.slice(0, 8);
            return `Recent lab results for ${patient.first_name}:\n\n${recentLabs.map(l => `• ${l.test_name}: ${l.value} ${l.unit} (${l.status.toUpperCase()}) — ${l.date}`).join('\n')}`;
        }

        if (q.includes('vital') || q.includes('blood pressure') || q.includes('heart rate') || q.includes('temperature')) {
            const latestV = vitals[0];
            if (latestV) {
                return `Latest vitals for ${patient.first_name} (${latestV.date}):\n\n• Heart Rate: ${latestV.heart_rate} bpm\n• Blood Pressure: ${latestV.systolic_bp}/${latestV.diastolic_bp} mmHg\n• Temperature: ${latestV.temperature}°F\n• Respiratory Rate: ${latestV.respiratory_rate}/min\n• SpO2: ${latestV.oxygen_saturation}%\n• Weight: ${latestV.weight} lbs`;
            }
            return 'No vital signs recorded for this patient.';
        }

        if (q.includes('history') || q.includes('encounter') || q.includes('visit')) {
            const recentEnc = encounters.slice(0, 5);
            return `Recent encounters for ${patient.first_name}:\n\n${recentEnc.map(e => `• ${e.date} — ${e.encounter_type}: ${e.chief_complaint}\n  Dx: ${e.diagnosis}`).join('\n\n')}`;
        }

        if (q.includes('allerg')) {
            return `Documented allergies for ${patient.first_name}: ${patient.allergies || 'None known'}.\n\nAlways verify allergy status before prescribing new medications.`;
        }

        if (q.includes('treatment') || q.includes('recommend') || q.includes('what should') || q.includes('next step')) {
            return `Based on ${patient.first_name}'s current condition (${patient.primary_diagnosis}), I recommend reviewing the Treatment Suggestions panel for evidence-based recommendations. Key areas to address:\n\n1. Optimize current medication regimen\n2. Follow up on critical lab values\n3. Schedule appropriate preventive screenings\n\nPlease click the "Treatment" tab for detailed, guideline-based suggestions.`;
        }

        // Default
        return `I can help you understand ${patient.first_name}'s clinical data. Try asking about:\n\n• "What are the key risks?"\n• "Show me recent labs"\n• "What medications is the patient on?"\n• "Give me a summary"\n• "What vitals were last recorded?"\n• "Show encounter history"\n• "What are the treatment recommendations?"`;
    }

    // Internal helper
    static _identifyConcerns(patient, encounters, labs, medications, vitals) {
        const concerns = [];
        const latestVitals = vitals[0] || {};
        const criticalLabs = labs.filter(l => l.status === 'critical');
        const erVisits = encounters.filter(e => e.encounter_type === 'Emergency');
        const activeMeds = medications.filter(m => m.status === 'active');

        if (criticalLabs.length > 0) {
            concerns.push(`${criticalLabs.length} critical lab value(s): ${criticalLabs.slice(0, 3).map(l => `${l.test_name} ${l.value}`).join(', ')}`);
        }
        if (erVisits.length >= 2) {
            concerns.push(`${erVisits.length} ER visits indicate frequent acute care utilization`);
        }
        if (latestVitals.oxygen_saturation && latestVitals.oxygen_saturation < 92) {
            concerns.push(`Hypoxemia (SpO2 ${latestVitals.oxygen_saturation}%) — may require supplemental oxygen`);
        }
        if (latestVitals.systolic_bp && latestVitals.systolic_bp > 160) {
            concerns.push(`Uncontrolled hypertension (BP ${latestVitals.systolic_bp}/${latestVitals.diastolic_bp})`);
        }
        if (latestVitals.heart_rate && latestVitals.heart_rate > 100) {
            concerns.push(`Tachycardia (HR ${latestVitals.heart_rate}) — evaluate underlying cause`);
        }
        if (activeMeds.length > 5) {
            concerns.push(`Polypharmacy (${activeMeds.length} active medications) — review for deprescribing opportunities`);
        }

        // Metformin + CKD check
        const onMetformin = activeMeds.some(m => m.name.toLowerCase().includes('metformin'));
        const egfr = labs.find(l => l.test_name === 'eGFR');
        if (onMetformin && egfr && parseFloat(egfr.value) < 30) {
            concerns.push(`Metformin contraindicated with eGFR ${egfr.value} — URGENT: discontinue`);
        }

        if (concerns.length === 0) {
            concerns.push('No critical concerns identified at this time. Continue routine monitoring.');
        }

        return concerns;
    }
}

module.exports = AIService;
