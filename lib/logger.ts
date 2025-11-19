export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel = process.env.LOG_LEVEL || 'info';

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, context, timestamp, userId, sessionId } = entry;
    
    if (this.isDevelopment) {
      return JSON.stringify({
        level,
        message,
        context,
        timestamp,
        userId,
        sessionId,
      }, null, 2);
    }

    return JSON.stringify({
      level,
      message,
      context,
      timestamp,
      userId,
      sessionId,
    });
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry('debug', message, context);
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(entry));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry('info', message, context);
    if (this.shouldLog('info')) {
      console.log(this.formatMessage(entry));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry('warn', message, context);
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(entry));
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry('error', message, {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    });

    if (this.shouldLog('error')) {
      console.error(this.formatMessage(entry));
    }

    // In production, send to error tracking service (Sentry, LogRocket, etc.)
    // if (!this.isDevelopment) {
    //   // Sentry.captureException(error, { extra: context });
    // }
  }

  // Request logging for API routes
  logRequest(req: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): void {
    this.info('API Request', {
      method: req.method,
      url: req.url,
      headers: this.isDevelopment ? req.headers : undefined,
      body: this.isDevelopment ? req.body : undefined,
    });
  }

  // Response logging for API routes
  logResponse(res: {
    statusCode: number;
    duration?: number;
    url: string;
  }): void {
    const level = res.statusCode >= 400 ? 'error' : 'info';
    this[level]('API Response', {
      statusCode: res.statusCode,
      duration: res.duration,
      url: res.url,
    });
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;
