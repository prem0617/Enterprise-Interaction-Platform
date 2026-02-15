// config/cloudinary.js or wherever you configure uploads
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith("image/");

    console.log("Uploading file:", {
      filename: file.originalname,
      mimetype: file.mimetype,
      isImage: isImage,
      resourceType: isImage ? "image" : "raw",
    });

    return {
      folder: "chat-files",
      resource_type: isImage ? "image" : "raw",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
      // Don't specify allowed_formats for raw files
      ...(isImage && {
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      }),
    };
  },
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    // Archives
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not supported`), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Memory storage for meeting recordings (video/audio) — upload to Cloudinary in controller
const memoryStorage = multer.memoryStorage();
const recordingFileFilter = (req, file, cb) => {
  const allowed = [
    "video/webm",
    "video/mp4",
    "audio/webm",
    "audio/mp4",
    "application/octet-stream",
    "text/plain", // some clients send blob as text/plain; we still treat body as video
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Recording type ${file.mimetype} not supported`), false);
  }
};

export const uploadMeetingRecording = multer({
  storage: memoryStorage,
  fileFilter: recordingFileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB per file
  },
});

export { cloudinary };
