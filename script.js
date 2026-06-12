pdfjsLib.GlobalWorkerOptions.workerSrc =
    "./libs/pdf.worker.min.js";

let pdfDoc = null;
let pdfBytes = null;
let currentPage = 1;
let pdfFile = null;
let notoFontBytes = null;
let previewPdfUrl = null;

const pdfInput = document.getElementById("pdfInput");

const originalCanvas = document.getElementById("originalCanvas");
const previewCanvas = document.getElementById("previewCanvas");

const originalCtx = originalCanvas.getContext("2d");
const previewCtx = previewCanvas.getContext("2d");

const pageInfo = document.getElementById("pageInfo");
const statusBox = document.getElementById("status");

const splitCheckbox = document.getElementById("splitPages");

pdfInput.addEventListener("change", loadPdf);

splitCheckbox.addEventListener("change", updateUI);

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

document.getElementById("openPdfButton")
    .addEventListener("click", () => {

            console.log(
                "clicked",
                previewPdfUrl
            );

            if (!previewPdfUrl) {

                alert(
                    "previewPdfUrl is null"
                );

                return;
            }

            const w =
                window.open(
                    previewPdfUrl,
                    "_blank"
                );

            console.log(
                "window",
                w
            );
        }
    );

document
    .getElementById("refreshPreview")
    .addEventListener("click", renderCurrentPage);

document
    .getElementById("exportPdf")
    .addEventListener("click", exportPdf);

const previewInputs = [
    "upperLeft",
    "upperRight",
    "upperTop",
    "upperBottom",
    "lowerLeft",
    "lowerRight",
    "lowerTop",
    "lowerBottom"
];

previewInputs.forEach(id => {

    document
        .getElementById(id)
        .addEventListener(
            "input",
            () => {
                if(pdfDoc){
                    renderCurrentPage();
                }
            }
        );

});

async function loadPdf(event) {

    pdfFile = event.target.files[0];

    if (!pdfFile) return;

    const rawBytes = await pdfFile.arrayBuffer();

    pdfBytes = new Uint8Array(rawBytes);

    pdfDoc = await pdfjsLib.getDocument({
        data: pdfBytes.slice()
    }).promise;

    currentPage = 1;

    statusBox.textContent =
        `PDF読込完了 (${pdfDoc.numPages}ページ)`;

    renderCurrentPage();
}

function getCropSettings() {

    return {

        split:
            document.getElementById(
                "splitPages"
            ).checked,

        upper: {

            left:
                Number(
                    document.getElementById(
                        "upperLeft"
                    ).value
                ),

            right:
                Number(
                    document.getElementById(
                        "upperRight"
                    ).value
                ),

            top:
                Number(
                    document.getElementById(
                        "upperTop"
                    ).value
                ),

            bottom:
                Number(
                    document.getElementById(
                        "upperBottom"
                    ).value
                )
        },

        lower: {

            left:
                Number(
                    document.getElementById(
                        "lowerLeft"
                    ).value
                ),

            right:
                Number(
                    document.getElementById(
                        "lowerRight"
                    ).value
                ),

            top:
                Number(
                    document.getElementById(
                        "lowerTop"
                    ).value
                ),

            bottom:
                Number(
                    document.getElementById(
                        "lowerBottom"
                    ).value
                )
        }
    };
}

function getTextSettings() {

    return {

        titletext:
            document.getElementById(
                "titleText"
            ).value,

        titleTextPosition:
            document.getElementById(
                "titleTextPosition"
            ).value,

        pageNumberEnabled:
            document.getElementById(
                "enablePageNumber"
            ).checked,

        pageNumberPosition:
            document.getElementById(
                "pageNumberPosition"
            ).value
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

    if (!settings.split) {

        const crop = settings.upper;

        const x1 = w * crop.left / 100;
        const x2 = w * crop.right / 100;

        const y1 = h * crop.top / 100;
        const y2 = h * crop.bottom / 100;

        drawMaskRegion(
            x1,
            y1,
            x2,
            y2,
            0,
            h,
            "#ff0000"
        );

    } else {

        const half = h / 2;

        const upper = settings.upper;
        const lower = settings.lower;

        const upperX1 =
            w * upper.left / 100;

        const upperX2 =
            w * upper.right / 100;

        const upperY1 =
            half * upper.top / 100;

        const upperY2 =
            half * upper.bottom / 100;

        const lowerX1 =
            w * lower.left / 100;

        const lowerX2 =
            w * lower.right / 100;

        const lowerY1 =
            half * lower.top / 100;

        const lowerY2 =
            half * lower.bottom / 100;

        drawMaskRegion(
            upperX1,
            upperY1,
            upperX2,
            upperY2,
            0,
            half,
            "#00aa00"
        );

        drawMaskRegion(
            lowerX1,
            half + lowerY1,
            lowerX2,
            half + lowerY2,
            half,
            h,
            "#0066ff"
        );
    }
}

function drawMaskRegion(
    x1,
    y1,
    x2,
    y2,
    regionTop,
    regionBottom,
    borderColor
) {

    previewCtx.fillStyle =
        "rgba(255,0,0,0.15)";

    previewCtx.fillRect(
        0,
        regionTop,
        previewCanvas.width,
        y1 - regionTop
    );

    previewCtx.fillRect(
        0,
        y2,
        previewCanvas.width,
        regionBottom - y2
    );

    previewCtx.fillRect(
        0,
        y1,
        x1,
        y2 - y1
    );

    previewCtx.fillRect(
        x2,
        y1,
        previewCanvas.width - x2,
        y2 - y1
    );

    previewCtx.strokeStyle =
        borderColor;

    previewCtx.lineWidth = 3;

    previewCtx.strokeRect(
        x1,
        y1,
        x2 - x1,
        y2 - y1
    );
}

async function exportPdf() {

    document.getElementById("pdfResult")
        .textContent = "PDF生成中...";

    document.getElementById("openPdfButton")
        .style.display = "none";

    const textSettings = getTextSettings();

    if (!pdfBytes) return;

    const settings = getCropSettings();

    const errors = validateSettings(settings);

    if (errors.length > 0) {

        alert(
            "入力エラー:\n\n" +
            errors.join("\n")
        );

        return;
    }

    statusBox.textContent =
        "PDF生成中...";

    const srcPdf =
        await PDFLib.PDFDocument.load(pdfBytes);

    if (!notoFontBytes) {

        notoFontBytes =
            await fetch(
                "fonts/NotoSansJP/NotoSansJP-Regular.ttf"
            ).then(
                r => r.arrayBuffer()
            );
    }

    const outPdf =
        await PDFLib.PDFDocument.create();

    outPdf.registerFontkit(fontkit);

    const font =
        await outPdf.embedFont(
            notoFontBytes
        );

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
                settings,
                outPdf.getPageCount() + 1,
                textSettings,
                font
            );

        } else {

            await addSplitPage(
                srcPdf,
                outPdf,
                page,
                width,
                height,
                settings,
                outPdf.getPageCount() + 1,
                textSettings,
                font,
                true
            );


            await addSplitPage(
                srcPdf,
                outPdf,
                page,
                width,
                height,
                settings,
                outPdf.getPageCount() + 1,
                textSettings,
                font,
                false
            );
        }

    }

    const bytes = await outPdf.save();

        const blob =
            new Blob(
                [bytes],
                {
                    type:
                        "application/pdf"
                }
            );

        if (previewPdfUrl) {

            URL.revokeObjectURL(
                previewPdfUrl
            );
        }

        previewPdfUrl =
            URL.createObjectURL(
                blob
            );

        document.getElementById(
            "pdfResult"
        ).textContent =
            "PDF生成完了";

        document.getElementById(
            "openPdfButton"
        ).style.display =
            "inline-block";
}

async function addCropPage(
    srcPdf,
    outPdf,
    srcPage,
    width,
    height,
    settings,
    pageNumber,
    textSettings,
    font
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

    const newPage =
        outPdf.addPage([
            cropWidth,
            cropHeight
        ]);

    newPage.drawPage(embedded,{
        x: -x,
        y: -y
    });

    addPageDecorations(
        newPage,
        pageNumber,
        textSettings,
        font
    );
}

async function addSplitPage(
    srcPdf,
    outPdf,
    srcPage,
    width,
    height,
    settings,
    pageNumber,
    textSettings,
    font,
    upper
) {

    const crop =
    upper
        ? settings.upper
        : settings.lower;

    const [embedded] =
        await outPdf.embedPages([srcPage]);

    const half = height / 2;

    const cropX =
        width * crop.left / 100;

    const cropWidth =
        width *
        (crop.right - crop.left)
        / 100;

    const cropHeight =
        half *
        (crop.bottom - crop.top)
        / 100;

    let srcY;

    if (upper) {

        srcY =
            half +
            half *
            (100 - crop.bottom)
            / 100;

    } else {

        srcY =
            half *
            (100 - crop.bottom)
            / 100;
    }

    const newPage =
        outPdf.addPage([
            cropWidth,
            cropHeight
        ]);

    newPage.drawPage(
        embedded,
        {
            x: -cropX,
            y: -srcY
        }
    );

    addPageDecorations(
        newPage,
        pageNumber,
        textSettings,
        font
    );
}

const linkedIds = [
    "Left",
    "Right",
    "Top",
    "Bottom"
];

for (const name of linkedIds) {

    document
        .getElementById("upper" + name)
        .addEventListener(
            "input",
            syncUpperToLower
        );
}

function syncUpperToLower() {

    const link =
        document.getElementById(
            "linkUpperLower"
        );

    if (!link.checked) {
        return;
    }

    document.getElementById(
        "lowerLeft"
    ).value =
    document.getElementById(
        "upperLeft"
    ).value;

    document.getElementById(
        "lowerRight"
    ).value =
    document.getElementById(
        "upperRight"
    ).value;

    document.getElementById(
        "lowerTop"
    ).value =
    document.getElementById(
        "upperTop"
    ).value;

    document.getElementById(
        "lowerBottom"
    ).value =
    document.getElementById(
        "upperBottom"
    ).value;
}

function updateUI() {

    const split =
        document.getElementById(
            "splitPages"
        ).checked;

    document.getElementById(
        "lowerSettings"
    ).style.display =
        split ? "block" : "none";
}

updateUI();

function validateSettings(settings) {

    const errors = [];

    function validateCrop(name, crop) {

        if (crop.left >= crop.right) {

            errors.push(
                `${name}: 左端は右端より小さくしてください`
            );
        }

        if (crop.top >= crop.bottom) {

            errors.push(
                `${name}: 上端は下端より小さくしてください`
            );
        }

        if (
            crop.left < 0 ||
            crop.right > 100 ||
            crop.top < 0 ||
            crop.bottom > 100
        ) {

            errors.push(
                `${name}: 値は0～100の範囲で入力してください`
            );
        }

        const width =
            crop.right - crop.left;

        const height =
            crop.bottom - crop.top;

        if (width < 1) {

            errors.push(
                `${name}: 横幅が小さすぎます`
            );
        }

        if (height < 1) {

            errors.push(
                `${name}: 高さが小さすぎます`
            );
        }
    }

    validateCrop(
        "上ページ",
        settings.upper
    );

    if (settings.split) {

        validateCrop(
            "下ページ",
            settings.lower
        );
    }

    return errors;
}

function addPageDecorations(
    newPage,
    outputPageNumber,
    settings,
    font
) {

    const width =
        newPage.getWidth();

    const height =
        newPage.getHeight();

    const fontSize = 10;

    if (settings.titletext) {
        
        const text = settings.titletext;

        const pos =
            getPosition(
                width,
                height,
                settings.titleTextPosition,
                font,
                text,
                fontSize
            );

        newPage.drawText(
            text,
            {
                x: pos.x,
                y: pos.y,
                size: fontSize,
                font
            }
        );
    }

    if (
        settings.pageNumberEnabled
    ) {

        const text = String(outputPageNumber);

        const pos =
            getPosition(
                width,
                height,
                settings.pageNumberPosition,
                font,
                text,
                fontSize
            );

        newPage.drawText(
            text,
            {
                x: pos.x,
                y: pos.y,
                size: fontSize,
                font
            }
        );
    }
}

function getPosition(
    width,
    height,
    position,
    font,
    text,
    size = 10
) {

    const margin = 10;

    /*
    if (isPageNumber) text = String(settings.pageNumberEnabled);
        else text = settings.commontext;
    */

    const widthNoText = width - font.widthOfTextAtSize(text, size);

    switch (position) {

        case "top-left":
            return {
                x: margin,
                y: height - size - margin
            };

        case "top-center":
            return {
                x: widthNoText / 2,
                y: height - size - margin
            };

        case "top-right":
            return {
                x: widthNoText - margin,
                y: height - size - margin
            };

        case "bottom-left":
            return {
                x: margin,
                y: margin
            };

        case "bottom-center":
            return {
                x: widthNoText / 2,
                y: margin
            };

        case "bottom-right":
            return {
                x: widthNoText - margin,
                y: margin
            };
    }
}