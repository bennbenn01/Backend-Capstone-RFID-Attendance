import multer from 'multer'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic']

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)){
            cb(null, true);
        }else{
            return cb(new Error('Only valid image files are allowed.'));
        }
    }
});

export default upload;