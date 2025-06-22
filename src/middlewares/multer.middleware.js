import multer from 'multer';



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, '/Users/tanishbooti/Desktop/webd/MajorProject/backend/public')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix)
    }
  })
  
 export const upload = multer({ storage: storage })


  