"use strict";

import { Arvore, ArvoreRedonda, ArvoreComGalhos } from './tree.js';
import { configureTexturaDaURL } from '../props.js';

const TRUNK_TEXTURE = "textures/trunk.png";
const LEAF_TEXTURE = "textures/leaves.jpg";
let trunkTexture = null;
let leafTexture = null;
// ==================================================================
// Os valores a seguir são usados apenas uma vez quando o programa
// é carregado. Modifique esses valores para ver seus efeitos.

// Propriedades da fonte de luz
const LUZ = {
  pos: vec4(0.0, 3.0, 0.0, 1.0), // posição
  amb: vec4(0.0, 0.6, 0.6, 1.0), // ambiente
  dif: vec4(1.0, 1.0, 0.0, 1.0), // difusão
  esp: vec4(1.0, 1.0, 1.0, 1.0), // especular
};

// Propriedades do material
const MAT = {
  amb: vec4(0.8, 0.8, 0.8, 1.0),
  dif: vec4(1.0, 0.5, 1.0, 1.0),
  alfa: 50.0,    // brilho ou shininess
};

// Camera
const CAMERA_RAIO = 3;  // a camera se move usando as setas do teclado
const CAMERA_STEP = 10; // passo de variação do angulo
// perspectiva
const FOVY = 60;
const ASPECT = 1;
const NEAR = 0.1;
const FAR = 50;

// ==================================================================
// constantes globais
const FUNDO = [0.0, 0.0, 0.0, 1.0];  // fundo preto

// ==================================================================
// Os valores a seguir são usados apenas uma vez quando o programa
// é carregado. Modifique esses valores para ver seus efeitos.

// calcula a matriz de transformação da camera, apenas 1 vez
var eye = vec3(2, 2, 0);
const at = vec3(0, 0, 0);
const up = vec3(0, 1, 0);

// ==================================================================
// constantes globais

const EIXO_X_IND = 0;
const EIXO_Y_IND = 1;
const EIXO_Z_IND = 2;
const EIXO_X = vec3(1, 0, 0);
const EIXO_Y = vec3(0, 1, 0);
const EIXO_Z = vec3(0, 0, 1);

// ==================================================================
// variáveis globais
// as strings com os código dos shaders também são globais, estão 
// no final do arquivo.

var gl;        // webgl2
var gCanvas;   // canvas

// objeto a ser renderizado
var gArvore = new ArvoreComGalhos();

// guarda coisas do shader
var gShader = {
  aTheta: null,
};

// guarda coisas da interface e contexto do programa
var gCtx = {
  view: mat4(),     // view matrix, inicialmente identidade
  perspective: mat4(), // projection matrix
  camTheta: [0, 0], // ângulo da câmera
};

// ==================================================================
// chama a main quando terminar de carregar a janela
window.onload = main;

/**
 * programa principal.
 */
function main() {
  // ambiente
  gCanvas = document.getElementById("glcanvas");
  gl = gCanvas.getContext('webgl2');
  if (!gl) alert("Vixe! Não achei WebGL 2.0 aqui :-(");

  trunkTexture = configureTexturaDaURL(gl, TRUNK_TEXTURE);
  leafTexture = configureTexturaDaURL(gl, LEAF_TEXTURE);

  console.log("Canvas: ", gCanvas.width, gCanvas.height);

  // interface
  crieInterface();
  
  // Inicializações feitas apenas 1 vez
  gl.viewport(0, 0, gCanvas.width, gCanvas.height);
  gl.clearColor(FUNDO[0], FUNDO[1], FUNDO[2], FUNDO[3]);
  gl.enable(gl.DEPTH_TEST);

  // shaders
  crieShaders();

  // finalmente...
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

// ==================================================================
/**
 * Cria e configura os elementos da interface e funções de callback
 */
function crieInterface() {
  document.getElementById("xButton").onclick = function () {
    gArvore.axis = EIXO_X_IND;
  };
  document.getElementById("yButton").onclick = function () {
    gArvore.axis = EIXO_Y_IND;
  };
  document.getElementById("zButton").onclick = function () {
    gArvore.axis = EIXO_Z_IND;
  };
  document.getElementById("pButton").onclick = function () {
    gArvore.rodando = !gArvore.rodando;
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

function setVAO(object){
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const aNormal = gl.getAttribLocation(gShader.program, "aNormal");
  const bufNorm = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufNorm);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(object.nor), gl.STATIC_DRAW);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aNormal);
  
  const aPosition = gl.getAttribLocation(gShader.program, "aPosition");
  const bufPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(object.pos), gl.STATIC_DRAW);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  const aTexCoord = gl.getAttribLocation(gShader.program, "aTexCoord");
  const bufTex = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTex);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(object.tex), gl.STATIC_DRAW);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTexCoord);

  return vao;
}


// ==================================================================
/**
 * cria e configura os shaders
 */
function crieShaders() {
  // cria o programa
  gShader.program = makeProgram(gl, gVertexShaderSrc, gFragmentShaderSrc);
  gl.useProgram(gShader.program);

  gShader.ArvoreVAOs = [];
  gShader.ArvoreVAOs.push(setVAO(gArvore.base));
  for(let leaf of gArvore.leaves) {
    gShader.ArvoreVAOs.push(setVAO(leaf));
  };
  for (let branch of gArvore.branches) {
    gShader.ArvoreVAOs.push(setVAO(branch));
  }
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
 * Usa o shader para desenhar.
 * Assume que os dados já foram carregados e são estáticos.
 */
function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // gl.bindVertexArray(gShader.CuboVAO);

  eye = vec3(CAMERA_RAIO * Math.sin(gCtx.camTheta[0]) * Math.cos(gCtx.camTheta[1]),
              CAMERA_RAIO * Math.sin(gCtx.camTheta[1]),
              CAMERA_RAIO * Math.cos(gCtx.camTheta[0]) * Math.cos(gCtx.camTheta[1]));
  gCtx.view = lookAt(eye, at, up);
  gl.uniformMatrix4fv(gShader.uView, false, flatten(gCtx.view));

  // renderiza a árvore
  gArvore.render(gl, gShader, gCtx, trunkTexture, leafTexture);

  window.requestAnimationFrame(render);
}


// ========================================================
// Código fonte dos shaders em GLSL
// a primeira linha deve conter "#version 300 es"
// para WebGL 2.0

var gVertexShaderSrc = `#version 300 es

in  vec4 aPosition;
in  vec3 aNormal;
in  vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uPerspective;
uniform mat4 uInverseTranspose;

uniform vec4 uLuzPos;

out vec3 vNormal;
out vec3 vLight;
out vec3 vView;
out vec2 vTexCoord;

void main() {
    mat4 modelView = uView * uModel;
    gl_Position = uPerspective * modelView * aPosition;

    // orienta as normais como vistas pela câmera
    vNormal = mat3(uInverseTranspose) * aNormal;
    vec4 pos = modelView * aPosition;

    vLight = (uView * uLuzPos - pos).xyz;
    vView = -(pos.xyz);

    vTexCoord = aTexCoord;
}
`;

var gFragmentShaderSrc = `#version 300 es

precision highp float;

in vec3 vNormal;
in vec3 vLight;
in vec3 vView;
in vec2 vTexCoord;
out vec4 corSaida;

// cor = produto luz * material
uniform vec4 uCorAmbiente;
uniform vec4 uCorDifusao;
uniform vec4 uCorEspecular;
uniform float uAlfaEsp;
uniform sampler2D uTextureMap;

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

    vec4 texColor = texture(uTextureMap, vTexCoord);
    corSaida = (difusao + especular + uCorAmbiente) * texColor;
    corSaida.a = 1.0;
}
`;