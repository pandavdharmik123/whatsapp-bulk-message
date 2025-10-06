/*
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("fontkit"); // ✅ import fontkit

async function editPDF(basePdfPath, outputDir, name, message, fontPath = "./NotoSansGujarati.ttf") {
    try {
        const basePdfBytes = fs.readFileSync(basePdfPath);
        const pdfDoc = await PDFDocument.load(basePdfBytes);

        // ✅ Register fontkit before embedding
        pdfDoc.registerFontkit(fontkit);

        // Embed Gujarati or custom Unicode font
        const fontBytes = fs.readFileSync(fontPath);
        const customFont = await pdfDoc.embedFont(fontBytes);

        // Get first page (or customize which one)
        const page = pdfDoc.getPages()[1];
        const { height } = page.getSize();

        // Draw Gujarati text
        page.drawText(`${name}`, {
            x: 90,
            y: height - 120,
            size: 12,
            font: customFont,
            color: rgb(1, 0, 0),
        });

        page.drawText("સર્વો", {
            x: 125,
            y: height - 331,
            size: 9,
            font: customFont,
            color: rgb(1, 0, 0),
        });

        // Save new PDF
        const outFileName = `${Date.now()}-${name.replace(/\s+/g, "_")}.pdf`;
        const outPath = path.join(outputDir, outFileName);
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outPath, pdfBytes);
        console.log("✅ Gujarati PDF created:", outPath);
        return outPath;
    } catch (err) {
        console.error("❌ editPDF error:", err);
        throw err;
    }
}

// Example standalone test (you can comment this out when used as module)
editPDF(
    "Chandresh.pdf",
    ".",
    "નરોત્તમભાઈ પાંડવ",
);

module.exports = { editPDF };
*/

import PdfPrinter from "pdfmake";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

/* ---------------- Fonts ---------------- */
const fonts = {
    NotoSansGujarati: {
        normal: "NotoSansGujarati.ttf",
        bold: "NotoSansGujarati.ttf",
    },
};
const printer = new PdfPrinter(fonts);

/* ---------------- Helper: create Gujarati overlay in memory ---------------- */
async function createGujaratiOverlayBuffer(name, message) {
    const docDefinition = {
        pageSize: "A4",
        pageMargins: [0, 0, 0, 0],
        content: [
            {
                text: name,
                font: "NotoSansGujarati",
                fontSize: 20,
                color: "red",
                margin: [0, 0, 0, 0]
            },
            {
                text: message,
                font: "NotoSansGujarati",
                fontSize: 16,
                color: "red",
                margin: [90, 393, 0, 0], // x=125, y=330 roughly
            },
        ],
    };

    return new Promise((resolve, reject) => {
        const chunks = [];
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        pdfDoc.on("data", (chunk) => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", reject);
        pdfDoc.end();
    });
}

/* ---------------- Overlay Gujarati text on target PDF ---------------- */
export async function overlayGujaratiText(
    basePdf,
    name,
    message,
    pageNumber = 1,
    outputDir = "."
) {
    // Load the base PDF
    const base = await PDFDocument.load(fs.readFileSync(basePdf));

    // Create Gujarati overlay as Buffer (in memory)
    const gujBuffer = await createGujaratiOverlayBuffer(name, message);
    const overlay = await PDFDocument.load(gujBuffer);

    // Embed overlay page into base
    const [overlayPage] = overlay.getPages();
    const embeddedPage = await base.embedPage(overlayPage);

    const targetPage = base.getPages()[pageNumber - 1];
    const { width, height } = embeddedPage.scale(0.511); // adjust to fit A4
    targetPage.drawPage(embeddedPage, {
        x: 90,
        y: 0,
        width,
        height,
    });

    // Save merged PDF
    const fileName = `${name.replace(/\s+/g, "_")}.pdf`;
    const outPath = path.join(outputDir, fileName);
    fs.writeFileSync(outPath, await base.save());
    console.log("✅ Gujarati text merged successfully:", outPath);
    return outPath;
}
//
// /* ---------------- Example test ---------------- */
// const outPath = await overlayGujaratiText(
//     "Chandresh.pdf",
//     "નરોત્તમભાઈ આનંદભાઈ પાંડવ",
//     "૨",
//     2,
//     "modified" // output folder
// );
// console.log("📄 Final output file:", outPath);
