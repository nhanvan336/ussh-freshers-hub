const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure storage for different file types
const createStorage = (subfolder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '..', 'public', 'uploads', subfolder);
      ensureDirectoryExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate unique filename while preserving extension
      const uniqueSuffix = uuidv4();
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 20);
      
      cb(null, `${baseName}_${uniqueSuffix}${ext}`);
    }
  });
};

// File filter functions
const createFileFilter = (allowedMimeTypes, allowedExtensions) => {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`), false);
    }
  };
};

// Document upload configuration
const documentFilter = createFileFilter(
  [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4',
    'video/avi',
    'video/quicktime'
  ],
  ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.mp4', '.avi', '.mov']
);

// Image upload configuration
const imageFilter = createFileFilter(
  ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ['.jpeg', '.jpg', '.png', '.gif', '.webp']
);

// Avatar upload configuration
const avatarFilter = createFileFilter(
  ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ['.jpeg', '.jpg', '.png', '.webp']
);

// Create upload middlewares
const uploadDocument = multer({
  storage: createStorage('documents'),
  fileFilter: documentFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 5 // Max 5 files per upload
  }
});

const uploadImage = multer({
  storage: createStorage('images'),
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Max 10 images per upload
  }
});

const uploadAvatar = multer({
  storage: createStorage('avatars'),
  fileFilter: avatarFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // Single file only
  }
});

const uploadAttachment = multer({
  storage: createStorage('attachments'),
  fileFilter: (req, file, cb) => {
    // More permissive for forum attachments
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed for attachments'), false);
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 3 // Max 3 attachments per post
  }
});

// Utility functions
const getFileUrl = (filename, subfolder) => {
  return `/uploads/${subfolder}/${filename}`;
};

const deleteFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

const getFileInfo = (file) => {
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    url: getFileUrl(file.filename, file.destination.split('/').pop())
  };
};

// Clean up old files (utility for maintenance)
const cleanupOldFiles = async (subfolder, daysOld = 30) => {
  try {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', subfolder);
    const files = fs.readdirSync(uploadPath);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(uploadPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        if (deleteFile(filePath)) {
          deletedCount++;
        }
      }
    });
    
    console.log(`Cleaned up ${deletedCount} old files from ${subfolder}`);
    return deletedCount;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return 0;
  }
};

// File validation
const validateFileSize = (file, maxSizeMB) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.mimetype);
};

// Error handling for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Initialize upload directories on startup
const initializeUploadDirs = () => {
  const subfolders = ['documents', 'images', 'avatars', 'attachments'];
  subfolders.forEach(subfolder => {
    const uploadPath = path.join(__dirname, '..', 'public', 'uploads', subfolder);
    ensureDirectoryExists(uploadPath);
  });
  
  // Create .gitkeep files to ensure directories are tracked
  subfolders.forEach(subfolder => {
    const gitkeepPath = path.join(__dirname, '..', 'public', 'uploads', subfolder, '.gitkeep');
    if (!fs.existsSync(gitkeepPath)) {
      fs.writeFileSync(gitkeepPath, '');
    }
  });
};

// Initialize directories when module loads
initializeUploadDirs();

module.exports = {
  uploadDocument,
  uploadImage,
  uploadAvatar,
  uploadAttachment,
  getFileUrl,
  getFileInfo,
  deleteFile,
  cleanupOldFiles,
  validateFileSize,
  validateFileType,
  handleMulterError,
  initializeUploadDirs
};