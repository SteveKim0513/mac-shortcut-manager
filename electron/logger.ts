// File logs for post-hoc diagnostics, console in dev — same shape as mind-map's
// electron/logger.ts. Location (macOS): ~/Library/Logs/Shortcut Manager/main.log.
import log from 'electron-log/main';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

log.transports.console.level = isDev ? 'debug' : false;
log.transports.file.level = isDev ? 'debug' : 'info';
log.transports.file.maxSize = 1024 * 1024; // 1 MB, then rotates to main.old.log
log.errorHandler.startCatching({ showDialog: false });

export default log;
