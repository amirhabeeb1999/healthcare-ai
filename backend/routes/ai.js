const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const AIService = require('../services/aiService');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
        }
        next();
    };
}

function getPatientData(db, patientId) {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return null;

    const encounters = db.prepare('SELECT * FROM encounters WHERE patient_id = ? ORDER BY date DESC').all(patientId);
    const labs = db.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY date DESC').all(patientId);
    const medications = db.prepare('SELECT * FROM medications WHERE patient_id = ?').all(patientId);
    const vitals = db.prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY date DESC').all(patientId);

    return { patient, encounters, labs, medications, vitals };
}

function validatePatientId(id) {
    return typeof id === 'string' && /^[\w-]+$/.test(id) && id.length <= 100;
}

// AI Summary
router.post('/summarize/:patientId', authenticate, requireRole('doctor', 'admin'), (req, res) => {
    try {
        if (!validatePatientId(req.params.patientId)) return res.status(400).json({ error: 'Invalid patient ID' });
        const data = getPatientData(req.db, req.params.patientId);
        if (!data) return res.status(404).json({ error: 'Patient not found' });

        const result = AIService.generateSummary(data.patient, data.encounters, data.labs, data.medications, data.vitals);

        // Store summary
        req.db.prepare('INSERT INTO ai_summaries (id, patient_id, summary_type, content, confidence, generated_by) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.params.patientId, 'clinical_summary', result.summary, result.confidence, 'mock-ai-v1');

        // Audit
        req.db.prepare('INSERT INTO audit_log (user_id, action, resource, resource_id) VALUES (?, ?, ?, ?)')
            .run(req.user.id, 'AI_SUMMARIZE', 'patients', req.params.patientId);

        res.json(result);
    } catch (err) {
        console.error('[AI SUMMARY ERROR]', err.message);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

// Risk Predictions
router.get('/risks/:patientId', authenticate, requireRole('doctor', 'admin'), (req, res) => {
    try {
        if (!validatePatientId(req.params.patientId)) return res.status(400).json({ error: 'Invalid patient ID' });
        const data = getPatientData(req.db, req.params.patientId);
        if (!data) return res.status(404).json({ error: 'Patient not found' });

        const result = AIService.predictRisks(data.patient, data.encounters, data.labs, data.vitals);

        req.db.prepare('INSERT INTO audit_log (user_id, action, resource, resource_id) VALUES (?, ?, ?, ?)')
            .run(req.user.id, 'AI_RISK_PREDICTION', 'patients', req.params.patientId);

        res.json(result);
    } catch (err) {
        console.error('[AI RISKS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to predict risks' });
    }
});

// Medication Safety
router.get('/medications/:patientId', authenticate, requireRole('doctor', 'admin'), (req, res) => {
    try {
        if (!validatePatientId(req.params.patientId)) return res.status(400).json({ error: 'Invalid patient ID' });
        const data = getPatientData(req.db, req.params.patientId);
        if (!data) return res.status(404).json({ error: 'Patient not found' });

        const result = AIService.checkMedications(data.patient, data.medications, data.labs);

        req.db.prepare('INSERT INTO audit_log (user_id, action, resource, resource_id) VALUES (?, ?, ?, ?)')
            .run(req.user.id, 'AI_MED_CHECK', 'patients', req.params.patientId);

        res.json(result);
    } catch (err) {
        console.error('[AI MEDS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to check medications' });
    }
});

// Treatment Suggestions
router.get('/treatment/:patientId', authenticate, requireRole('doctor', 'admin'), (req, res) => {
    try {
        if (!validatePatientId(req.params.patientId)) return res.status(400).json({ error: 'Invalid patient ID' });
        const data = getPatientData(req.db, req.params.patientId);
        if (!data) return res.status(404).json({ error: 'Patient not found' });

        const result = AIService.suggestTreatments(data.patient, data.encounters, data.labs, data.medications);

        req.db.prepare('INSERT INTO audit_log (user_id, action, resource, resource_id) VALUES (?, ?, ?, ?)')
            .run(req.user.id, 'AI_TREATMENT', 'patients', req.params.patientId);

        res.json(result);
    } catch (err) {
        console.error('[AI TREATMENT ERROR]', err.message);
        res.status(500).json({ error: 'Failed to suggest treatments' });
    }
});

// Chat with patient chart
router.post('/chat', authenticate, requireRole('doctor', 'admin'), (req, res) => {
    try {
        const { patientId, question } = req.body;
        if (!patientId || !question) return res.status(400).json({ error: 'patientId and question required' });
        if (!validatePatientId(patientId)) return res.status(400).json({ error: 'Invalid patient ID' });
        if (typeof question !== 'string' || question.length > 2000) {
            return res.status(400).json({ error: 'Question must be a string under 2000 characters' });
        }

        const data = getPatientData(req.db, patientId);
        if (!data) return res.status(404).json({ error: 'Patient not found' });

        const response = AIService.chatResponse(question, data.patient, data.encounters, data.labs, data.medications, data.vitals);

        req.db.prepare('INSERT INTO audit_log (user_id, action, resource, resource_id, details) VALUES (?, ?, ?, ?, ?)')
            .run(req.user.id, 'AI_CHAT', 'patients', patientId, question.substring(0, 200));

        res.json({
            response,
            patient_id: patientId,
            generated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('[AI CHAT ERROR]', err.message);
        res.status(500).json({ error: 'Failed to process chat' });
    }
});

module.exports = router;
