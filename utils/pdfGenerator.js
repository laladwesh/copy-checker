// utils/pdfGenerator.js
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const sharp = require('sharp');

async function generatePdfFromImages(imageBuffers) {
    const pdfDoc = await PDFDocument.create();

    for (const imgBuffer of imageBuffers) {
        let img;
        let imgType;
        try {
            const metadata = await sharp(imgBuffer).metadata();
            if (metadata.format === 'jpeg') {
                img = await pdfDoc.embedJpg(imgBuffer);
                imgType = 'jpg';
            } else if (metadata.format === 'png') {
                img = await pdfDoc.embedPng(imgBuffer);
                imgType = 'png';
            } else {
                console.warn(`Unsupported image format: ${metadata.format}. Attempting to convert to PNG.`);
                const pngBuffer = await sharp(imgBuffer).png().toBuffer();
                img = await pdfDoc.embedPng(pngBuffer);
                imgType = 'png';
            }
        } catch (error) {
            console.error("Error processing image buffer for PDF:", error);
            throw new Error("Failed to process image for PDF generation.");
        }

        const page = pdfDoc.addPage();
        const { width, height } = img;
        const aspectRatio = width / height;
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();

        let drawWidth = pageWidth;
        let drawHeight = pageWidth / aspectRatio;

        if (drawHeight > pageHeight) {
            drawHeight = pageHeight;
            drawWidth = pageHeight * aspectRatio;
        }

        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        page.drawImage(img, { x, y, width: drawWidth, height: drawHeight });
    }

    const pdfBuffer = await pdfDoc.save();
    const pageCount = pdfDoc.getPageCount();

    return { buffer: pdfBuffer, pageCount: pageCount }; // Returns both buffer and pageCount
}

module.exports = generatePdfFromImages;