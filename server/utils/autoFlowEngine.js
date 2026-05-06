const pool = require('../config/db');
const cron = require('node-cron');

// Centralized automation rules for patient flow
class AutoFlowEngine {
  constructor() {
    this.initCronJobs();
  }

  // Predict wait time based on dept/time averages
  static async predictWaitTime(department_id) {
    try {
      const [stats] = await pool.query(`
        SELECT 
          AVG(TIMESTAMPDIFF(MINUTE, check_in_time, 
            CASE WHEN check_out_time IS NOT NULL THEN check_out_time 
                 ELSE NOW() END)) as avg_wait,
          COUNT(*) as volume
        FROM patient_flow_tracking 
        WHERE department_id = ? AND check_in_time > DATE_SUB(NOW(), INTERVAL 1 DAY)
      `, [department_id]);

      return {
        predicted_minutes: Math.round(stats[0].avg_wait || 30),
        volume: stats[0].volume || 0,
        confidence: stats[0].volume > 5 ? 'high' : 'low'
      };
    } catch (err) {
      console.error('Prediction error:', err);
      return { predicted_minutes: 30, volume: 0, confidence: 'low' };
    }
  }

  // Auto-advance patient based on rules
  static async autoAdvancePatient(patient_id) {
    try {
      // Get current flow
      const [flows] = await pool.query(`
        SELECT * FROM patient_flow_tracking 
        WHERE patient_id = ? AND check_out_time IS NULL 
        ORDER BY check_in_time DESC LIMIT 1
      `, [patient_id]);

      if (flows.length === 0) return { advanced: false };

      const flow = flows[0];
      const now = new Date();
      const duration = (now - new Date(flow.check_in_time)) / 60000; // minutes

      let newStatus = flow.status;

      // Rule 1: Waiting too long (30min) → emergency escalation
      if (flow.status === 'waiting' && duration > 30) {
        newStatus = 'emergency';
      }
      // Rule 2: Consultation timeout (45min) → pharmacy/billing
      else if (flow.status === 'in_consultation' && duration > 45) {
        const [pendingLabs] = await pool.query(
          `SELECT COUNT(*) as cnt FROM lab_tests 
           WHERE patient_id = ? AND status IN ('requested','in_progress')`, [patient_id]
        );
        newStatus = pendingLabs[0].cnt > 0 ? 'lab_test' : 'billing';
      }
      // Rule 3: Lab/pharmacy stall > 2h → checkout
      else if (['lab_test', 'pharmacy'].includes(flow.status) && duration > 120) {
        newStatus = 'checked_out';
      }

      if (newStatus !== flow.status) {
        await pool.query(
          `UPDATE patient_flow_tracking 
           SET status = ?, notes = CONCAT(IFNULL(notes, ''), '|AUTO: ${newStatus}')
           WHERE id = ?`,
          [newStatus, flow.id]
        );

        // Log auto-advance
        console.log(`🤖 AUTO-ADVANCED: Patient ${patient_id} ${flow.status} → ${newStatus} (duration: ${Math.round(duration)}min)`);
        
        return { advanced: true, from: flow.status, to: newStatus };
      }

      return { advanced: false };
    } catch (err) {
      console.error('Auto-advance error:', err);
      return { error: err.message };
    }
  }

  // Check stalled patients every 5min
  initCronJobs() {
    // Scan all active flows every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      const [activeFlows] = await pool.query(`
        SELECT DISTINCT patient_id FROM patient_flow_tracking 
        WHERE check_out_time IS NULL
      `);

      for (const { patient_id } of activeFlows) {
        await this.constructor.autoAdvancePatient(patient_id);
      }
    });

    console.log('🤖 AutoFlowEngine cron jobs initialized');
  }
}

module.exports = AutoFlowEngine;

