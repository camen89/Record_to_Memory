window.onload = () => {
    const video = document.getElementById('camera');

    const cameraSetting = {
        audio: false,
        video: {
            facingMode: 'environment'
        }
    };

    navigator.mediaDevices.getUserMedia(cameraSetting)
        .then((mediaStream) => {
            video.srcObject = mediaStream;
        })
        .catch((err) => {
            console.error(err);
            alert('カメラの起動に失敗しました: ' + err.message);
        });

    resizeCanvas();
};

function resizeCanvas() {
    const input = document.getElementById('canvasWidthInput');
    const width = parseInt(input.value, 10);
    if (isNaN(width) || width <= 0) {
        alert('正しい幅を入力してください。');
        return;
    }

    const canvas = document.getElementById('resultCanvas');
    const aspectRatio = 4 / 5;
    canvas.width = width;
    canvas.height = Math.round(width / aspectRatio);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    console.log(`Canvas resized to: ${canvas.width} x ${canvas.height}`);
}

function takePhoto() {
    const video = document.getElementById('camera');
    const dateP = document.getElementById('date');
    const canvas = document.getElementById('resultCanvas');
    const ctx = canvas.getContext('2d');

    if (video.videoWidth === 0 || video.videoHeight === 0) {
        alert('カメラが正しく起動していません。');
        return;
    }

    // カメラのアスペクト比を取得
    const aspectRatio = video.videoWidth / video.videoHeight;

    // 入力で指定された幅に合わせて高さを自動計算
    const widthInput = document.getElementById('canvasWidthInput');
    const targetWidth = parseInt(widthInput.value, 10);
    const targetHeight = Math.round(targetWidth / aspectRatio);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const gray = toGrayscale(imgData.data, canvas.width, canvas.height);
    const result = errorDiffusion1CH(gray, canvas.width, canvas.height);

    const outputData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < result.length; i++) {
        outputData.data[i * 4 + 0] = result[i];
        outputData.data[i * 4 + 1] = result[i];
        outputData.data[i * 4 + 2] = result[i];
        outputData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(outputData, 0, 0);

    const now = new Date();
    dateP.textContent = `Date : ${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}


function toGrayscale(array, width, height) {
    const output = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = array[i * 4];
        const g = array[i * 4 + 1];
        const b = array[i * 4 + 2];
        output[i] = (r + g + b) / 3 | 0;
    }
    return output;
}

function errorDiffusion1CH(u8array, width, height) {
    const buffer = new Int16Array(width * height).map((_, i) => u8array[i]);
    const output = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const oldPixel = buffer[idx];
            const newPixel = oldPixel >= 128 ? 255 : 0;
            const error = oldPixel - newPixel;
            output[idx] = newPixel;

            if (x + 1 < width) buffer[idx + 1] += (5 * error) / 16 | 0;
            if (x - 1 >= 0 && y + 1 < height) buffer[idx + width - 1] += (3 * error) / 16 | 0;
            if (y + 1 < height) buffer[idx + width] += (5 * error) / 16 | 0;
            if (x + 1 < width && y + 1 < height) buffer[idx + width + 1] += (3 * error) / 16 | 0;
        }
    }
    return output;
}

function printCanvas() {
    print(); // m02s_print.js にある印刷関数
}


///////////////////////
function printCanvas() {
    const originalCanvas = document.getElementById('resultCanvas');
    const dateText = document.getElementById('date').textContent;
    const placeText = document.getElementById('place').textContent;

    // 印刷用Canvas作成
    const printCanvas = document.createElement('canvas');
    const ctx = printCanvas.getContext('2d');

    // フォントサイズなど設定
    // const headerFontSize = 16;
    // const footerFontSize = 14;
    const headerFontSize = 26; // ← 上部タイトル・メッセージのフォントサイズ
    const footerFontSize = 24; // ← 下部 日付・場所のフォントサイズ
    const margin = 20;

    ctx.font = `${headerFontSize}px sans-serif`;
    const headerHeight = headerFontSize * 2 + margin;
    const footerHeight = footerFontSize * 2 + margin;

    printCanvas.width = originalCanvas.width;
    printCanvas.height = headerHeight + originalCanvas.height + footerHeight;

    // 背景を白に
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    // 上部テキスト
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = `${headerFontSize}px sans-serif`;
    ctx.fillText('Record to Memory Box', printCanvas.width / 2, headerFontSize);
    ctx.fillText('記録を記憶に', printCanvas.width / 2, headerFontSize * 2);

    // 撮影画像 (中央)
    ctx.drawImage(originalCanvas, 0, headerHeight);

    // 下部テキスト
    ctx.font = `${footerFontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(dateText, 10, headerHeight + originalCanvas.height + footerFontSize);
    ctx.fillText(placeText, 10, headerHeight + originalCanvas.height + footerFontSize * 2);

    // 印刷関数呼び出し（m02s_print.js）
    printFromCanvas(printCanvas);
}