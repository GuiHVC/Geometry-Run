"use strict";

class GameObject {
     constructor(position, scale, material) {
        this.pos = position;
        this.scale = scale;
        this.rotation = 0;
        this.material = material;
        this.geometry = { pos: [], nor: [], np: 36 };
        this.initCube();
    }

    initCube() {
        const vertices = [
            vec3(-0.5, -0.5, -0.5), vec3(0.5, -0.5, -0.5), vec3(0.5, 0.5, -0.5), vec3(-0.5, 0.5, -0.5),
            vec3(-0.5, -0.5,  0.5), vec3(0.5, -0.5,  0.5), vec3(0.5, 0.5,  0.5), vec3(-0.5, 0.5,  0.5)
        ];
        
        const tri = (vert, a, b, c) => {
            const t1 = subtract(vert[b], vert[a]);
            const t2 = subtract(vert[c], vert[b]);
            const normal = normalize(vec3(cross(t1, t2)));
            this.geometry.pos.push(vert[a]); this.geometry.nor.push(normal);
            this.geometry.pos.push(vert[b]); this.geometry.nor.push(normal);
            this.geometry.pos.push(vert[c]); this.geometry.nor.push(normal);
        };

        tri(vertices, 0, 1, 2); tri(vertices, 0, 2, 3);
        tri(vertices, 4, 5, 6); tri(vertices, 4, 6, 7);
        tri(vertices, 0, 1, 5); tri(vertices, 0, 5, 4);
        tri(vertices, 2, 3, 7); tri(vertices, 2, 7, 6);
        tri(vertices, 0, 3, 7); tri(vertices, 0, 7, 4);
        tri(vertices, 1, 2, 6); tri(vertices, 1, 6, 5);
    }
    
    draw(gl, shader, viewMatrix, vao) {
        gl.bindVertexArray(vao);
        gl.uniform4fv(shader.uCorAmb, flatten(this.material.uCorAmbiente));
        gl.uniform4fv(shader.uCorDif, flatten(this.material.uCorDifusao));
        gl.uniform4fv(shader.uCorEsp, flatten(this.material.uCorEspecular));
        gl.uniform1f(shader.uAlfaEsp, this.material.uAlfaEsp);
        gl.uniform1i(shader.uIsSea, 0);
        
        let model = mult(mat4(), translate(this.pos[0], this.pos[1], this.pos[2]));
        if (this.rotation !== 0) {
             model = mult(model, rotate(this.rotation, 1, 0, 0));
        }
        model = mult(model, scale(this.scale[0], this.scale[1], this.scale[2]));
        
        gl.uniformMatrix4fv(shader.uModel, false, flatten(model));
        let modelView = mult(viewMatrix, model);
        gl.uniformMatrix4fv(shader.uInverseTranspose, false, flatten(transpose(inverse(modelView))));
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        gl.bindVertexArray(null);
    }
}

class Sea extends GameObject {
    constructor(position, scale, material) {
        super(position, scale, material);
        this.geometry = { pos: [], nor: [], np: 0 };
        this.initSea();
    }

    initSea() {
        const divisions = 50;
        const width = this.scale[0];
        const depth = this.scale[2];

        for (let i = 0; i <= divisions; i++) {
            for (let j = 0; j <= divisions; j++) {
                const x = (j / divisions - 0.5) * width;
                const z = (i / divisions - 0.5) * depth;
                this.geometry.pos.push(vec3(x, 0, z));
                this.geometry.nor.push(vec3(0, 1, 0));
            }
        }

        const indices = [];
        for (let i = 0; i < divisions; i++) {
            for (let j = 0; j < divisions; j++) {
                const a = j + (i * (divisions + 1));
                const b = a + 1;
                const c = j + ((i + 1) * (divisions + 1));
                const d = c + 1;
                indices.push(a, b, c);
                indices.push(c, b, d);
            }
        }
        
        const finalPos = [];
        const finalNor = [];
        for (let index of indices) {
            finalPos.push(this.geometry.pos[index]);
            finalNor.push(this.geometry.nor[index]);
        }

        this.geometry.pos = finalPos;
        this.geometry.nor = finalNor;
        this.geometry.np = indices.length;
    }

    draw(gl, shader, viewMatrix, vao) {
         gl.bindVertexArray(vao);
        gl.uniform4fv(shader.uCorAmb, flatten(this.material.uCorAmbiente));
        gl.uniform4fv(shader.uCorDif, flatten(this.material.uCorDifusao));
        gl.uniform4fv(shader.uCorEsp, flatten(this.material.uCorEspecular));
        gl.uniform1f(shader.uAlfaEsp, this.material.uAlfaEsp);
        gl.uniform1i(shader.uIsSea, 1);
        
        let model = mult(mat4(), translate(this.pos[0], this.pos[1], this.pos[2]));
        gl.uniformMatrix4fv(shader.uModel, false, flatten(model));
        let modelView = mult(viewMatrix, model);
        gl.uniformMatrix4fv(shader.uInverseTranspose, false, flatten(transpose(inverse(modelView))));
        gl.drawArrays(gl.TRIANGLES, 0, this.geometry.np);
        gl.bindVertexArray(null);
    }
}

class Camera {
    constructor() {
        this.offset = vec3(0, 4, 8);
        this.up = vec3(0, 1, 0);
        this.viewMatrix = mat4();
    }

    update(targetPosition) {
        const eye = add(targetPosition, this.offset);
        this.viewMatrix = lookAt(eye, targetPosition, this.up);
    }
}

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl2');
        if (!this.gl) { alert("WebGL 2.0 not available"); return; }
        
        this.shader = {};
        this.camera = new Camera();

        this.player = null;
        this.floor = null;
        this.obstacles = [];
        this.sea = null;
        
        this.state = {
            speed: 0.1,
            isJumping: false,
            yVelocity: 0,
            gravity: -0.01,
            jumpStrength: 0.32,
            groundY: 0.5,
            rotationSpeed: 5,
            time: 0,
            current: 'menu' // 'menu', 'playing', 'gameOver'
        };
    }

    init() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0.1, 0.0, 0.2, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.setupShaders();
        this.createGameObjects();
        this.setupEventListeners();

        this.render();
    }

    setupShaders() {
        const gl = this.gl;
        this.shader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
        gl.useProgram(this.shader.program);

        const getLoc = (name) => gl.getUniformLocation(this.shader.program, name);
        this.shader.uModel = getLoc("uModel");
        this.shader.uView = getLoc("uView");
        this.shader.uPerspective = getLoc("uPerspective");
        this.shader.uInverseTranspose = getLoc("uInverseTranspose");
        this.shader.uCorAmb = getLoc("uCorAmbiente");
        this.shader.uCorDif = getLoc("uCorDifusao");
        this.shader.uCorEsp = getLoc("uCorEspecular");
        this.shader.uAlfaEsp = getLoc("uAlfaEsp");
        this.shader.uTime = getLoc("uTime");
        this.shader.uIsSea = getLoc("uIsSea");
        this.shader.uRoadWidth = getLoc("uRoadWidth");
        
        const aspect = this.canvas.width / this.canvas.height;
        const perspectiveMatrix = perspective(60, aspect, 0.1, 1000);
        gl.uniformMatrix4fv(this.shader.uPerspective, false, flatten(perspectiveMatrix));

        gl.uniform4fv(getLoc("uLuzPos"), flatten(vec4(5.0, 10.0, 7.0, 1.0)));
    }
    
    createGameObjects() {
        const luzAmb = vec4(0.1, 0.0, 0.2, 1.0);
        const luzDif = vec4(1.0, 1.0, 1.0, 1.0);
        const luzEsp = vec4(1.0, 1.0, 1.0, 1.0);
        const matEsp = vec4(1.0, 1.0, 1.0, 1.0);
        const matAlfa = 200.0;

        const makeMaterial = (amb, dif, alfa = matAlfa) => ({
            uCorAmbiente: mult(luzAmb, amb), uCorDifusao: mult(luzDif, dif),
            uCorEspecular: mult(luzEsp, matEsp), uAlfaEsp: alfa
        });
        
        const playerMat = makeMaterial(vec4(1.0, 0.2, 0.8, 1.0), vec4(1.0, 0.2, 0.8, 1.0));
        this.player = new GameObject(vec3(0, 0.5, 0), vec3(1.5, 1.5, 1.5), playerMat);
        
        const floorMat = makeMaterial(vec4(0.2, 0.1, 0.3, 1.0), vec4(0.2, 0.1, 0.3, 1.0), 1000.0);
        this.floor = new GameObject(vec3(0, -0.1, 0), vec3(10, 0.2, 200), floorMat);
        
        const obstacleMat = makeMaterial(vec4(0.2, 0.8, 1.0, 1.0), vec4(0.2, 0.8, 1.0, 1.0));
        for (let i = 0; i < 30; i++) {
            const pos = vec3((Math.random() - 0.5) * 8, 0.5, -20 - (i * 15));
            this.obstacles.push(new GameObject(pos, vec3(1, 1, 1), obstacleMat));
        }

        const seaMat = makeMaterial(vec4(0.1, 0.3, 0.7, 1.0), vec4(0.1, 0.3, 0.7, 1.0));
        this.sea = new Sea(vec3(0, -1, 0), vec3(150, 1, 150), seaMat);

        this.createVAOs();
    }
    
    createVAOs() {
        const createVAO = (geometry) => {
            const gl = this.gl;
            const vao = gl.createVertexArray();
            gl.bindVertexArray(vao);
            const vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.pos), gl.STATIC_DRAW);
            const aPosition = gl.getAttribLocation(this.shader.program, "aPosition");
            gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aPosition);
            const normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(geometry.nor), gl.STATIC_DRAW);
            const aNormal = gl.getAttribLocation(this.shader.program, "aNormal");
            gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aNormal);
            gl.bindVertexArray(null);
            return vao;
        };

        this.cubeVao = createVAO(this.player.geometry);
        this.seaVao = createVAO(this.sea.geometry);
    }

    setupEventListeners() {
        // Game controls
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space' && this.state.current === 'playing' && !this.state.isJumping) {
                this.state.isJumping = true;
                this.state.yVelocity = this.state.jumpStrength;
            }
        });

        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            const aspect = this.canvas.width / this.canvas.height;
            const perspectiveMatrix = perspective(60, aspect, 0.1, 1000);
            this.gl.uniformMatrix4fv(this.shader.uPerspective, false, flatten(perspectiveMatrix));
        });
        
        // Menu controls
        document.getElementById('play-button').onclick = () => this.startGame();
        document.getElementById('exit-button').onclick = () => {
             document.getElementById('menu-overlay').innerHTML = `<h1>Thanks for playing!</h1>`;
        };
    }

    startGame() {
        document.getElementById('menu-overlay').style.display = 'none';
        document.getElementById('instructions').style.opacity = '1';
        this.reset();
        this.state.current = 'playing';
    }

    reset() {
        this.player.pos = vec3(0, 0.5, 0);
        this.player.rotation = 0;
        this.camera.offset = vec3(0, 4, 8);

        for (let i = 0; i < this.obstacles.length; i++) {
            this.obstacles[i].pos = vec3((Math.random() - 0.5) * 8, 0.5, -20 - (i * 15));
        }
        
        this.state.isJumping = false;
        this.state.yVelocity = 0;
        this.state.current = 'playing';

        const instructions = document.getElementById('instructions');
        instructions.innerText = 'Press SPACE to Jump';
        instructions.style.backgroundColor = 'rgba(0,0,0,0.5)';
    }

    update() {
        this.state.time += 0.015;

        if (this.state.current !== 'playing') {
            if (this.state.current === 'menu') {
                const rotationMatrix = rotateY(0.2);
                const offsetVec4 = vec4(this.camera.offset[0], this.camera.offset[1], this.camera.offset[2], 0);
                const rotatedOffset = mult(rotationMatrix, offsetVec4);
                this.camera.offset = vec3(rotatedOffset[0], rotatedOffset[1], rotatedOffset[2]);
                this.camera.update(vec3(0,0,0));
                this.player.rotation += 0.5;
            }
            return;
        }
        
        this.player.pos[2] -= this.state.speed;

        if (this.state.isJumping) {
            this.player.pos[1] += this.state.yVelocity;
            this.state.yVelocity += this.state.gravity;
            this.player.rotation += this.state.rotationSpeed;

            if (this.player.pos[1] <= this.state.groundY) {
                this.player.pos[1] = this.state.groundY;
                this.state.isJumping = false;
                this.state.yVelocity = 0;
                this.player.rotation = 0;
            }
        }

        this.camera.update(this.player.pos);

        for (const obstacle of this.obstacles) {
            if (obstacle.pos[2] > this.player.pos[2] + this.camera.offset[2]) {
                obstacle.pos[2] -= this.obstacles.length * 15;
                obstacle.pos[0] = (Math.random() - 0.5) * 8;
            }
        }
        
        this.checkCollisions();
    }

    checkCollisions() {
        const getBoundingBox = (gameObject) => {
            const halfScale = scale(0.5, gameObject.scale);
            return {
                min: subtract(gameObject.pos, halfScale),
                max: add(gameObject.pos, halfScale)
            };
        };

        const playerBox = getBoundingBox(this.player);

        for (const obstacle of this.obstacles) {
            const obstacleBox = getBoundingBox(obstacle);
            if (playerBox.max[0] > obstacleBox.min[0] && playerBox.min[0] < obstacleBox.max[0] &&
                playerBox.max[1] > obstacleBox.min[1] && playerBox.min[1] < obstacleBox.max[1] &&
                playerBox.max[2] > obstacleBox.min[2] && playerBox.min[2] < obstacleBox.max[2]) {
                this.state.current = 'gameOver';
                const instructions = document.getElementById('instructions');
                instructions.innerText = "Game Over! Refresh to play again.";
                instructions.style.backgroundColor = "rgba(200, 0, 0, 0.8)";
                break; 
            }
        }
    }
    
    render() {
        this.update();
        
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniformMatrix4fv(this.shader.uView, false, flatten(this.camera.viewMatrix));
        gl.uniform1f(this.shader.uTime, this.state.time);
        gl.uniform1f(this.shader.uRoadWidth, this.floor.scale[0]);
        
        if (this.state.current === 'menu') {
             this.player.draw(gl, this.shader, this.camera.viewMatrix, this.cubeVao);
        } else {
            this.player.draw(gl, this.shader, this.camera.viewMatrix, this.cubeVao);
            this.floor.pos[2] = this.player.pos[2];
            this.floor.draw(gl, this.shader, this.camera.viewMatrix, this.cubeVao);
            for (const obstacle of this.obstacles) {
                obstacle.draw(gl, this.shader, this.camera.viewMatrix, this.cubeVao);
            }
            this.sea.pos[2] = this.player.pos[2];
            this.sea.draw(gl, this.shader, this.camera.viewMatrix, this.seaVao);
        }

        requestAnimationFrame(() => this.render());
    }
}

window.onload = () => {
    const game = new Game('glcanvas');
    game.init();
};

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
