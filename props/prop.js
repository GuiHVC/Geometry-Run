"use strict";

import { Cilindro, Cubo, configureTexturaDaURL } from './props.js';

const LUZ = {
  pos: vec4(0.0, 3.0, 0.0, 1.0),
  amb: vec4(0.3, 0.7, 0.7, 1.0),
  dif: vec4(1.0, 1.0, 0.0, 1.0),
  esp: vec4(1.0, 1.0, 1.0, 1.0),
};

// propriedades do material
const MAT = {
  amb: vec4(0.8, 0.8, 0.8, 1.0),
  dif: vec4(1.0, 0.5, 1.0, 1.0),
  alfa: 100.0,    // brilho ou shininess
};

// camera
const CAMERA_RAIO = 3;  // a camera se move usando as setas do teclado
const CAMERA_STEP = 10; // passo de variação do angulo
// perspectiva
const FOVY = 60;
const ASPECT = 1;
const NEAR = 0.1;
const FAR = 50;

const FUNDO = [0.0, 0.8, 0.0, 1.0];  // fundo preto

// calcula a matriz de transformação da camera, apenas 1 vez
var eye = vec3(2, 2, 0);
const at = vec3(0, 0, 0);
const up = vec3(0, 1, 0);

const EIXO_X_IND = 0;
const EIXO_Y_IND = 1;
const EIXO_Z_IND = 2;
const EIXO_X = vec3(1, 0, 0);
const EIXO_Y = vec3(0, 1, 0);
const EIXO_Z = vec3(0, 0, 1);

var gl;        // webgl2
var gCanvas;   // canvas

// objetos a serem renderizados
var gCilindro;
var gCubo;

var gShader = {
  aTheta: null,
};

var gCtx = {
  view: mat4(),     // view matrix, inicialmente identidade
  perspective: mat4(), // projection matrix
  camTheta: [0, 0], // ângulo da câmera
};

const STEVE_HEAD = "https://media.discordapp.net/attachments/1376661148958589121/1386357210401083514/8578bfd439ef6ee41e103ae82b561986.jpg?ex=68596944&is=685817c4&hm=92fd1d37afc1d28c76caba3eaba1712e4e8c908322503aec4582c5f2810448c1&=&format=webp";
const LEAVES = "https://media.discordapp.net/attachments/1376661148958589121/1386358135198973984/texture_leaves_by_kuschelirmel_stock_djtlyu-fullview.jpg?ex=68596a20&is=685818a0&hm=fc0c9a920f04d2f0b48c9ae412d4d03e3b4a8bdd1f0a4242779428a33cf0ed4e&=&format=webp";
const urls = [LEAVES, STEVE_HEAD];
const textures = [null, null];

window.onload = main;

function main() {
  gCanvas = document.getElementById("glcanvas");
  gl = gCanvas.getContext('webgl2');
  if (!gl) alert("Vixe! Não achei WebGL 2.0 aqui :-(");

  console.log("Canvas: ", gCanvas.width, gCanvas.height);

  crieInterface();

  // objetos
  gCilindro = new Cilindro(6);
  gCilindro.init();
  gCubo = new Cubo();
  gCubo.init();

  // escolha o URL de cada textura
  textures[0] = configureTexturaDaURL(gl, urls[0]);
  textures[1] = configureTexturaDaURL(gl, urls[1]);

  gl.viewport(0, 0, gCanvas.width, gCanvas.height);
  gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
  gl.enable(gl.DEPTH_TEST);

  crieShaders();

  render();

}

function callbackKeyDown(event) {
  switch(event.key) {
    case "ArrowUp":
      gCtx.camTheta[1] = gCtx.camTheta[1] + 0.01 * CAMERA_STEP;
      break;
    case "ArrowDown":
      gCtx.camTheta[1] = gCtx.camTheta[1] - 0.01 * CAMERA_STEP;
      break;
    case "ArrowLeft":
      gCtx.camTheta[0] = gCtx.camTheta[0] - 0.01 * CAMERA_STEP;
      break;
    case "ArrowRight":
      gCtx.camTheta[0] = gCtx.camTheta[0] + 0.01 * CAMERA_STEP;
      break;
  }
  console.log("Ângulo da câmera: ", gCtx.camTheta);
}

/**
 * cria e configura os elementos da interface e funções de callback
 */
function crieInterface() {
  document.getElementById("xButton").onclick = function () {
    gCilindro.axis = EIXO_X_IND;
    gCubo.axis = EIXO_Y_IND;
  };
  document.getElementById("yButton").onclick = function () {
    gCilindro.axis = EIXO_Y_IND;
    gCubo.axis = EIXO_Z_IND;
  };
  document.getElementById("zButton").onclick = function () {
    gCilindro.axis = EIXO_Z_IND;
    gCubo.axis = EIXO_X_IND;
  };
  document.getElementById("pButton").onclick = function () {
    gCilindro.rodando = !gCilindro.rodando;
    gCubo.rodando = !gCubo.rodando;
  };
  document.getElementById("alfaSlider").onchange = function (e) {
    gCtx.alfaEspecular = e.target.value;
    console.log("Alfa = ", gCtx.alfaEspecular);
    gl.uniform1f(gShader.uAlfaEsp, gCtx.alfaEspecular);
  };
  document.getElementById("divSlider").onchange = function (e) {
  }

  window.onkeydown = callbackKeyDown;
}

/**
 * cria e configura os shaders
 */
function crieShaders() {
  // cria o programa
  gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
  gl.useProgram(gShader.program);

  // VAO para Cilindro
  gShader.CilindroVAO = gl.createVertexArray();
  gl.bindVertexArray(gShader.CilindroVAO);

  // buffer das normais do Cilindro
  var bufNormaisCilindro = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufNormaisCilindro);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCilindro.nor), gl.STATIC_DRAW);

  var aNormal = gl.getAttribLocation(gShader.program, "aNormal");
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aNormal);

  // buffer dos vértices do Cilindro
  var bufVerticesCilindro = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufVerticesCilindro);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCilindro.pos), gl.STATIC_DRAW);

  var aPosition = gl.getAttribLocation(gShader.program, "aPosition");
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  // textura para Cilindro
  var bufTexturaCilindro = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTexturaCilindro);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCilindro.tex), gl.STATIC_DRAW);

  var aTexCoordCilindro = gl.getAttribLocation(gShader.program, "aTexCoord");
  gl.vertexAttribPointer(aTexCoordCilindro, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTexCoordCilindro);
  gl.uniform1i(gl.getUniformLocation(gShader.program, "uTextureMap"), 0);

  // VAO para Cubo
  gShader.CuboVAO = gl.createVertexArray();
  gl.bindVertexArray(gShader.CuboVAO);

  // buffer das normais do Cubo
  var bufNormaisCubo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufNormaisCubo);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCubo.nor), gl.STATIC_DRAW);

  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aNormal);

  // buffer dos vértices do Cubo
  var bufVerticesCubo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufVerticesCubo);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCubo.pos), gl.STATIC_DRAW);

  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  // textura
  var bufTextura = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTextura);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(gCubo.tex), gl.STATIC_DRAW);

  var aTexCoord = gl.getAttribLocation(gShader.program, "aTexCoord");
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTexCoord);
  gl.uniform1i(gl.getUniformLocation(gShader.program, "uTextureMap"), 0);

  // resolve os uniforms
  gShader.uModel = gl.getUniformLocation(gShader.program, "uModel");
  gShader.uView = gl.getUniformLocation(gShader.program, "uView");
  gShader.uPerspective = gl.getUniformLocation(gShader.program, "uPerspective");
  gShader.uInverseTranspose = gl.getUniformLocation(gShader.program, "uInverseTranspose");

  // calcula a matriz de transformação perspectiva (fovy, aspect, near, far)
  gCtx.perspective = perspective(FOVY, ASPECT, NEAR, FAR);
  gl.uniformMatrix4fv(gShader.uPerspective, false, flatten(gCtx.perspective));

  gCtx.view = lookAt(eye, at, up);
  gl.uniformMatrix4fv(gShader.uView, false, flatten(gCtx.view));

  // parametros para iluminação
  gShader.uLuzPos = gl.getUniformLocation(gShader.program, "uLuzPos");
  gl.uniform4fv(gShader.uLuzPos, LUZ.pos);

  // fragment shader
  gShader.uCorAmb = gl.getUniformLocation(gShader.program, "uCorAmbiente");
  gShader.uCorDif = gl.getUniformLocation(gShader.program, "uCorDifusao");
  gShader.uCorEsp = gl.getUniformLocation(gShader.program, "uCorEspecular");
  gShader.uAlfaEsp = gl.getUniformLocation(gShader.program, "uAlfaEsp");

  gl.uniform4fv(gShader.uCorAmb, mult(LUZ.amb, MAT.amb));
  gl.uniform4fv(gShader.uCorDif, mult(LUZ.dif, MAT.dif));
  gl.uniform4fv(gShader.uCorEsp, LUZ.esp);
  gl.uniform1f(gShader.uAlfaEsp, MAT.alfa);

  // boa prática
  gl.bindVertexArray(null);
}

// ==================================================================
/**
 * usa o shader para desenhar.
 * assume que os dados já foram carregados e são estáticos.
 */
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bindVertexArray(gShader.CilindroVAO);

  eye = vec3(CAMERA_RAIO * Math.sin(gCtx.camTheta[0]) * Math.cos(gCtx.camTheta[1]),
              CAMERA_RAIO * Math.sin(gCtx.camTheta[1]),
              CAMERA_RAIO * Math.cos(gCtx.camTheta[0]) * Math.cos(gCtx.camTheta[1]));
  gCtx.view = lookAt(eye, at, up);
  gl.uniformMatrix4fv(gShader.uView, false, flatten(gCtx.view));

  // modelo muda a cada frame da animação
  if (gCilindro.rodando) gCilindro.theta[gCilindro.axis] += 2.0;

  let model = mat4();

  // primeiro, escalo para 0.5 
  model = mult(model, scale(0.5, 0.5, 0.5));

  if (1) {
    model = mult(model, rotate(-gCilindro.theta[EIXO_X_IND], EIXO_X));
    model = mult(model, rotate(-gCilindro.theta[EIXO_Y_IND], EIXO_Y));
    model = mult(model, rotate(-gCilindro.theta[EIXO_Z_IND], EIXO_Z));
  }
  else {
    let rx = rotateX(gCilindro.theta[EIXO_X_IND]);
    let ry = rotateY(gCilindro.theta[EIXO_Y_IND]);
    let rz = rotateZ(gCilindro.theta[EIXO_Z_IND]);
    model = mult(rz, mult(ry, rx));
  }

  // por fim, translado para 1, 1, 1
  model = mult(model, translate(1, 1, 1));

  // IMPORTANTE: é necessário ativar cada textura durante o render para permitir múltiplas texturas sem precisar de uma imagem única
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures[0]);
  gl.uniform1i(gl.getUniformLocation(gShader.program, "uTextureMap"), 0);
  
  let modelView = mult(gCtx.view, model);
  let modelViewInv = inverse(modelView);
  let modelViewInvTrans = transpose(modelViewInv);

  gl.uniformMatrix4fv(gShader.uModel, false, flatten(model));
  gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(modelViewInvTrans));

  gl.drawArrays(gl.TRIANGLES, 0, gCilindro.np);

  gl.bindVertexArray(gShader.CuboVAO);

  eye = vec3(CAMERA_RAIO * Math.sin(gCtx.camTheta[0]) * Math.cos(gCtx.camTheta[1]),
              CAMERA_RAIO * Math.sin(gCtx.camTheta[1]),
              CAMERA_RAIO * Math.cos(gCtx.camTheta[0]) * Math.cos(gCtx.camTheta[1]));
  gCtx.view = lookAt(eye, at, up);
  gl.uniformMatrix4fv(gShader.uView, false, flatten(gCtx.view));

  // modelo muda a cada frame da animação
  if (gCubo.rodando) gCubo.theta[gCubo.axis] += 2.0;

  model = mat4();

  // primeiro, escalo para 0.5 
  model = mult(model, scale(0.5, 0.5, 0.5));

  if (1) {
    model = mult(model, rotate(-gCubo.theta[EIXO_X_IND], EIXO_X));
    model = mult(model, rotate(-gCubo.theta[EIXO_Y_IND], EIXO_Y));
    model = mult(model, rotate(-gCubo.theta[EIXO_Z_IND], EIXO_Z));
  }
  else {
    let rx = rotateX(gCubo.theta[EIXO_X_IND]);
    let ry = rotateY(gCubo.theta[EIXO_Y_IND]);
    let rz = rotateZ(gCubo.theta[EIXO_Z_IND]);
    model = mult(rz, mult(ry, rx));
  }

  // por fim, translado para -1, -1, -1
  model = mult(model, translate(-1, -1, -1));

  // IMPORTANTE: é necessário ativar cada textura durante o render para permitir múltiplas texturas sem precisar de uma imagem única
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures[1]);
  gl.uniform1i(gl.getUniformLocation(gShader.program, "uTextureMap"), 0);
  
  modelView = mult(gCtx.view, model);
  modelViewInv = inverse(modelView);
  modelViewInvTrans = transpose(modelViewInv);

  gl.uniformMatrix4fv(gShader.uModel, false, flatten(model));
  gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(modelViewInvTrans));

  gl.drawArrays(gl.TRIANGLES, 0, gCubo.np);

  window.requestAnimationFrame(render);
}


// ========================================================
// código fonte dos shaders em GLSL
// a primeira linha deve conter "#version 300 es"
// para WebGL 2.0

var gVertexShaderSrc = `#version 300 es

in  vec4 aPosition;
in  vec3 aNormal;
in  vec2 aTexCoord; // NEW: texture coordinate attribute

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uPerspective;
uniform mat4 uInverseTranspose;

uniform vec4 uLuzPos;

out vec3 vNormal;
out vec3 vLight;
out vec3 vView;
out vec2 vTexCoord; // NEW: pass texture coordinate to fragment shader

void main() {
    mat4 modelView = uView * uModel;
    gl_Position = uPerspective * modelView * aPosition;

    // orienta as normais como vistas pela câmera
    vNormal = mat3(uInverseTranspose) * aNormal;
    vec4 pos = modelView * aPosition;

    vLight = (uView * uLuzPos - pos).xyz;
    vView = -(pos.xyz);

    vTexCoord = aTexCoord; // NEW: pass through
}
`;

var gFragmentShaderSrc = `#version 300 es

precision highp float;

in vec3 vNormal;
in vec3 vLight;
in vec3 vView;
in vec2 vTexCoord; // NEW: receive texture coordinate
out vec4 corSaida;

// cor = produto luz * material
uniform vec4 uCorAmbiente;
uniform vec4 uCorDifusao;
uniform vec4 uCorEspecular;
uniform float uAlfaEsp;
uniform sampler2D uTextureMap; // NEW: texture sampler

void main() {
    vec3 normalV = normalize(vNormal);
    vec3 lightV = normalize(vLight);
    vec3 viewV = normalize(vView);
    vec3 halfV = normalize(lightV + viewV);
  
    // difusao
    float kd = max(0.0, dot(normalV, lightV) );
    vec4 difusao = kd * uCorDifusao;

    // especular
    float ks = 0.0;
    if (kd > 0.0) {
        ks = pow(max(0.0, dot(normalV, halfV)), uAlfaEsp);
    }
    
    vec4 especular = ks * uCorEspecular;

    // NEW: sample the texture and multiply with lighting
    vec4 texColor = texture(uTextureMap, vTexCoord);
    corSaida = (difusao + especular + uCorAmbiente) * texColor;
    corSaida.a = 1.0;
}
`;
