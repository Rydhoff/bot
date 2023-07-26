import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { RequestHandler, Request, Response } from "express";
import qr from "qr-image";
import fs from "fs";

// Initialization
const session = new Map();
const VAR = "VAR_SESSION";
let connectionStatus: string = "Checking Connection";
let qrString: string; 
export const initWhatsApp = async () => {
    await connectToWhatsApp();
}

// Status
export const getStatus: RequestHandler = async (req: Request, res: Response) => {
    if(qrString == null || qrString == undefined) {
        res.json({
            success: true,
            data: connectionStatus,
            message: "Success view status"
        });
    } else {
        let code = qr.image(qrString, { type: "png" });
        res.setHeader("Content-type", "image/png");
        code.pipe(res);
    }
}

// Send Message
export const sendMedia: RequestHandler = async (req: Request, res: Response) => {
    const { number, message } = req.body;
    console.log(req.file);
    const file = fs.readFileSync("/tmp/" + req.file?.filename);
    if(req.file?.mimetype == "application/pdf") {
        session.get(VAR).sendMessage(`${number}@s.whatsapp.net`, { document: file, fileName: req.file?.filename, caption: message });
    } else { session.get(VAR).sendMessage(`${number}@s.whatsapp.net`, { image: file, caption: message }); }
    res.json({ number, message, file: req.file?.path });
    fs.rmSync("/tmp/" + req.file?.filename);
}

// Send Message
export const sendMessage: RequestHandler = async (req: Request, res: Response) => {
    const { number, message } = req.body;
    session.get(VAR).sendMessage(`${number}@s.whatsapp.net`, { text: message });
    res.json({ number, message });
}

// InitWhatsApp
async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true,
        auth: state
    });
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;

        if(update.qr) {
            qrString = update.qr;
        }

        if(connection === "close") {
            connectionStatus = "closed";
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log("connection closed due to ", lastDisconnect?.error, ", reconnecting ", shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === "open") {
            connectionStatus = "connected";
            console.log("opened connection")
        }
    });
    sock.ev.on("messages.upsert", async m => {
        console.log(JSON.stringify(m, undefined, 2))
    });
    
    session.set(VAR, sock)
}
