const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Auth middleware
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

// List all patients
router.get('/', authenticate, (req, res) => {
    try {
        const { search, risk_level, status } = req.query;
        let query = 'SELECT * FROM patients WHERE 1=1';
        const params = [];

        if (search) {
            if (typeof search !== 'string' || search.length > 200) {
                return res.status(400).json({ error: 'Invalid search query' });
            }
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR mrn LIKE ? OR primary_diagnosis LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        if (risk_level) {
            const validRisks = ['critical', 'high', 'medium', 'low'];
            if (!validRisks.includes(risk_level)) {
                return res.status(400).json({ error: 'Invalid risk level' });
            }
            query += ' AND risk_level = ?';
            params.push(risk_level);
        }
        if (status) {
            const validStatuses = ['active', 'inactive', 'discharged'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY risk_level DESC, last_name ASC';
        const patients = req.db.prepare(query).all(...params);

        // Add counts
        const enriched = patients.map(p => {
            const encounterCount = req.db.prepare('SELECT COUNT(*) as count FROM encounters WHERE patient_id = ?').get(p.id).count;
            const activeRxCount = req.db.prepare("SELECT COUNT(*) as count FROM medications WHERE patient_id = ? AND status = 'active'").get(p.id).count;
            const criticalLabCount = req.db.prepare("SELECT COUNT(*) as count FROM lab_results WHERE patient_id = ? AND status IN ('critical', 'high')").get(p.id).count;
            return { ...p, encounter_count: encounterCount, active_medications: activeRxCount, critical_labs: criticalLabCount };
        });

        res.json(enriched);
    } catch (err) {
        console.error('[PATIENTS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to load patients' });
    }
});

// Get single patient with all data
router.get('/:id', authenticate, (req, res) => {
    try {
        if (!/^[\w-]+$/.test(req.params.id)) {
            return res.status(400).json({ error: 'Invalid patient ID format' });
        }
        const patient = req.db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const encounters = req.db.prepare('SELECT * FROM encounters WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
        const labs = req.db.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
        const medications = req.db.prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY status ASC, start_date DESC').all(req.params.id);
        const vitals = req.db.prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
        const aiSummaries = req.db.prepare('SELECT * FROM ai_summaries WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5').all(req.params.id);

        // Audit log
        req.db.prepare('INSERT INTO audit_log (user_id, action, resource, resource_id) VALUES (?, ?, ?, ?)')
            .run(req.user.id, 'VIEW_PATIENT', 'patients', req.params.id);

        res.json({
            ...patient,
            encounters,
            labs,
            medications,
            vitals,
            ai_summaries: aiSummaries
        });
    } catch (err) {
        console.error('[PATIENT ERROR]', err.message);
        res.status(500).json({ error: 'Failed to load patient' });
    }
});

// Get patient encounters
router.get('/:id/encounters', authenticate, (req, res) => {
    try {
        const encounters = req.db.prepare('SELECT * FROM encounters WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
        res.json(encounters);
    } catch (err) {
        console.error('[ENCOUNTERS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to load encounters' });
    }
});

// Get patient labs
router.get('/:id/labs', authenticate, (req, res) => {
    try {
        const labs = req.db.prepare('SELECT * FROM lab_results WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
        res.json(labs);
    } catch (err) {
        console.error('[LABS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to load labs' });
    }
});

// Get patient medications
router.get('/:id/medications', authenticate, (req, res) => {
    try {
        const meds = req.db.prepare('SELECT * FROM medications WHERE patient_id = ? ORDER BY status ASC, start_date DESC').all(req.params.id);
        res.json(meds);
    } catch (err) {
        console.error('[MEDS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to load medications' });
    }
});

// Get patient vitals
router.get('/:id/vitals', authenticate, (req, res) => {
    try {
        const vitals = req.db.prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY date ASC').all(req.params.id);
        res.json(vitals);
    } catch (err) {
        console.error('[VITALS ERROR]', err.message);
        res.status(500).json({ error: 'Failed to load vitals' });
    }
});

module.exports = router;
