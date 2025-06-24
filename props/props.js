"use strict";

const ESPINHO = 1; // face lateral de espinhos
const CUBO = 2; // faces laterais de cubos
const CILINDRO = 3; // faces laterais de cilindros
const ESFERA = 4; // faces laterais de esferas
const TRIANGULO = 5; // faces laterais de triângulos
/*
* objeto Espinho de raio 0.5 e altura 1.0 centrado na origem.
* @param {number} div - divisões do espinho, determina a suavidade.
*/
export class Espinho {
  constructor(div=4) {
    this.pos = [];
    this.nor = [];
    this.tex = [];
    this.div = div;

    this.axis = 2;
    this.theta = vec3(0, 0, 0);
    this.rodando = true;

    this.init();
  }

  init() {
    let n = Math.pow(2, this.div);
    let base = [];
    let radius = 0.5;
    for (let i = 0; i < n; i++) {
      let angle = 2 * Math.PI * i / n;
      base.push(vec3(radius * Math.cos(angle), -0.5, radius * Math.sin(angle)));
    }
    let apex = vec3(0.0, 0.5, 0.0);
    let center = vec3(0.0, -0.5, 0.0);

    for (let i = 0; i < n; i++) {
      let a = i;
      let b = (i + 1) % n;
      tri(this.pos, this.nor, this.tex, [base[a], apex, base[b]], 0, 1, 2, ESPINHO);
      tri(this.pos, this.nor, this.tex, [center, base[a], base[b]], 0, 1, 2, ESPINHO);
    }
    this.np = this.pos.length;
  }
}

/*
* objeto Cubo de lado 1.0 centrado na origem.
*/
export class Cubo {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.tex = [];
    this.np = 36;
    this.axis = 2;
    this.theta = vec3(0, 0, 0);
    this.rodando = true;

    this.init();
  }

  init() {
    var vertices = [
      vec3(-0.5, -0.5, -0.5), vec3(0.5, -0.5, -0.5), vec3(0.5, 0.5, -0.5), vec3(-0.5, 0.5, -0.5),
      vec3(-0.5, -0.5, 0.5), vec3(0.5, -0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(-0.5, 0.5, 0.5)
    ];
    tri(this.pos, this.nor, this.tex, vertices, 0, 2, 1, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 0, 3, 2, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 4, 5, 6, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 4, 6, 7, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 0, 1, 5, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 0, 5, 4, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 2, 3, 7, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 2, 7, 6, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 0, 7, 3, CUBO); 
    tri(this.pos, this.nor, this.tex, vertices, 0, 4, 7, CUBO); 
    tri(this.pos, this.nor, this.tex, vertices, 1, 2, 6, CUBO);
    tri(this.pos, this.nor, this.tex, vertices, 1, 6, 5, CUBO);
  }
}

/*
* objeto Cilindro de raio 0.5 e altura 1.0 centrado na origem.
* @param {number} div - divisões do cilindro, determina a suavidade.
*/
export class Cilindro {
  constructor(div=3) {
    this.pos = [];
    this.nor = [];
    this.tex = [];
    this.div = div;

    this.axis = 2;
    this.theta = vec3(0, 0, 0);
    this.rodando = true;

    this.init();
  }

  init() {
    let n = Math.pow(2, this.div + 1);
    let base = [];
    let radius = 0.5;
    for (let i = 0; i < n; i++) {
      let angle = 2 * Math.PI * i / n;
      base.push(vec3(radius * Math.cos(angle), -0.5, radius * Math.sin(angle)));
    }
    for (let i = 0; i < n; i++) {
      let angle = 2 * Math.PI * i / n;
      base.push(vec3(radius * Math.cos(angle), 0.5, radius * Math.sin(angle)));
    }
    let apex = vec3(0.0, 0.5, 0.0);
    let bottom = vec3(0.0, -0.5, 0.0);

    for (let i = 0; i < n; i++) {
      let a = i;
      let b = (i + 1) % n;
      tri(this.pos, this.nor, this.tex, [base[a], base[b], bottom], 0, 1, 2, CILINDRO);
      tri(this.pos, this.nor, this.tex, [base[a + n], apex, base[b + n]], 0, 1, 2, CILINDRO);
      tri(this.pos, this.nor, this.tex, [base[a], base[b + n], base[b]], 0, 1, 2, CILINDRO);
      tri(this.pos, this.nor, this.tex, [base[a], base[a + n], base[b + n]], 0, 1, 2, CILINDRO);
    }
    this.np = this.pos.length;
  }
}

export class Plano {
    constructor(width, depth, divisions) {
        this.pos = [];
        this.nor = [];
        this.tex = [];
        this.np = 0;
        this.init(width, depth, divisions);
    }

    init(width, depth, divisions) {
        const vertices = [];
        const texCoords = [];

        for (let i = 0; i <= divisions; i++) {
            for (let j = 0; j <= divisions; j++) {
                const x = (j / divisions - 0.5) * width;
                const z = (i / divisions - 0.5) * depth;
                vertices.push(vec3(x, 0, z));

                const u = j / divisions;
                const v = i / divisions;
                texCoords.push(vec2(u, v));
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
        
        for (let index of indices) {
            this.pos.push(vertices[index]);
            this.nor.push(vec3(0, 1, 0));
            this.tex.push(texCoords[index]);
        }
        this.np = indices.length;
    }
}
  
export class Esfera {
  constructor(ndivs = 2) {
    const TEMPLATE = [
      vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0),
      vec3(-1.0, 0.0, 0.0), vec3(0.0, -1.0, 0.0), vec3(0.0, 0.0, -1.0),
    ];

    this.pos = [];
    this.nor = [];
    this.tex = [];
    this.axis = 2;
    this.theta = vec3(0, 0, 0);
    this.rotating = true;
    this.position = vec3(0, 0, 0);
    this.velrotation = 0;
    this.veltranslation = 0;
    this.scale = 1;
    this.color = vec4(sorteieCorRGBA());

    this.divideTriangle = (a, b, c, depth) => {
      if (depth <= 0) {
        tri(this.pos, this.nor, this.tex, [a, b, c], 0, 1, 2, ESFERA);
        return;
      }
      const ab = normalize(mix(a, b, 0.5));
      const ac = normalize(mix(a, c, 0.5));
      const bc = normalize(mix(b, c, 0.5));
      this.divideTriangle(a, ab, ac, depth - 1);
      this.divideTriangle(b, bc, ab, depth - 1);
      this.divideTriangle(c, ac, bc, depth - 1);
      this.divideTriangle(ab, bc, ac, depth - 1);
    };

    const v = TEMPLATE;
    this.divideTriangle(v[2], v[0], v[1], ndivs);
    this.divideTriangle(v[1], v[3], v[2], ndivs);
    this.divideTriangle(v[1], v[5], v[3], ndivs);
    this.divideTriangle(v[0], v[5], v[1], ndivs);
    this.divideTriangle(v[2], v[3], v[4], ndivs);
    this.divideTriangle(v[0], v[2], v[4], ndivs);
    this.divideTriangle(v[4], v[5], v[0], ndivs);
    this.divideTriangle(v[4], v[3], v[5], ndivs);

    this.np = this.pos.length;
  }
}

export class Triangulo {
  constructor(depth = 0.2) {
    this.pos = [];
    this.nor = [];
    this.tex = [];
    this.axis = 2;
    this.theta = vec3(0, 0, 0);
    this.rotating = true;
    this.position = vec3(0, 0, 0);
    this.velrotation = 0;
    this.veltranslation = 0;
    this.scale = 1;
    this.color = vec4(sorteieCorRGBA());

    // Altura do triângulo equilátero com lado 1
    const height = Math.sqrt(3) / 2;
    
    // Vértices da base frontal (triângulo equilátero)
    const vertices = [
      vec3(-0.5, -height/2, depth/2),   // 0 - Vértice inferior esquerdo frontal
      vec3(0.5, -height/2, depth/2),    // 1 - Vértice inferior direito frontal
      vec3(0.0, height/2, depth/2),     // 2 - Vértice superior frontal
      vec3(-0.5, -height/2, -depth/2),  // 3 - Vértice inferior esquerdo traseiro
      vec3(0.5, -height/2, -depth/2),   // 4 - Vértice inferior direito traseiro
      vec3(0.0, height/2, -depth/2)     // 5 - Vértice superior traseiro
    ];

    // Face frontal
    tri(this.pos, this.nor, this.tex, vertices, 0, 1, 2, TRIANGULO);
    
    // Face traseira
    tri(this.pos, this.nor, this.tex, vertices, 3, 5, 4, TRIANGULO);
    
    // Faces laterais (retângulos divididos em triângulos)
    // Face inferior
    tri(this.pos, this.nor, this.tex, vertices, 0, 3, 4, TRIANGULO);
    tri(this.pos, this.nor, this.tex, vertices, 0, 4, 1, TRIANGULO);
    
    // Face lateral esquerda
    tri(this.pos, this.nor, this.tex, vertices, 0, 2, 5, TRIANGULO);
    tri(this.pos, this.nor, this.tex, vertices, 0, 5, 3, TRIANGULO);
    
    // Face lateral direita
    tri(this.pos, this.nor, this.tex, vertices, 1, 4, 5, TRIANGULO);
    tri(this.pos, this.nor, this.tex, vertices, 1, 5, 2, TRIANGULO);

    this.np = this.pos.length;
  }
}


/*
* função auxiliar para criar triângulos a partir de vértices.
* @param {Array} pos - Array para armazenar as posições dos vértices.
* @param {Array} nor - Array para armazenar as normais dos vértices.
* @param {Array} tex - Array para armazenar as coordenadas de textura dos vértices.
* @param {Array} vert - Array de vértices.
* @param {number} a - Índice do primeiro vértice.
* @param {number} b - Índice do segundo vértice.
* @param {number} c - Índice do terceiro vértice.
* @param {Integer} type - Tipo de forma
*/
function tri(pos, nor, tex, vert, a, b, c, type) {
  var t1 = subtract(vert[b], vert[a]);
  var t2 = subtract(vert[c], vert[b]);
  var normal = cross(t1, t2);
  normal = vec3(normal);

  let texA = texMap(vert[a], type);
  let texB = texMap(vert[b], type);
  let texC = texMap(vert[c], type);

  pos.push(vert[a]);
  nor.push(normal);
  tex.push(texA);
  pos.push(vert[b]);
  nor.push(normal);
  tex.push(texB);
  pos.push(vert[c]);
  nor.push(normal);
  tex.push(texC);
};

/*
* função para mapear coordenadas de textura para um ponto da forma escolhida.
* @param {Array} p - Ponto no espaço tridimensional.
* @param {Integer} type - Tipo de forma
* @returns {vec2} - Coordenadas de textura mapeadas.
*/
function texMap(p, type) {
  let u, v;
  switch (type) {
    case ESPINHO:
      u = 0.5 + p[0] / 2;
      v = 0.5 + p[2] / 2;
      break;
    case CUBO:
      u = (p[0] + 0.5) / 1.0;
      v = (p[1] + 0.5) / 1.0;
      break;
    case CILINDRO:
      u = Math.atan2(p[2], p[0]) / (2 * Math.PI) + 0.5;
      v = (p[1] + 0.5) / 1.0;
      break;
    case ESFERA:
      u = (Math.atan2(p[1], p[0]) / (2 * Math.PI));
      v = 1.0 - (Math.acos(p[2]) / Math.PI);
      break;          
    case TRIANGULO:
      const scale = 0.8;
      u = ((p[0] + 0.5) + Math.atan2(p[2], p[0]) / (4 * Math.PI)) * scale;
      v = ((p[1] + 0.5) * 0.8 + 0.1) * scale;
      break;
  }
  return vec2(u, v);
}

/**
 * recebe a source de imagem e configura a textura
 * @param {string} src - Caminho da imagem a ser usada como textura.
 * @param {WebGLRenderingContext} gl - Contexto WebGL.
 */
export function configureTextura(gl, src) {
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([255, 0, 0, 255]));

  var img = new Image();
  img.src = src;
  img.crossOrigin = "anonymous";
  img.addEventListener('load', function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, img.width, img.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  });
  return texture; // isso é uma textura WebGL
}

export function shear(plane, s1, s2) {
    // Cria uma matriz identidade como um array simples
    const m = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];

    s1 = s1 || 0;
    s2 = s2 || 0;

    switch (plane.toLowerCase()) {
        case 'xy': // Cisalhamento em X e Y baseado em Z
            m[8] = s1;
            m[9] = s2;
            break;
        case 'xz': // Cisalhamento em X e Z baseado em Y
            m[4] = s1;
            m[6] = s2; 
            break;
        case 'yz': // Cisalhamento em Y e Z baseado em X
            m[1] = s1;
            m[2] = s2;
            break;
    }

    return m; // Retorna o array simples de 16 elementos
}

