"use strict";

// Import geometry classes from the external props.js file
// Note: Ensure the path to 'props.js' is correct for your project structure.
import { Cilindro, Cubo, Espinho, Plano } from '../props/props.js';

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
var gFloor = {};
var gObstacles = [];
var gCoins = [];
var gSea = {};
var gScore = {
    coins: 0
};

// Game state management
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

// Define the X-coordinates for the three lanes
const LANE_POSITIONS = [-3.5, 0, 3.5];

// Lighting properties
const LUZ = {
    pos: vec4(5.0, 10.0, 7.0, 1.0),
    amb: vec4(0.1, 0.0, 0.2, 1.0),
    dif: vec4(1.0, 1.0, 1.0, 1.0),
    esp: vec4(1.0, 1.0, 1.0, 1.0)
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

    setupShaders();
    createGameObjects();
    setupEventListeners();
    
    gState.startTime = Date.now();
    render();
}

function setupEventListeners() {
    window.addEventListener('keydown', (event) => {
        // Handle global key presses like pausing
        if (event.key === 'Escape') {
            togglePause();
        }

        // The following controls only work when the game is actively playing
        if (gState.current !== 'playing') return;

        if (event.code === 'Space' && !gState.isJumping) {
            gState.isJumping = true;
            gState.yVelocity = gState.jumpStrength;
        }
        
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
    document.getElementById('exit-button').onclick = () => {
         document.getElementById('menu-overlay').innerHTML = `<h1>Thanks for playing!</h1>`;
    };

    document.getElementById('restart-button').onclick = () => {
        document.getElementById('game-over-overlay').style.display = 'none';
        resetGame();
        gState.current = 'playing'; // Set state to playing after reset
    };
    
    document.getElementById('main-menu-button').onclick = () => {
        document.getElementById('game-over-overlay').style.display = 'none';
        document.getElementById('menu-overlay').style.display = 'flex';
        resetGame(); // Reset the game elements
        gState.current = 'menu'; // Set state to menu
    };
}

function togglePause() {
    if (gState.current === 'playing') {
        gState.timeWhenPaused = Date.now();
        gState.current = 'paused';
        document.getElementById('pause-overlay').style.display = 'flex';
    } else if (gState.current === 'paused') {
        gState.pausedDuration += Date.now() - gState.timeWhenPaused;
        gState.current = 'playing';
        document.getElementById('pause-overlay').style.display = 'none';
    }
}

function startGame() {
    document.getElementById('menu-overlay').style.display = 'none';
    document.getElementById('instructions').style.opacity = '1';
    document.getElementById('score-display').style.display = 'block';
    resetGame();
    gState.current = 'playing';
}

function resetGame() {
    gState.currentLane = 1; // Reset player to the center lane
    
    gPlayer.pos = vec3(LANE_POSITIONS[gState.currentLane], gState.groundY, 0);
    gPlayer.rotation = 0;
    
    // Always reset the camera offset to its default position when a game is reset
    gCtx.cameraOffset = vec3(0, 4, 8);

    // Reposition obstacles into one of the three lanes
    for (let i = 0; i < gObstacles.length; i++) {
        const randomLane = LANE_POSITIONS[Math.floor(Math.random() * 3)];
        gObstacles[i].pos = vec3(randomLane, 0.5, -20 - (i * 15));
    }
    
    // Reposition coins into one of the three lanes
    for (let i = 0; i < gCoins.length; i++) {
        const coin = gCoins[i];
        const randomLane = LANE_POSITIONS[Math.floor(Math.random() * 3)];
        coin.pos = vec3(randomLane, coin.baseY, -30 - (i * 20));
    }

    gState.isJumping = false;
    gState.yVelocity = 0;
    gState.startTime = Date.now();
    gState.pausedDuration = 0;
    
    document.getElementById('score-display').innerText = `Coins: ${gScore.coins}`;
    const instructions = document.getElementById('instructions');
    instructions.style.display = 'block';
    document.getElementById('pause-overlay').style.display = 'none';
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
    const obstacleMat = makeMaterial(vec4(0.2, 0.8, 1.0, 1.0), vec4(0.2, 0.8, 1.0, 1.0));
    for (let i = 0; i < 30; i++) {
        const spikeGeom = new Espinho();
        spikeGeom.init();
        const randomLane = LANE_POSITIONS[Math.floor(Math.random() * 3)];
        gObstacles.push({
            geom: spikeGeom,
            mat: obstacleMat,
            pos: vec3(randomLane, 0.5, -20 - (i * 15)),
            scale: vec3(1, 1, 1),
            rotation: 0
        });
    }
    
    // Coins
    const coinMat = makeMaterial(vec4(1.0, 0.84, 0.0, 1.0), vec4(1.0, 0.84, 0.0, 1.0));
    for (let i = 0; i < 20; i++) {
        const coinGeom = new Cilindro(6);
        coinGeom.init();
        const baseY = gState.groundY + 0.5;
        const randomLane = LANE_POSITIONS[Math.floor(Math.random() * 3)];
        gCoins.push({
            geom: coinGeom,
            mat: coinMat,
            baseY: baseY,
            pos: vec3(randomLane, baseY, -30 - (i * 20)),
            scale: vec3(0.5, 0.1, 0.5),
            rotation: 0,
            rotationAxis: 'z'
        });
    }

    // Sea
    gSea = {
        geom: new Plano(150, 150, 50),
        mat: makeMaterial(vec4(0.1, 0.3, 0.7, 1.0), vec4(0.1, 0.3, 0.7, 1.0)),
        pos: vec3(0, -1, 0)
    };

    const createVAO = (geometry) => {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.pos), gl.STATIC_DRAW);
        const aPosition = gl.getAttribLocation(gShader.program, "aPosition");
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aPosition);
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.nor), gl.STATIC_DRAW);
        const aNormal = gl.getAttribLocation(gShader.program, "aNormal");
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aNormal);
        gl.bindVertexArray(null);
        return vao;
    };

    gShader.cubeVao = createVAO(gPlayer.geom);
    gShader.spikeVao = createVAO(gObstacles[0].geom);
    gShader.coinVao = createVAO(gCoins[0].geom);
    gShader.seaVao = createVAO(gSea.geom);
}

function update() {
    if (gState.current === 'paused' || gState.current === 'gameOver') {
        return;
    }

    gState.time = (Date.now() - gState.startTime - gState.pausedDuration) / 1000.0;

    if (gState.current === 'menu') {
        const rotationMatrix = rotateY(0.2);
        const offsetVec4 = vec4(gCtx.cameraOffset[0], gCtx.cameraOffset[1], gCtx.cameraOffset[2], 0);
        const rotatedOffset = mult(rotationMatrix, offsetVec4);
        gCtx.cameraOffset = vec3(rotatedOffset[0], rotatedOffset[1], rotatedOffset[2]);
        gPlayer.rotation += 0.5;
        return;
    }

    // Smoothly move player to the target lane
    const targetX = LANE_POSITIONS[gState.currentLane];
    const lerpSpeed = 0.25; // Controls how fast the player switches lanes
    gPlayer.pos[0] += (targetX - gPlayer.pos[0]) * lerpSpeed;
    
    // Move player forward continuously
    gPlayer.pos[2] -= gState.speed;

    // Handle jumping physics
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
    
    // Recycle obstacles
    for (const obstacle of gObstacles) {
        if (obstacle.pos[2] > gPlayer.pos[2] + gCtx.cameraOffset[2]) {
            obstacle.pos[2] -= gObstacles.length * 15;
            obstacle.pos[0] = LANE_POSITIONS[Math.floor(Math.random() * 3)];
        }
    }
    
    // Animate and recycle coins
    const floatAmplitude = 0.25;
    const floatFrequency = 3.0;
    for (const coin of gCoins) {
        coin.rotation += 3;
        coin.pos[1] = coin.baseY + Math.sin(gState.time * floatFrequency + coin.pos[2]) * floatAmplitude;

        if (coin.pos[2] > gPlayer.pos[2] + gCtx.cameraOffset[2]) {
            coin.pos[2] -= gCoins.length * 20;
            coin.pos[0] = LANE_POSITIONS[Math.floor(Math.random() * 3)];
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
        // AABB collision detection
        if (playerBox.max[0] > obstacleBox.min[0] && playerBox.min[0] < obstacleBox.max[0] &&
            playerBox.max[1] > obstacleBox.min[1] && playerBox.min[1] < obstacleBox.max[1] &&
            playerBox.max[2] > obstacleBox.min[2] && playerBox.min[2] < obstacleBox.max[2]) {
            
            gState.current = 'gameOver';
            document.getElementById('instructions').style.display = 'none';
            document.getElementById('final-score').innerText = `You collected ${gScore.coins} coins!`;
            document.getElementById('game-over-overlay').style.display = 'flex';
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
            
            gScore.coins++;
            document.getElementById('score-display').innerText = `Coins: ${gScore.coins}`;
            
            // Move the coin far away to "collect" it
            coin.pos[2] -= gCoins.length * 20; 
        }
    }
}

function render() {
    update();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = gState.current === 'menu' ? gCtx.cameraOffset : add(gPlayer.pos, gCtx.cameraOffset);
    const at = gState.current === 'menu' ? vec3(0,0,0) : gPlayer.pos;
    gCtx.view = lookAt(eye, at, vec3(0,1,0));
    gl.uniformMatrix4fv(gShader.uView, false, flatten(gCtx.view));

    const lightWorldPos = vec4(5.0, 10.0, (gState.current === 'menu' ? 0.0 : gPlayer.pos[2]) + 7.0, 1.0);
    const lightViewPos = mult(gCtx.view, lightWorldPos);
    gl.uniform4fv(gShader.uLuzPos, flatten(lightViewPos));

    gl.uniform1f(gShader.uTime, gState.time);
    gl.uniform1f(gShader.uRoadWidth, gFloor.scale[0]);
    
    const drawObject = (obj, vao, isSea = false) => {
        gl.bindVertexArray(vao);
        gl.uniform4fv(gShader.uCorAmb, flatten(obj.mat.amb));
        gl.uniform4fv(gShader.uCorDif, flatten(obj.mat.dif));
        gl.uniform4fv(gShader.uCorEsp, flatten(obj.mat.esp));
        gl.uniform1f(gShader.uAlfaEsp, obj.mat.alfa);
        gl.uniform1i(gShader.uIsSea, isSea);

        let model = translate(obj.pos[0], obj.pos[1], obj.pos[2]);

        if (obj.rotationAxis) {
            model = mult(model, rotate(-90, 1, 0, 0));
        }

        if (obj.rotation || obj.rotation === 0) {
            let axis = vec3(1, 0, 0);
            if (obj.rotationAxis === 'y') axis = vec3(0, 1, 0);
            if (obj.rotationAxis === 'z') axis = vec3(0, 0, 1);
            model = mult(model, rotate(obj.rotation, axis));
        }
        
        if (obj.scale) model = mult(model, scale(obj.scale[0], obj.scale[1], obj.scale[2]));

        gl.uniformMatrix4fv(gShader.uModel, false, flatten(model));
        const modelView = mult(gCtx.view, model);
        gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(modelView))));
        gl.drawArrays(gl.TRIANGLES, 0, obj.geom.np);
    }

    if (gState.current === 'menu') {
        drawObject(gPlayer, gShader.cubeVao);
    } else {
        drawObject(gPlayer, gShader.cubeVao);
        gFloor.pos[2] = gPlayer.pos[2];
        drawObject(gFloor, gShader.cubeVao);
        const maxDrawDistance = 80; // Culling distance
        gObstacles.forEach(obs => {
            if (Math.abs(obs.pos[2] - gPlayer.pos[2]) < maxDrawDistance) {
                drawObject(obs, gShader.spikeVao);
            }
        });
        gCoins.forEach(coin => {
            if (Math.abs(coin.pos[2] - gPlayer.pos[2]) < maxDrawDistance) {
                drawObject(coin, gShader.coinVao);
            }
        });
        gSea.pos[2] = gPlayer.pos[2];
        drawObject(gSea, gShader.seaVao, true);
    }

    requestAnimationFrame(render);
}

// ========================================================
// SHADERS
// ========================================================

const gVertexShaderSrc = `#version 300 es
    in vec4 aPosition;
    in vec3 aNormal;
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

    void main() {
        vec4 worldPos = uModel * aPosition;
        vec4 modifiedPos = aPosition;

        if (uIsSea) {
            // Only animate waves outside the main path
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
        
        vec4 viewLuzPos = uLuzPos;
        vLight = (viewLuzPos - pos).xyz;

        vView = -pos.xyz;
    }
`;

const gFragmentShaderSrc = `#version 300 es
    precision highp float;
    in vec3 vNormal;
    in vec3 vLight;
    in vec3 vView;
    out vec4 corSaida;
    uniform vec4 uCorAmbiente;
    uniform vec4 uCorDifusao;
    uniform vec4 uCorEspecular;
    uniform float uAlfaEsp;
    void main() {
        vec3 L = normalize(vLight);
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vView);
        vec3 H = normalize(L + V);
        vec4 ambient = uCorAmbiente;
        float kd = max(dot(L, N), 0.0);
        vec4 diffuse = kd * uCorDifusao;
        float ks = (kd > 0.0) ? pow(max(dot(N, H), 0.0), uAlfaEsp) : 0.0;
        vec4 specular = ks * uCorEspecular;
        corSaida = ambient + diffuse + specular;
        corSaida.a = 1.0;
    }
`;
