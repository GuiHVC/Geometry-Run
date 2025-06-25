window.onload = main;

let ctx;
let width, height;
let audioBuffer = null;
let bufferSource = null;
let isPlaying = false;
let peakTimestamps = [];
let spawnIndex = 0;

const smoothingFactor = 0.8;
const variationThreshold = 0.18;
const frameSize = 512;
const hopSize = 512; 

const canvas = document.getElementById('mycanvas');
const playBtn = document.querySelector(".play");
const pauseBtn = document.querySelector(".pause");
const stopBtn = document.querySelector(".stop");

const audioCtx = new AudioContext();

function main() {
    ctx = canvas.getContext('2d');
    if (!ctx) alert("Não consegui abrir o contexto 2d :-(");

    width = canvas.width;
    height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    fetchAndAnalyzeAudio();
}

async function fetchAndAnalyzeAudio() {
    const response = await fetch("../sounds/Polargeist.mp3");
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    analyzeBuffer(audioBuffer);
}

function analyzeBuffer(buffer) {
    const rawData = buffer.getChannelData(0); // mono channel
    const sampleRate = buffer.sampleRate;

    let smoothed = 0;
    for (let i = 0; i < rawData.length; i += hopSize) {
        let sum = 0;
        for (let j = 0; j < frameSize && i + j < rawData.length; j++) {
            sum += rawData[i + j] * rawData[i + j];
        }
        const rms = Math.sqrt(sum / frameSize);

        smoothed = smoothingFactor * smoothed + (1 - smoothingFactor) * rms;
        const delta = rms - smoothed;

        if (
            delta > variationThreshold &&
            (peakTimestamps.length === 0 ||
                i / sampleRate - peakTimestamps[peakTimestamps.length - 1] > 0.15)
        ) {
            peakTimestamps.push(i / sampleRate);
        }
    }

    console.log("Detected peaks at:", peakTimestamps);
}

const obstacles = [];
const obstacleSpeed = 2; // pixels per frame

function spawnObject() {
    const size = 20;
    const x = width;
    const y = (height - size);
    obstacles.push({ x, y, size });
}

function updateObstacles() {
    // Move obstacles to the left
    for (const obs of obstacles) {
        obs.x -= obstacleSpeed;
    }

    // Remove off-screen obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].x + obstacles[i].size < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function drawObstacles() {
    ctx.clearRect(0, 0, width, height);
    for (const obs of obstacles) {
        ctx.fillStyle = "red";
        ctx.fillRect(obs.x, obs.y, obs.size, obs.size);
    }
}

function gameLoop() {
    updateObstacles();
    drawObstacles();
    if (isPlaying) {
        requestAnimationFrame(gameLoop);
    }
}

function monitorPeaks(startTime) {
    const check = () => {
        const currentTime = audioCtx.currentTime - startTime;
        while (
            spawnIndex < peakTimestamps.length &&
            peakTimestamps[spawnIndex] <= currentTime
        ) {
            spawnObject();
            spawnIndex++;
        }
        if (spawnIndex < peakTimestamps.length && isPlaying) {
            requestAnimationFrame(check);
        }
    };
    
    requestAnimationFrame(check);
}

playBtn.addEventListener("click", () => {
    if (!audioBuffer || isPlaying) return;

    bufferSource = audioCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(audioCtx.destination);

    const startTime = audioCtx.currentTime;
    bufferSource.start(startTime);
    isPlaying = true;

    spawnIndex = 0;
    ctx.clearRect(0, 0, width, height);
    monitorPeaks(startTime);
    gameLoop();

    bufferSource.onended = () => {
        isPlaying = false;
    };
});

pauseBtn.addEventListener("click", () => {
    alert("Pause is not supported with AudioBufferSourceNode. Use stop.");
});

stopBtn.addEventListener("click", () => {
    if (bufferSource && isPlaying) {
        bufferSource.stop();
        isPlaying = false;
    }
});