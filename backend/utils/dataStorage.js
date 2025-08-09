const fs = require('fs').promises;
const path = require('path');

// Data storage and logging utility
class DataStorage {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.sessionsDir = path.join(this.dataDir, 'sessions');
    this.logsDir = path.join(this.dataDir, 'logs');
  }

  // Get client info from request
  getClientInfo(req) {
    return {
      ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null),
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      referer: req.get('Referer') || 'Direct',
      acceptLanguage: req.get('Accept-Language') || 'Unknown'
    };
  }

  // Save session data
  async saveSession(sessionId, data, req) {
    try {
      const clientInfo = this.getClientInfo(req);
      const sessionData = {
        sessionId,
        clientInfo,
        data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const filename = `session_${sessionId}_${Date.now()}.json`;
      const filepath = path.join(this.sessionsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(sessionData, null, 2));

      // Also log the session creation
      await this.logActivity('session_created', sessionData, req);

      return filename;
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  // Log activity with client info
  async logActivity(activityType, data, req) {
    try {
      const clientInfo = this.getClientInfo(req);
      const logEntry = {
        type: activityType,
        timestamp: new Date().toISOString(),
        clientInfo,
        data: typeof data === 'object' ? data : { message: data }
      };

      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `activity_${date}.json`;
      const filepath = path.join(this.logsDir, filename);

      // Read existing log file or create new
      let existingLogs = [];
      try {
        const fileContent = await fs.readFile(filepath, 'utf8');
        existingLogs = JSON.parse(fileContent);
      } catch (error) {
        // File doesn't exist, start with empty array
        existingLogs = [];
      }

      // Add new log entry
      existingLogs.push(logEntry);

      // Keep only last 1000 entries per day to prevent huge files
      if (existingLogs.length > 1000) {
        existingLogs = existingLogs.slice(-1000);
      }

      await fs.writeFile(filepath, JSON.stringify(existingLogs, null, 2));

      return logEntry;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  // Save finalized CV and cover letter
  async saveFinalizedData(sessionId, cvData, coverLetter, pdfPaths, req) {
    try {
      const clientInfo = this.getClientInfo(req);
      const finalData = {
        sessionId,
        clientInfo,
        cvData,
        coverLetter,
        pdfPaths,
        finalizedAt: new Date().toISOString()
      };

      const filename = `finalized_${sessionId}_${Date.now()}.json`;
      const filepath = path.join(this.sessionsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(finalData, null, 2));

      // Log the finalization
      await this.logActivity('cv_finalized', {
        sessionId,
        hasCoverLetter: !!coverLetter,
        pdfGenerated: !!pdfPaths
      }, req);

      return filename;
    } catch (error) {
      console.error('Error saving finalized data:', error);
      throw error;
    }
  }

  // Get session stats
  async getSessionStats() {
    try {
      const sessionFiles = await fs.readdir(this.sessionsDir);
      const logFiles = await fs.readdir(this.logsDir);

      return {
        totalSessions: sessionFiles.filter(f => f.startsWith('session_')).length,
        totalFinalizations: sessionFiles.filter(f => f.startsWith('finalized_')).length,
        totalLogFiles: logFiles.length,
        lastActivity: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalSessions: 0,
        totalFinalizations: 0,
        totalLogFiles: 0,
        lastActivity: new Date().toISOString()
      };
    }
  }
}

module.exports = new DataStorage();
