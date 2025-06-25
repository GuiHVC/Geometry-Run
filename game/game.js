"use strict";

import { Cilindro, Cubo, Espinho, Plano, Esfera, configureTextura, shear } from '../props/props.js';

import { Arvore, ArvoreRedonda, ArvoreComGalhos } from '../props/tree/tree.js';

// ========================================================
// GLOBAL VARIABLES & CONSTANTS
// ========================================================

var gl;
var gCanvas;
var gShader = {};
var gCtx = {
    cameraOffset: vec3(0, 4, 8)
};
var gPlayer = {};
gPlayer.shearAmount = 0;
gPlayer.shearVelocity = 0;
gPlayer.shearTarget = 0;
gPlayer.prevVelocityX = 0; // we need it to give the cube a spring like effect
var gFloor = {};
var gObstacles = [];
var gCoins = [];
var gSea = {};
var gForestPlane = {};
var gTrees = [];
var gTrunkTexture;
var gSeaFloorTexture;
var gForestFloorTexture;
var gLeafTexture;
var gCreeperTexture;
var gSteveTexture;

var gAudioCtx;
var gAudioBuffer = null;
var gBufferSource = null;
var gPeakTimestamps = [];
var gSpawnIndex = 0;
var gAudioStartTime = 0; // To track when the audio started playing
var main_menu_clicked = false;
const smoothingFactor = 0.8;
const variationThreshold = 0.18;
const frameSize = 512;
const hopSize = 512;


var gState = {
    speed: 0.3,
    isJumping: false,
    yVelocity: 0,
    gravity: -0.01,
    jumpStrength: 0.32,
    groundY: 0.75,
    time: 0,
    startTime: 0,
    timeWhenPaused: 0,
    pausedDuration: 0,
    current: 'menu', // 'menu', 'playing', 'paused', 'gameOver'
    currentLane: 1   // 0: left, 1: center, 2: right
};

const LANE_POSITIONS = [-3.5, 0, 3.5];

const LUZ = {
    pos: vec4(5.0, 10.0, 7.0, 1.0),
    amb: vec4(0.2, 0.2, 0.2, 1.0),
    dif: vec4(1.0, 1.0, 1.0, 1.0),
    esp: vec4(1.0, 1.0, 1.0, 1.0)
};

const THEME_DATA = {
    forest: { name: 'Forest', price: 0 },
    sea: { name: 'Sea', price: 10 }
};

const STYLE_DATA = {
    tree: {
        default: { name: 'Default Trees', price: 0 },
        textured: { name: 'Textured Trees', price: 25 }
    },
    cube: {
        default: { name: 'Default Cube', price: 0 },
        creeper: { name: 'Creeper Cube', price: 15 },
        steve: { name: 'Steve Cube', price: 15 },
    }
};

var gGameData = {
    coins: 0,
    themes: {
        forest: { purchased: true },
        sea: { purchased: false }
    },
    equippedTheme: 'forest',
    items: {
        tree: {
            default: { purchased: true },
            textured: { purchased: false }
        },
        cube: {
            default: { purchased: true },
            creeper: { purchased: false },
            steve: { purchased: false }
        }
    },
    equippedStyles: {
        tree: 'default',
        cube: 'default'
    }
};

// ========================================================
// MAIN PROGRAM
// ========================================================
window.onload = main;

function main() {
    gCanvas = document.getElementById("glcanvas");
    gl = gCanvas.getContext('webgl2');
    if (!gl) { alert("WebGL 2.0 not available"); return; }
    
    gCanvas.width = window.innerWidth;
    gCanvas.height = window.innerHeight;
    gl.viewport(0, 0, gCanvas.width, gCanvas.height);
    gl.clearColor(0.1, 0.0, 0.2, 1.0);
    gl.enable(gl.DEPTH_TEST);

    loadGameData();

    document.getElementById('score-display').innerText = `Coins: ${gGameData.coins}`;
    setupShaders();
    createGameObjects();
    setupEventListeners();
    
    // Initialize AudioContext
    gAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    fetchAndAnalyzeAudio(); // Call this to load and analyze the audio

    gState.startTime = Date.now();
    render();
};

async function fetchAndAnalyzeAudio() {
    const response = await fetch("../sounds/Polargeist.mp3");
    const arrayBuffer = await response.arrayBuffer();
    gAudioBuffer = await gAudioCtx.decodeAudioData(arrayBuffer);
    analyzeBuffer(gAudioBuffer);
};

function analyzeBuffer(buffer) {
    const rawData = buffer.getChannelData(0);
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
            (gPeakTimestamps.length === 0 ||
                i / sampleRate - gPeakTimestamps[gPeakTimestamps.length - 1] > 0.15)
        ) {
            gPeakTimestamps.push(i / sampleRate);
        }
    }
    console.log("Detected peaks at:", gPeakTimestamps);
};

function saveGameData() {
    localStorage.setItem('saveFile', JSON.stringify(gGameData));
}

function loadGameData() {
    const savedData = localStorage.getItem('saveFile');
    if (savedData) {
        const parsedData = JSON.parse(savedData);

        gGameData = { ...gGameData, ...parsedData };
        if (parsedData.themes) gGameData.themes = { ...gGameData.themes, ...parsedData.themes };
        if (parsedData.items) gGameData.items = { ...gGameData.items, ...parsedData.items };
        if (parsedData.equippedStyles) gGameData.equippedStyles = { ...gGameData.equippedStyles, ...parsedData.equippedStyles };
    }
}

function setupEventListeners() {
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            togglePause();
        }

        if (gState.current !== 'playing') return;

        if (event.code === 'Space' && !gState.isJumping) {
            gState.isJumping = true;
            gState.yVelocity = gState.jumpStrength;
        }
        
        if (!gState.isJumping) {
            // Move right (D key)
            if (event.key === 'd' || event.key === 'D') {
                if (gState.currentLane < 2) { // Cannot move right if in the rightmost lane
                    gState.currentLane++;
                }
            }
            
            // Move left (A key)
            if (event.key === 'a' || event.key === 'A') {
                if (gState.currentLane > 0) { // Cannot move left if in the leftmost lane
                    gState.currentLane--;
                }
            }
        }
    });

    window.addEventListener('resize', () => {
        gCanvas.width = window.innerWidth;
        gCanvas.height = window.innerHeight;
        gl.viewport(0, 0, gCanvas.width, gCanvas.height);
        const aspect = gCanvas.width / gCanvas.height;
        gCtx.perspective = perspective(60, aspect, 0.1, 1000);
        gl.uniformMatrix4fv(gShader.uPerspective, false, flatten(gCtx.perspective));
    });
    
    document.getElementById('play-button').onclick = startGame;
    document.getElementById('shop-button').onclick = () => {
        document.getElementById('menu-overlay').classList.add('hidden');
        document.getElementById('shop-overlay').classList.remove('hidden');
        document.getElementById('score-display').classList.add('hidden');
        gState.current = 'shop';
        populateShop();
    };
    document.getElementById('exit-button').onclick = () => {
         document.getElementById('menu-overlay').innerHTML = `<h1>Thanks for playing!</h1>`;
         document.getElementById('score-display').classList.add('hidden');
    };

    document.getElementById('back-to-menu-button').onclick = () => {
        document.getElementById('shop-overlay').classList.add('hidden');
        document.getElementById('menu-overlay').classList.remove('hidden');
        document.getElementById('score-display').classList.remove('hidden');
        gState.current = 'menu';
    };

    document.getElementById('restart-button').onclick = () => {
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('score-display').classList.remove('hidden');
        resetGame();
        gState.current = 'playing';
    };
    
    document.getElementById('main-menu-button').onclick = () => {
        document.getElementById('game-over-overlay').classList.add('hidden');
        document.getElementById('menu-overlay').classList.remove('hidden');
        document.getElementById('score-display').classList.remove('hidden');
        main_menu_clicked = true;
        resetGame();
        gState.current = 'menu';
        main_menu_clicked = false;
    };
}

function togglePause() {
    if (gState.current === 'playing') {
        gState.timeWhenPaused = Date.now();
        gState.current = 'paused';
        document.getElementById('pause-overlay').classList.remove('hidden');
        if (gBufferSource) {
            // Stop the audio when paused. Note: AudioBufferSourceNode cannot be truly paused.
            // We'll restart it from the correct time when unpausing.
            gBufferSource.stop();
            gBufferSource = null; // Clear the source
        }
    } else if (gState.current === 'paused') {
        gState.pausedDuration += Date.now() - gState.timeWhenPaused;
        gState.current = 'playing';
        document.getElementById('pause-overlay').classList.add('hidden');
        // Resume audio from where it left off
        if (gAudioBuffer) {
            gBufferSource = gAudioCtx.createBufferSource();
            gBufferSource.buffer = gAudioBuffer;
            gBufferSource.connect(gAudioCtx.destination);
            const offset = gAudioCtx.currentTime - gAudioStartTime;
            gBufferSource.start(0, offset); // Start from the offset
        }
    }
}

function startGame() {
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('instructions').style.opacity = '1';
    document.getElementById('score-display').style.display = 'block';
    resetGame();
    gState.current = 'playing';
    // Start audio playback when the game starts
    if (gAudioBuffer) {
        if (gBufferSource) { // If a previous source exists (e.g., from menu rotation), stop it
            gBufferSource.stop();
            gBufferSource = null;
        }
        gBufferSource = gAudioCtx.createBufferSource();
        gBufferSource.buffer = gAudioBuffer;
        gBufferSource.connect(gAudioCtx.destination);
        gAudioStartTime = gAudioCtx.currentTime; // Record the start time
        gBufferSource.start(0);
        gSpawnIndex = 0; // Reset spawn index for obstacles
    }
}

function resetGame() {
    gState.currentLane = 1;
    
    gPlayer.pos = vec3(LANE_POSITIONS[gState.currentLane], gState.groundY, 0);
    gPlayer.rotation = 0;
    gPlayer.shearAmount = 0;
    gPlayer.shearVelocity = 0;
    gPlayer.prevVelocityX = 0;
    gPlayer.lastSpawnTime = null;

    gCtx.cameraOffset = vec3(0, 4, 8);

    // Reset obstacle positions
    for (let i = 0; i < gObstacles.length; i++) {
        const randomLane = LANE_POSITIONS[Math.floor(Math.random() * 3)];
        gObstacles[i].pos = vec3(randomLane, 0.5, -20 - (i * 15));
    }
    
    for (let i = 0; i < gCoins.length; i++) {
        const coin = gCoins[i];
        const zPos = -30 - (i * 20);
        const availableLaneX = findAvailableLane(zPos);

        if (availableLaneX !== null) {
            coin.pos = vec3(availableLaneX, coin.baseY, zPos);
        } else {
            coin.pos = vec3(0, -100, 0); 
        }
    }

    for (let i = 0; i < gTrees.length; i++) {
        const tree = gTrees[i];
        const side = Math.random() < 0.5 ? -1 : 1;
        const xPos = side * (gFloor.scale[0] / 2 + 7 + Math.random() * 20);
        const zPos = -40 - (i * 20 + Math.random() * 15);
        tree.pos = vec3(xPos, 1.5, zPos);
    }

    gState.isJumping = false;
    gState.yVelocity = 0;
    gState.startTime = Date.now();
    gState.pausedDuration = 0;
    
    document.getElementById('score-display').innerText = `Coins: ${gGameData.coins}`;
    const instructions = document.getElementById('instructions');
    instructions.style.display = 'block';
    document.getElementById('pause-overlay').classList.add('hidden');

    // Reset audio context if suspended
    if (gAudioCtx.state === 'suspended') {
        gAudioCtx.resume();
    }

    // Stop previous audio buffer if any
    if (gBufferSource) {
        try { gBufferSource.stop(); } catch (e) {}
        gBufferSource = null;
    }

    // Create new audio buffer source
    if (!main_menu_clicked) {
        gBufferSource = gAudioCtx.createBufferSource();
        gBufferSource.buffer = gAudioBuffer;
        gBufferSource.connect(gAudioCtx.destination);
        gAudioStartTime = gAudioCtx.currentTime;
        gBufferSource.start();
    }
    gSpawnIndex = 0;
}

function populateShop() {
    const shopGrid = document.getElementById('shop-grid');
    shopGrid.innerHTML = '';
    document.getElementById('coin-display-shop').innerText = `Coins: ${gGameData.coins}`;


    for (const themeId in THEME_DATA) {
        const theme = THEME_DATA[themeId];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        let buttonHtml;

        if (gGameData.themes[themeId].purchased) {
            if (gGameData.equippedTheme === themeId) {
                buttonHtml = `<button class="buy-button equipped" disabled>Equipped</button>`;
            } else {
                buttonHtml = `<button class="buy-button purchased">Equip</button>`;
                itemDiv.onclick = () => handleEquipTheme(themeId);
            }
        } else {
            const canAfford = gGameData.coins >= theme.price;
            buttonHtml = `<button class="buy-button" ${!canAfford ? 'disabled' : ''}>Buy</button>`;
            itemDiv.onclick = () => handleBuyTheme(themeId);
        }
        itemDiv.innerHTML = `
            <div class="item-name">${theme.name}</div>
            <div class="item-price">Price: ${theme.price} Coins</div>
            ${buttonHtml}
        `;
        shopGrid.appendChild(itemDiv);
    }


    for (const styleGroup in STYLE_DATA) {
        for (const styleId in STYLE_DATA[styleGroup]) {
            const style = STYLE_DATA[styleGroup][styleId];
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            let buttonHtml;

            if (gGameData.items[styleGroup][styleId].purchased) {
                if (gGameData.equippedStyles[styleGroup] === styleId) {
                     buttonHtml = `<button class="buy-button equipped" disabled>Equipped</button>`;
                } else {
                     buttonHtml = `<button class="buy-button purchased">Equip</button>`;
                     itemDiv.onclick = () => handleEquipStyle(styleGroup, styleId);
                }
            } else {
                const canAfford = gGameData.coins >= style.price;
                buttonHtml = `<button class="buy-button" ${!canAfford ? 'disabled' : ''}>Buy</button>`;
                itemDiv.onclick = () => handleBuyStyle(styleGroup, styleId);
            }
            itemDiv.innerHTML = `
                <div class="item-name">${style.name}</div>
                <div class="item-price">Price: ${style.price} Coins</div>
                ${buttonHtml}
            `;
            shopGrid.appendChild(itemDiv);
        }
    }
}

function handleBuyTheme(themeId) {
    const theme = THEME_DATA[themeId];
    if (gGameData.coins >= theme.price) {
        gGameData.coins -= theme.price;
        gGameData.themes[themeId].purchased = true;
        saveGameData();
        populateShop();
    }
}

function handleEquipTheme(themeId) {
    gGameData.equippedTheme = themeId;
    saveGameData();
    populateShop();
}

function handleBuyStyle(styleGroup, styleId) {
    const style = STYLE_DATA[styleGroup][styleId];
    if (gGameData.coins >= style.price) {
        gGameData.coins -= style.price;
        gGameData.items[styleGroup][styleId].purchased = true;
        saveGameData();
        populateShop();
    }
}

function handleEquipStyle(styleGroup, styleId) {
    gGameData.equippedStyles[styleGroup] = styleId;
    saveGameData();
    populateShop();
}

/**
 * Checks for obstacles near a given Z-position and returns an available lane's X-coordinate.
 * @param {number} zPos The Z-position to check around.
 * @param {number} safeDistance The minimum distance from an obstacle on the Z-axis.
 * @returns {number|null} The X-coordinate of a free lane, or null if no lanes are free.
 */
function findAvailableLane(zPos, safeDistance = 5.0) {
    let availableLanes = [0, 1, 2];
    for (const obstacle of gObstacles) {
        if (Math.abs(obstacle.pos[2] - zPos) < safeDistance) {
            const obstacleLaneIndex = LANE_POSITIONS.indexOf(obstacle.pos[0]);
            if (obstacleLaneIndex !== -1) {
                availableLanes = availableLanes.filter(laneIndex => laneIndex !== obstacleLaneIndex);
            }
        }
    }
    if (availableLanes.length > 0) {
        const randomLaneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        return LANE_POSITIONS[randomLaneIndex];
    }
    return null; // No available lane found
}

function setupShaders() {
    gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
    gl.useProgram(gShader.program);

    const getLoc = (name) => gl.getUniformLocation(gShader.program, name);
    gShader.uModel = getLoc("uModel");
    gShader.uView = getLoc("uView");
    gShader.uPerspective = getLoc("uPerspective");
    gShader.uInverseTranspose = getLoc("uInverseTranspose");
    gShader.uCorAmb = getLoc("uCorAmbiente");
    gShader.uCorDif = getLoc("uCorDifusao");
    gShader.uCorEsp = getLoc("uCorEspecular");
    gShader.uAlfaEsp = getLoc("uAlfaEsp");
    gShader.uTime = getLoc("uTime");
    gShader.uIsSea = getLoc("uIsSea");
    gShader.uRoadWidth = getLoc("uRoadWidth");
    gShader.uLuzPos = getLoc("uLuzPos");
    gShader.uUseTexture = getLoc("uUseTexture");
    gShader.uTextureMap = getLoc("uTextureMap");
    
    const aspect = gCanvas.width / gCanvas.height;
    gCtx.perspective = perspective(60, aspect, 0.1, 1000);
    gl.uniformMatrix4fv(gShader.uPerspective, false, flatten(gCtx.perspective));
}

function createGameObjects() {
    const makeMaterial = (amb, dif, alfa = 200.0) => ({
        amb: mult(LUZ.amb, amb), 
        dif: mult(LUZ.dif, dif),
        esp: mult(LUZ.esp, vec4(1,1,1,1)), 
        alfa: alfa
    });

    gTrunkTexture = configureTextura(gl, '../props/textures/trunk.png');
    gLeafTexture = configureTextura(gl, '../props/textures/leaves.jpg');
    gCreeperTexture = configureTextura(gl, '../props/textures/creeper.png');
    gSeaFloorTexture = configureTextura(gl, '../props/textures/ocean_floor.jpg');
    gForestFloorTexture = configureTextura(gl, '../props/textures/forest_floor.png');
    gSteveTexture = configureTextura(gl, '../props/textures/steve.jpg');

    // Player
    gPlayer = {
        geom: new Cubo(),
        mat: makeMaterial(vec4(1.0, 0.2, 0.8, 1.0), vec4(1.0, 0.2, 0.8, 1.0)),
        pos: vec3(LANE_POSITIONS[gState.currentLane], gState.groundY, 0),
        scale: vec3(1.5, 1.5, 1.5),
        rotation: 0
    };
    gPlayer.geom.init();

    // Floor
    gFloor = {
        geom: new Cubo(),
        mat: makeMaterial(vec4(0.2, 0.1, 0.3, 1.0), vec4(0.2, 0.1, 0.3, 1.0), 1000.0),
        pos: vec3(0, -0.1, 0),
        scale: vec3(10, 0.2, 200),
    };
    gFloor.geom.init();

    // Obstacles
    const obstacleMat = makeMaterial(vec4(0.5, 0.5, 0.5, 1.0), vec4(0.5, 0.5, 0.5, 1.0));
    for (let i = 0; i < 30; i++) {
        const spikeGeom = new Espinho(6);
        spikeGeom.init();
        const randomLane = LANE_POSITIONS[Math.floor(Math.random() * 3)];
        gObstacles.push({
            geom: spikeGeom,
            mat: obstacleMat,
            pos: vec3(randomLane, 0.5, -20 - (i * 15)),
            scale: vec3(2, 2, 2),
            rotation: 0
        });
    }
    
    // Coins
    const coinMat = makeMaterial(vec4(1.0, 0.84, 0.0, 1.0), vec4(1.0, 0.84, 0.0, 1.0));
    for (let i = 0; i < 20; i++) {
        const baseY = gState.groundY + 0.5;
        const zPos = -30 - (i * 20);
        const availableLaneX = findAvailableLane(zPos);

        if (availableLaneX !== null) {
            const coinGeom = new Cilindro(6);
            coinGeom.init();
            gCoins.push({
                geom: coinGeom,
                mat: coinMat,
                baseY: baseY,
                pos: vec3(availableLaneX, baseY, zPos),
                scale: vec3(1.0, 0.2, 1.0),
                rotation: 0,
                rotationAxis: 'z'
            });
        }
    }

    // Sea
    gSea = {
        geom: new Plano(150, 150, 50),
        mat: makeMaterial(vec4(0.1, 0.3, 0.7, 1.0), vec4(0.1, 0.3, 0.7, 1.0)),
        pos: vec3(0, -0.3, 0)
    };

    // Forest
    gForestPlane = {
        geom: new Plano(150, 150, 50),
        mat: makeMaterial(vec4(0.1, 0.4, 0.2, 1.0), vec4(0.1, 0.4, 0.2, 1.0)), // A dark green material
        pos: vec3(0, -0.5, 0) // Position it at the same level as the sea
    };

    const createVAO = (geometry) => {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // Position Buffer
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.pos), gl.STATIC_DRAW);
        const aPosition = gl.getAttribLocation(gShader.program, "aPosition");
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aPosition);

        // Normal Buffer
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.nor), gl.STATIC_DRAW);
        const aNormal = gl.getAttribLocation(gShader.program, "aNormal");
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aNormal);

        // Texture Buffer
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.tex), gl.STATIC_DRAW);
        const aTexCoord = gl.getAttribLocation(gShader.program, "aTexCoord");
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aTexCoord);

        gl.bindVertexArray(null);
        return vao;
    };

    gShader.cubeVao = createVAO(gPlayer.geom);
    gShader.spikeVao = createVAO(gObstacles[0].geom);
    gShader.coinVao = createVAO(gCoins[0].geom);
    gShader.seaVao = createVAO(gSea.geom);
    gShader.planeVao = createVAO(gForestPlane.geom);
    gShader.treeTrunkVao = createVAO(new Cilindro(8));
    gShader.pointyLeafVao = createVAO(new Espinho(8));
    gShader.roundLeafVao = createVAO(new Esfera(4));

    const trunkMat = makeMaterial(vec4(0.4, 0.2, 0.1, 1.0), vec4(0.4, 0.2, 0.1, 1.0));
    const pointyLeafMat = makeMaterial(vec4(0.0, 0.5, 0.1, 1.0), vec4(0.0, 0.5, 0.1, 1.0));
    const roundLeafMat = makeMaterial(vec4(0.1, 0.6, 0.2, 1.0), vec4(0.1, 0.6, 0.2, 1.0));

    const treeTypes = [Arvore, ArvoreRedonda, ArvoreComGalhos];
    const numTrees = 30;

    for (let i = 0; i < numTrees; i++) {
        const TreeClass = treeTypes[Math.floor(Math.random() * treeTypes.length)];
        
        const side = Math.random() < 0.5 ? -1 : 1;
        const xPos = side * (gFloor.scale[0] / 2 + 7 + Math.random() * 20);
        const zPos = -40 - (i * 20 + Math.random() * 15);

        gTrees.push({
            instance: new TreeClass(),
            pos: vec3(xPos, 1.5, zPos),
            trunkMat: trunkMat,
            pointyLeafMat: pointyLeafMat,
            roundLeafMat: roundLeafMat,
            type: TreeClass.name
        });
    }
}

function update() {
    if (gState.current === 'paused' || gState.current === 'gameOver') return;

    gState.time = (Date.now() - gState.startTime - gState.pausedDuration) / 1000.0;

    if (gState.current === 'menu' || gState.current === 'shop') {
        const rotationMatrix = rotateY(0.2);
        const offsetVec4 = vec4(gCtx.cameraOffset[0], gCtx.cameraOffset[1], gCtx.cameraOffset[2], 0);
        const rotatedOffset = mult(rotationMatrix, offsetVec4);
        gCtx.cameraOffset = vec3(rotatedOffset[0], rotatedOffset[1], rotatedOffset[2]);
        gPlayer.rotation += 0.5;
        return;
    }

    const targetX = LANE_POSITIONS[gState.currentLane];
    const lerpSpeed = 0.25;
    const prevX = gPlayer.pos[0];
    gPlayer.pos[0] += (targetX - gPlayer.pos[0]) * lerpSpeed;

    const currentVelocityX = gPlayer.pos[0] - prevX;
    const accelerationX = currentVelocityX - (gPlayer.prevVelocityX || 0);
    gPlayer.prevVelocityX = currentVelocityX;

    const springStiffness = 0.5;
    const springDamping = 0.55;
    const externalForceMultiplier = 1.0;

    const springForce = -springStiffness * gPlayer.shearAmount;
    const dampingForce = -springDamping * gPlayer.shearVelocity;
    const externalForce = -accelerationX * externalForceMultiplier;
    gPlayer.shearVelocity += springForce + dampingForce + externalForce;
    gPlayer.shearAmount += gPlayer.shearVelocity;
    
    gPlayer.pos[2] -= gState.speed;

    if (gState.isJumping) {
        gPlayer.pos[1] += gState.yVelocity;
        gState.yVelocity += gState.gravity;
        gPlayer.rotation += 5;

        if (gPlayer.pos[1] <= gState.groundY) {
            gPlayer.pos[1] = gState.groundY;
            gState.isJumping = false;
            gState.yVelocity = 0;
            gPlayer.rotation = 0;
        }
    }
    
    const travelDistance = 20;
    const currentTimeInAudio = gAudioCtx.currentTime - gAudioStartTime;

    if (
        gSpawnIndex < gPeakTimestamps.length &&
        gPeakTimestamps[gSpawnIndex] - 1.0 <= currentTimeInAudio
    ) {
        if (!gPlayer.lastSpawnTime || (currentTimeInAudio - gPlayer.lastSpawnTime > 0.5)) {
            const newZPos = gPlayer.pos[2] - travelDistance;

            const sortedObstacles = [...gObstacles].sort((a, b) => b.pos[2] - a.pos[2]);

            for (let i = 0; i < 3; i++) {
                if (i < sortedObstacles.length) {
                    let obstacleToRecycle = sortedObstacles[i];
                    const laneX = LANE_POSITIONS[i];
                    obstacleToRecycle.pos = vec3(laneX, 0.5, newZPos);
                }
            }

            gPlayer.lastSpawnTime = currentTimeInAudio;
        }
        gSpawnIndex++;
    }
    // Continue moving existing obstacles towards the player
    for (const obstacle of gObstacles) {
        obstacle.pos[2] += gState.speed * 0.1;
    }


    const floatAmplitude = 0.25;
    const floatFrequency = 3.0;
    for (const coin of gCoins) {
        coin.rotation += 3;
        coin.pos[1] = coin.baseY + Math.sin(gState.time * floatFrequency + coin.pos[2]) * floatAmplitude;

        if (coin.pos[2] > gPlayer.pos[2] + gCtx.cameraOffset[2] || coin.pos[1] < -50) {
            const newZ = gPlayer.pos[2] - (gCoins.length * 10 + Math.random() * 10);
            const newX = findAvailableLane(newZ);
            if (newX !== null) {
                coin.pos[0] = newX;
                coin.pos[2] = newZ;
                coin.pos[1] = coin.baseY;
            } else {
                coin.pos[1] = -100;
            }
        }
    }

    for (const tree of gTrees) {
        if (tree.pos[2] > gPlayer.pos[2] + gCtx.cameraOffset[2]) {
            tree.pos[2] -= gTrees.length * 20 + Math.random() * 15;
            const side = Math.random() < 0.5 ? -1 : 1;
            tree.pos[0] = side * (gFloor.scale[0] / 2 + 7 + Math.random() * 20);
        }
    }

    checkCollisions();
    checkCoinCollisions();
}

function checkCollisions() {
    const getBoundingBox = (gameObject) => {
        const halfScale = scale(0.5, gameObject.scale);
        return {
            min: subtract(gameObject.pos, halfScale),
            max: add(gameObject.pos, halfScale)
        };
    };

    const playerBox = getBoundingBox(gPlayer);
    for (const obstacle of gObstacles) {
        const obstacleBox = getBoundingBox(obstacle);
        if (playerBox.max[0] > obstacleBox.min[0] && playerBox.min[0] < obstacleBox.max[0] &&
            playerBox.max[1] > obstacleBox.min[1] && playerBox.min[1] < obstacleBox.max[1] &&
            playerBox.max[2] > obstacleBox.min[2] && playerBox.min[2] < obstacleBox.max[2]) {
            
            gState.current = 'gameOver';
            document.getElementById('instructions').classList.add('hidden');
            document.getElementById('final-score').innerText = `You have ${gGameData.coins} coins!`;
            document.getElementById('score-display').classList.add('hidden');
            document.getElementById('game-over-overlay').classList.remove('hidden');
            
            // Stop audio when game is over
            if (gBufferSource) {
                gBufferSource.stop();
                gBufferSource = null;
            }
            break; 
        }
    }
}

function checkCoinCollisions() {
    const getBoundingBox = (gameObject) => {
        const halfScale = scale(0.5, gameObject.scale);
        return {
            min: subtract(gameObject.pos, halfScale),
            max: add(gameObject.pos, halfScale)
        };
    };

    const playerBox = getBoundingBox(gPlayer);
    for (const coin of gCoins) {
        const coinBox = getBoundingBox(coin);
        if (playerBox.max[0] > coinBox.min[0] && playerBox.min[0] < coinBox.max[0] &&
            playerBox.max[1] > coinBox.min[1] && playerBox.min[1] < coinBox.max[1] &&
            playerBox.max[2] > coinBox.min[2] && playerBox.min[2] < coinBox.max[2]) {
            
            gGameData.coins++;
            saveGameData();
            document.getElementById('score-display').innerText = `Coins: ${gGameData.coins}`;
            
            coin.pos[2] -= gCoins.length * 20; 
        }
    }
}

function render() {
    update();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = (gState.current === 'menu' || gState.current === 'shop') ? gCtx.cameraOffset : add(gPlayer.pos, gCtx.cameraOffset);
    const at = (gState.current === 'menu' || gState.current === 'shop') ? vec3(0,0,0) : gPlayer.pos;
    gCtx.view = lookAt(eye, at, vec3(0,1,0));
    gl.uniformMatrix4fv(gShader.uView, false, flatten(gCtx.view));

    const lightWorldPos = vec4(5.0, 10.0, (gState.current === 'menu' ? 0.0 : gPlayer.pos[2]) + 7.0, 1.0);
    const lightViewPos = mult(gCtx.view, lightWorldPos);
    gl.uniform4fv(gShader.uLuzPos, flatten(lightViewPos));

    gl.uniform1f(gShader.uTime, gState.time);
    gl.uniform1f(gShader.uRoadWidth, gFloor.scale[0]);

    const drawObject = (obj, vao, texture, isSea = false) => {
        gl.bindVertexArray(vao);
        gl.uniform4fv(gShader.uCorAmb, flatten(obj.mat.amb));
        gl.uniform4fv(gShader.uCorDif, flatten(obj.mat.dif));
        gl.uniform4fv(gShader.uCorEsp, flatten(obj.mat.esp));
        gl.uniform1f(gShader.uAlfaEsp, obj.mat.alfa);
        gl.uniform1i(gShader.uIsSea, isSea);

        // Centralized texture handling
        if (texture) {
            gl.uniform1i(gShader.uUseTexture, 1);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(gShader.uTextureMap, 0);
        } else {
            gl.uniform1i(gShader.uUseTexture, 0);
        }


        let scaleMatrix = mat4();
        let shearMatrix = mat4();
        let rotationMatrix = mat4();
        let fixedRotationMatrix = mat4(); // Rotação especial para as moedas (cilindro deitado)

        if (obj.scale) {
            scaleMatrix = scale(obj.scale[0], obj.scale[1], obj.scale[2]);
        }

        if (obj === gPlayer && Math.abs(gPlayer.shearAmount) > 0.001) {
            shearMatrix = mat4(...shear('yz', gPlayer.shearAmount, 0));
        }

        if (obj.rotationAxis) {
            fixedRotationMatrix = rotate(-90, 1, 0, 0);
        }
        if (obj.rotation || obj.rotation === 0) {
            let axis = vec3(1, 0, 0);
            if (obj.rotationAxis === 'y') axis = vec3(0, 1, 0);
            if (obj.rotationAxis === 'z') axis = vec3(0, 0, 1);
            rotationMatrix = rotate(obj.rotation, axis);
        }

        let localMatrix = mult(fixedRotationMatrix, rotationMatrix);
        localMatrix = mult(localMatrix, shearMatrix);
        localMatrix = mult(localMatrix, scaleMatrix);

        const translateMatrix = translate(obj.pos[0], obj.pos[1], obj.pos[2]);

        const model = mult(translateMatrix, localMatrix);

        gl.uniformMatrix4fv(gShader.uModel, false, flatten(model));
        const modelView = mult(gCtx.view, model);
        gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(modelView))));
        gl.drawArrays(gl.TRIANGLES, 0, obj.geom.np);
    };

    const drawPlayer = () => {
        const equippedStyle = gGameData.equippedStyles.cube;

        let textureObject = null;

        switch (equippedStyle) {
            case 'creeper':
                textureObject = gCreeperTexture;
                break;
            case 'steve':
                textureObject = gSteveTexture;
                break;
        }
        drawObject(gPlayer, gShader.cubeVao, textureObject);

    };

    if (gState.current === 'menu' || gState.current === 'shop') {
        drawPlayer();
    } else {
        
        drawPlayer();
        
        gFloor.pos[2] = gPlayer.pos[2];
        drawObject(gFloor, gShader.cubeVao, null);

        const maxDrawDistance = 65;

        if (gGameData.equippedTheme === 'sea') {
            gSea.pos[2] = gPlayer.pos[2];
            drawObject(gSea, gShader.seaVao, gSeaFloorTexture, true);
        } else {
            gForestPlane.pos[2] = gPlayer.pos[2];
            drawObject(gForestPlane, gShader.planeVao, gForestFloorTexture, false);

            gTrees.forEach(tree => {
                const baseModel = translate(tree.pos[0], tree.pos[1], tree.pos[2]);
                if (Math.abs(tree.pos[2] - gPlayer.pos[2]) > maxDrawDistance) return;
                let materials;
                let useTextures;

                if (gGameData.equippedStyles.tree === 'textured') {
                    useTextures = true;
                    materials = {
                        trunk: gTrunkTexture,
                        leaves: gLeafTexture,
                        pointyLeaves: gLeafTexture, 
                        roundLeaves: gLeafTexture
                    };
                } else {
                    useTextures = false;
                    materials = {
                        trunk: tree.trunkMat,
                        leaves: tree.pointyLeafMat,
                        pointyLeaves: tree.pointyLeafMat,
                        roundLeaves: tree.roundLeafMat
                    };
                }
                
                tree.instance.render(gl, gShader, gCtx, baseModel, materials, useTextures);
            });
        }

        gObstacles.forEach(obs => {
            if (Math.abs(obs.pos[2] - gPlayer.pos[2]) < maxDrawDistance) {
                drawObject(obs, gShader.spikeVao, null);
            }
        });
        
        gCoins.forEach(coin => {
            if (Math.abs(coin.pos[2] - gPlayer.pos[2]) < maxDrawDistance) {
                drawObject(coin, gShader.coinVao, null);
            }
        });
    }

    requestAnimationFrame(render);
}

// ========================================================
// SHADERS
// ========================================================

const gVertexShaderSrc = `#version 300 es
    in vec4 aPosition;
    in vec3 aNormal;
    in vec2 aTexCoord;

    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uPerspective;
    uniform mat4 uInverseTranspose;
    uniform vec4 uLuzPos;
    uniform float uTime;
    uniform float uRoadWidth;
    uniform bool uIsSea;

    out vec3 vNormal;
    out vec3 vLight;
    out vec3 vView;
    out vec2 vTexCoord;

    void main() {
        vec4 worldPos = uModel * aPosition;
        vec4 modifiedPos = aPosition;

        if (uIsSea) {
            if (worldPos.x < -uRoadWidth / 2.0 || worldPos.x > uRoadWidth / 2.0) {
                float wave1 = 0.8 * sin(worldPos.x * 0.5 + uTime * 2.0);
                float wave2 = 0.4 * sin(worldPos.z * 0.8 + uTime * 3.0);
                modifiedPos.y += wave1 + wave2;
            }
        }

        mat4 modelView = uView * uModel;
        gl_Position = uPerspective * modelView * modifiedPos;
        
        vNormal = mat3(uInverseTranspose) * aNormal;
        vec4 pos = modelView * modifiedPos;
        vLight = (uLuzPos - pos).xyz;
        vView = -pos.xyz;
        vTexCoord = aTexCoord;
    }
`;

const gFragmentShaderSrc = `#version 300 es
    precision highp float;
    in vec3 vNormal;
    in vec3 vLight;
    in vec3 vView;
    in vec2 vTexCoord;

    out vec4 corSaida;

    uniform vec4 uCorAmbiente;
    uniform vec4 uCorDifusao;
    uniform vec4 uCorEspecular;
    uniform float uAlfaEsp;
    
    uniform bool uUseTexture;
    uniform sampler2D uTextureMap;

    void main() {
        vec4 baseColor = uUseTexture ? texture(uTextureMap, vTexCoord) : uCorDifusao;

        vec3 L = normalize(vLight);
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vView);
        vec3 H = normalize(L + V);

        vec4 ambient = uCorAmbiente * baseColor;

        float kd = max(dot(L, N), 0.0);
        vec4 diffuse = kd * baseColor;

        float ks = (kd > 0.0) ? pow(max(dot(N, H), 0.0), uAlfaEsp) : 0.0;
        vec4 specular = ks * uCorEspecular;

        corSaida = ambient + diffuse + specular;
        corSaida.a = baseColor.a;
    }
`;