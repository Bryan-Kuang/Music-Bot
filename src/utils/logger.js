const winston = require("winston");
const config = require("../config/config");
const fs = require("fs");
const path = require("path");

// 确保logs目录存在
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "bilibili-discord-bot" },
  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3, // 保留最多3个文件
      tailable: true // 保持当前文件名不变
    }),
    new winston.transports.File({
      filename: `logs/${config.logging.file}`,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3, // 保留最多3个文件
      tailable: true // 保持当前文件名不变
    }),
  ],
});

// Add console logging for development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

module.exports = logger;
