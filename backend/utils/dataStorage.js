const fs = require('fs').promises;
const path = require('path');

// Data storage and logging utility
class DataStorage {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
    this.sessionsDir = path.join(this.dataDir, 'sessions');
    this.logsDir = path.join(this.dataDir, 'logs');
    this.finalizedDir = path.join(this.dataDir, 'finalized');

    // Ensure directories exist
    this.ensureDirectories();
  }

  // Ensure all required directories exist
  async ensureDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.sessionsDir, { recursive: true });
      await fs.mkdir(this.logsDir, { recursive: true });
      await fs.mkdir(this.finalizedDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  // Get timestamp folder name
  getTimestampFolder() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    return `${timestamp}_${time}`;
  }

  // Get client info from request
  getClientInfo(req) {
    if (!req) {
      return {
        ip: 'Unknown',
        userAgent: 'Unknown',
        timestamp: new Date().toISOString(),
        method: 'Unknown',
        path: 'Unknown',
        referer: 'Unknown',
        acceptLanguage: 'Unknown'
      };
    }
    return {
      ip: req.ip || (req.connection ? req.connection.remoteAddress : null) || (req.socket ? req.socket.remoteAddress : null) ||
        (req.connection && req.connection.socket ? req.connection.socket.remoteAddress : null) || 'Unknown',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date().toISOString(),
      method: req.method || 'Unknown',
      path: req.path || 'Unknown',
      referer: req.get('Referer') || 'Direct',
      acceptLanguage: req.get('Accept-Language') || 'Unknown'
    };
  }

  // Save session data with timestamp folder
  async saveSession(sessionId, data, req) {
    try {
      await this.ensureDirectories();

      const clientInfo = this.getClientInfo(req);
      const timestampFolder = this.getTimestampFolder();
      const sessionFolder = path.join(this.sessionsDir, timestampFolder);

      // Create timestamp folder
      await fs.mkdir(sessionFolder, { recursive: true });

      const sessionData = {
        sessionId,
        clientInfo,
        data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timestampFolder
      };

      const filename = `session_${sessionId}.json`;
      const filepath = path.join(sessionFolder, filename);

      await fs.writeFile(filepath, JSON.stringify(sessionData, null, 2));

      // Also log the session creation
      await this.logActivity('session_created', sessionData, req);

      return { filename, folder: timestampFolder };
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  // Log activity with client info
  async logActivity(activityType, data, req) {
    try {
      await this.ensureDirectories();

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

  // Save finalized CV and cover letter with timestamp folder
  async saveFinalizedData(sessionId, cvData, coverLetter, pdfPaths, req) {
    try {
      await this.ensureDirectories();

      const clientInfo = this.getClientInfo(req);
      const timestampFolder = this.getTimestampFolder();
      const finalizedFolder = path.join(this.finalizedDir, timestampFolder);

      // Create timestamp folder
      await fs.mkdir(finalizedFolder, { recursive: true });

      const finalData = {
        sessionId,
        clientInfo,
        cvData,
        coverLetter,
        pdfPaths,
        finalizedAt: new Date().toISOString(),
        timestampFolder
      };

      const filename = `finalized_${sessionId}.json`;
      const filepath = path.join(finalizedFolder, filename);

      await fs.writeFile(filepath, JSON.stringify(finalData, null, 2));

      // Save CV data separately
      const cvFilename = `cv_${sessionId}.json`;
      const cvFilepath = path.join(finalizedFolder, cvFilename);
      await fs.writeFile(cvFilepath, JSON.stringify(cvData, null, 2));

      // Save cover letter separately if exists
      if (coverLetter) {
        const coverLetterFilename = `cover_letter_${sessionId}.txt`;
        const coverLetterFilepath = path.join(finalizedFolder, coverLetterFilename);
        await fs.writeFile(coverLetterFilepath, coverLetter);
      }

      // Log the finalization
      await this.logActivity('cv_finalized', {
        sessionId,
        hasCoverLetter: !!coverLetter,
        pdfGenerated: !!pdfPaths,
        timestampFolder
      }, req);

      return { filename, folder: timestampFolder };
    } catch (error) {
      console.error('Error saving finalized data:', error);
      throw error;
    }
  }

  // Get session stats
  async getSessionStats() {
    try {
      await this.ensureDirectories();

      const sessionFolders = await fs.readdir(this.sessionsDir);
      const finalizedFolders = await fs.readdir(this.finalizedDir);
      const logFiles = await fs.readdir(this.logsDir);

      let totalSessions = 0;
      let totalFinalizations = 0;

      // Count sessions in all timestamp folders
      for (const folder of sessionFolders) {
        try {
          const folderPath = path.join(this.sessionsDir, folder);
          const stats = await fs.stat(folderPath);
          if (stats.isDirectory()) {
            const files = await fs.readdir(folderPath);
            totalSessions += files.filter(f => f.startsWith('session_')).length;
          }
        } catch (error) {
          // Skip if folder can't be read
        }
      }

      // Count finalizations in all timestamp folders
      for (const folder of finalizedFolders) {
        try {
          const folderPath = path.join(this.finalizedDir, folder);
          const stats = await fs.stat(folderPath);
          if (stats.isDirectory()) {
            const files = await fs.readdir(folderPath);
            totalFinalizations += files.filter(f => f.startsWith('finalized_')).length;
          }
        } catch (error) {
          // Skip if folder can't be read
        }
      }

      return {
        totalSessions,
        totalFinalizations,
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

  // Save feedback
  async saveFeedback(feedbackData) {
    try {
      await this.ensureDirectories();

      const feedbackDir = path.join(this.dataDir, 'feedback');
      await fs.mkdir(feedbackDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `feedback_${timestamp}.json`;
      const filepath = path.join(feedbackDir, filename);

      await fs.writeFile(filepath, JSON.stringify(feedbackData, null, 2));

      return { filename, path: filepath };
    } catch (error) {
      console.error('Error saving feedback:', error);
      throw error;
    }
  }

  // Get all finalized data folders
  async getFinalizedFolders() {
    try {
      await this.ensureDirectories();

      const folders = await fs.readdir(this.finalizedDir);
      const folderStats = [];

      for (const folder of folders) {
        try {
          const folderPath = path.join(this.finalizedDir, folder);
          const stats = await fs.stat(folderPath);
          if (stats.isDirectory()) {
            const files = await fs.readdir(folderPath);
            folderStats.push({
              folder,
              createdAt: stats.birthtime,
              fileCount: files.length,
              hasCV: files.some(f => f.startsWith('cv_')),
              hasCoverLetter: files.some(f => f.startsWith('cover_letter_')),
              hasFinalized: files.some(f => f.startsWith('finalized_'))
            });
          }
        } catch (error) {
          // Skip if folder can't be read
        }
      }

      return folderStats.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error getting finalized folders:', error);
      return [];
    }
  }
}

module.exports = new DataStorage();
