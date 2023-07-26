import express from "express";
import multer from "multer";
import { initWhatsApp, getStatus, sendMedia, sendMessage } from "./function/whatsapp";
import fs from "fs";
const app = express();
const PORT = 8000;
const storage = multer.diskStorage({
    destination: '/tmp',
    filename: (req, file, cb) => {
      cb(null, file.originalname)
    },
});

const upload = multer({ storage });

app.use(express.json());

app.get("/", getStatus);
app.post("/send-message", sendMessage);
app.post("/send-media", upload.single("file"), sendMedia);

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initWhatsApp();
});
