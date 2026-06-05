pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";

let pdfDoc = null;
let pdfBytes = null;
let currentPage = 1;

const pdfInput = document.getElementById("pdfInput");

const originalCanvas = document.getElementById("originalCanvas");
const previewCanvas = document.getElementById("previewCanvas");

const originalCtx = originalCanvas.getContext("2d");
const previewCtx = previewCanvas.getContext("2d");

const pageInfo = document.getElementById("pageInfo");
const statusBox = document.getElementById("status");

pdfInput.addEventListener("change", loadPdf);

document
    .getElementById("prevPage")
    .addEventListener("click", () => {
        if (!pdfDoc) return;
        if (currentPage > 1) {
            currentPage--;
            renderCurrentPage();
        }
    });

document
    .getElementById("nextPage")
    .addEventListener("click", () => {
        if (!pdfDoc) return;
        if (currentPage < pdfDoc.numPages) {
            currentPage++;
            renderCurrentPage();
        }
    });

document
    .getElementById("refreshPreview")
    .addEventListener("click", renderCurrentPage);

document
    .getElementById("exportPdf")
    .addEventListener("click", exportPdf);

async function loadPdf(event) {

    const file = event.target.files[0];

    if (!file) return;

    pdfBytes = await file.arrayBuffer();

    pdfDoc = await pdfjsLib.getDocument({
        data: pdfBytes
    }).promise;

    currentPage = 1;

    statusBox.textContent =
        `PDF読込完了 (${pdfDoc.numPages}ページ)`;

    renderCurrentPage();
}

function getCropSettings() {

    return {
        left: Number(document.getElementById("leftPct").value),
        right: Number(document.getElementById("rightPct").value),
        top: Number(document.getElementById("topPct").value),
        bottom: Number(document.getElementById("bottomPct").value),
        split: document.getElementById("splitPages").checked
    };
}

async function renderCurrentPage() {

    if (!pdfDoc) return;

    const page = await pdfDoc.getPage(currentPage);

    const viewport = page.getViewport({
        scale: 1.4
    });

    originalCanvas.width = viewport.width;
    originalCanvas.height = viewport.height;

    await page.render({
        canvasContext: originalCtx,
        viewport
    }).promise;

    drawPreview();

    pageInfo.textContent =
        `ページ ${currentPage} / ${pdfDoc.numPages}`;
}

function drawPreview() {

    const settings = getCropSettings();

    previewCanvas.width = originalCanvas.width;
    previewCanvas.height = originalCanvas.height;

    previewCtx.clearRect(
        0,
        0,
        previewCanvas.width,
        previewCanvas.height
    );

    previewCtx.drawImage(
        originalCanvas,
        0,
        0
    );

    const w = previewCanvas.width;
    const h = previewCanvas.height;

    const x1 = w * settings.left / 100;
    const x2 = w * settings.right / 100;

    if (!settings.split) {

        const y1 = h * settings.top / 100;
        const y2 = h * settings.bottom / 100;

        drawMask(x1, y1, x2, y2);

    } else {

        const half = h / 2;

        const y1a =
            half * settings.top / 100;

        const y2a =
            half * settings.bottom / 100;

        drawMask(
            x1,
            y1a,
            x2,
            y2a
        );

        drawMask(
            x1,
            half + y1a,
            x2,
            half + y2a
        );
    }
}

function drawMask(x1, y1, x2, y2) {

    const w = previewCanvas.width;
    const h = previewCanvas.height;

    previewCtx.fillStyle =
        "rgba(255,0,0,0.25)";

    previewCtx.fillRect(0,0,w,y1);
    previewCtx.fillRect(0,y2,w,h-y2);

    previewCtx.fillRect(
        0,
        y1,
        x1,
        y2-y1
    );

    previewCtx.fillRect(
        x2,
        y1,
        w-x2,
        y2-y1
    );

    previewCtx.strokeStyle = "red";
    previewCtx.lineWidth = 3;

    previewCtx.strokeRect(
        x1,
        y1,
        x2-x1,
        y2-y1
    );
}

async function exportPdf() {

    if (!pdfBytes) return;

    statusBox.textContent =
        "PDF生成中...";

    const srcPdf =
        await PDFLib.PDFDocument.load(pdfBytes);

    const outPdf =
        await PDFLib.PDFDocument.create();

    const settings = getCropSettings();

    const pages = srcPdf.getPages();

    for (const page of pages) {

        const width = page.getWidth();
        const height = page.getHeight();

        if (!settings.split) {

            await addCropPage(
                srcPdf,
                outPdf,
                page,
                width,
                height,
                settings
            );

        } else {

            await addSplitPage(
                srcPdf,
                outPdf,
                page,
                width,
                height,
                settings,
                true
            );

            await addSplitPage(
                srcPdf,
                outPdf,
                page,
                width,
                height,
                settings,
                false
            );
        }
    }

    const bytes = await outPdf.save();

    const blob = new Blob(
        [bytes],
        { type: "application/pdf" }
    );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = "trimmed.pdf";
    a.click();

    URL.revokeObjectURL(url);

    statusBox.textContent =
        "PDF生成完了";
}

async function addCropPage(
    srcPdf,
    outPdf,
    srcPage,
    width,
    height,
    settings
) {

    const [embedded] =
        await outPdf.embedPages([srcPage]);

    const x =
        width * settings.left / 100;

    const cropWidth =
        width *
        (settings.right - settings.left)
        / 100;

    const y =
        height *
        settings.top
        / 100;

    const cropHeight =
        height *
        (settings.bottom - settings.top)
        / 100;

    const page =
        outPdf.addPage([
            cropWidth,
            cropHeight
        ]);

    page.drawPage(embedded,{
        x: -x,
        y: -y
    });
}

async function addSplitPage(
    srcPdf,
    outPdf,
    srcPage,
    width,
    height,
    settings,
    upper
) {

    const [embedded] =
        await outPdf.embedPages([srcPage]);

    const half =
        height / 2;

    const cropX =
        width * settings.left / 100;

    const cropWidth =
        width *
        (settings.right - settings.left)
        / 100;

    const cropY =
        half *
        settings.top
        / 100;

    const cropHeight =
        half *
        (settings.bottom - settings.top)
        / 100;

    const srcY = upper
        ? half + cropY
        : cropY;

    const page =
        outPdf.addPage([
            cropWidth,
            cropHeight
        ]);

    page.drawPage(
        embedded,
        {
            x: -cropX,
            y: -srcY
        }
    );
}