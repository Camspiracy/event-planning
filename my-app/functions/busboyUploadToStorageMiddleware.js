const Busboy = require("busboy");
const { v4: uuidv4 } = require("uuid");
const { getStorage } = require("firebase-admin/storage");

function busboyUploadToStorageMiddleware(bucketName = undefined, folderResolver = () => "uploads") {
  return (req, res, next) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const bb = Busboy({ headers: req.headers });
    const fileWrites = [];

    req.body = {};
    req.uploads = {};

    const bucket = bucketName ? getStorage().bucket(bucketName) : getStorage().bucket();

    // Handle form fields
    bb.on("field", (name, val) => {
      req.body[name] = val;
    });

    // Handle files
    bb.on("file", (fieldname, file, info) => {
      const { filename, mimeType } = info;
      const uniqueName = `${uuidv4()}-${filename}`;
      const folder = typeof folderResolver === "function" ? folderResolver(req) : folderResolver;
      const destination = `${folder}/${uniqueName}`;
      const storageFile = bucket.file(destination);

      req.uploads[fieldname] = storageFile; // store the File object for later

      const writeStream = storageFile.createWriteStream({ metadata: { contentType: mimeType } });
      file.pipe(writeStream);

      const promise = new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      fileWrites.push(promise);
    });

    bb.on("finish", async () => {
      try {
        await Promise.all(fileWrites);
        next();
      } catch (err) {
        console.error("File upload error:", err);
        res.status(500).send("File upload failed");
      }
    });

    bb.end(req.rawBody);
  };
}
module.exports = busboyUploadToStorageMiddleware;
