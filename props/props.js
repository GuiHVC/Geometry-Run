// BIBLIOTECA DE OBJETOS E FUNÇÕES PARA MANIPULAÇÃO DE PROPS DO JOGO

"use strict";

/**  ................................................................
* Objeto Espinho de raio 0.5 e altura 1.0 centrado na origem.
* 
*/
export function Espinho() {
  this.pos = [];  // vetor de posições
  this.nor = [];  // vetor de normais
  this.div = 4;  // nível de divisão do espinho, 1 faz uma pirâmide de base quadrada
  this.np = Math.pow(2, this.div + 2) * 3; // número de posições (triângulos * 3)

  this.axis = 2;  // usado na animação da rotação (X = 0, Y = 1, Z = 2)
  this.theta = vec3(0, 0, 0);  // rotação em cada eixo
  this.rodando = true;        // pausa a animação
  this.init = function () {    // carrega os buffers
    // Gera base circular
    let n = Math.pow(2, this.div); // número de segmentos da base (quanto maior, mais suave o cone)
    let base = [];
    let radius = 0.5;
    for (let i = 0; i < n; i++) {
      let angle = 2 * Math.PI * i / n;
      base.push(vec3(radius * Math.cos(angle), -0.5, radius * Math.sin(angle)));
    }
    let apex = vec3(0.0, 0.5, 0.0); // topo do cone
    let center = vec3(0.0, -0.5, 0.0); // centro da base

    for (let i = 0; i < n; i++) {
      let a = i;
      let b = (i + 1) % n;
      tri(this.pos, this.nor, [base[a], apex, base[b]], 0, 1, 2); // lateral
      tri(this.pos, this.nor, [center, base[a], base[b]], 0, 1, 2); // base
    }
  };

};

/**  ................................................................
* Objeto Cubo de lado 1.0 centrado na origem.
* 
*/
export function Cubo() {
  this.pos = [];  // vetor de posições
  this.nor = [];  // vetor de normais
  this.np = 36; // número de posições (triângulos * 3)

  this.axis = 2;  // usado na animação da rotação (X = 0, Y = 1, Z = 2)
  this.theta = vec3(0, 0, 0);  // rotação em cada eixo
  this.rodando = true;        // pausa a animação
  this.init = function () {    // carrega os buffers
    var vertices = [
        vec3(-0.5, -0.5, -0.5), vec3(0.5, -0.5, -0.5), vec3(0.5, 0.5, -0.5), vec3(-0.5, 0.5, -0.5),
        vec3(-0.5, -0.5, 0.5), vec3(0.5, -0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(-0.5, 0.5, 0.5)
    ];
    tri(this.pos, this.nor, vertices, 0, 1, 2); // face -Z
    tri(this.pos, this.nor, vertices, 0, 2, 3); // face -Z
    tri(this.pos, this.nor, vertices, 4, 5, 6); // face +Z
    tri(this.pos, this.nor, vertices, 4, 6, 7); // face +Z
    tri(this.pos, this.nor, vertices, 0, 1, 5); // face -X
    tri(this.pos, this.nor, vertices, 0, 5, 4); // face -X
    tri(this.pos, this.nor, vertices, 2, 3, 7); // face +X
    tri(this.pos, this.nor, vertices, 2, 7, 6); // face +X
    tri(this.pos, this.nor, vertices, 0, 3, 7); // face -Y
    tri(this.pos, this.nor, vertices, 0, 7, 4); // face -Y
    tri(this.pos, this.nor, vertices, 1, 2, 6); // face +Y
    tri(this.pos, this.nor, vertices, 1, 6, 5); // face +Y
  };

};

/**  ................................................................
* Objeto Cilindro de raio 0.5 e altura 1 centrado na origem.
* 
*/
export function Cilindro() {
  this.pos = [];  // vetor de posições
  this.nor = [];  // vetor de normais
  this.div = 3;  // nível de divisão do cilindro, 1 faz um paralelepípedo
  this.np = Math.pow(2, this.div + 3) * 3; // número de posições (triângulos * 3)

  this.axis = 2;  // usado na animação da rotação (X = 0, Y = 1, Z = 2)
  this.theta = vec3(0, 0, 0);  // rotação em cada eixo
  this.rodando = true;        // pausa a animação
  this.init = function () {    // carrega os buffers
        // Gera base circular
        let n = Math.pow(2, this.div + 1); // número de segmentos da base (quanto maior, mais suave o cone)
        let base = [];
        let radius = 0.5;
        // base inferior
        for (let i = 0; i < n; i++) {
            let angle = 2 * Math.PI * i / n;
            base.push(vec3(radius * Math.cos(angle), -0.5, radius * Math.sin(angle)));
        }
        // base superior
        for (let i = 0; i < n; i++) {
            let angle = 2 * Math.PI * i / n;
            base.push(vec3(radius * Math.cos(angle), 0.5, radius * Math.sin(angle)));
        }
        let apex = vec3(0.0, 0.5, 0.0); // centro do topo
        let bottom = vec3(0.0, -0.5, 0.0); // centro da base

        for (let i = 0; i < n; i++) {
            let a = i;
            let b = (i + 1) % n;
            // laterais (dois triângulos por parede lateral)
            tri(this.pos, this.nor, [base[a], base[b], bottom], 0, 1, 2); // superior
            tri(this.pos, this.nor, [base[a + n], base[b + n], apex], 0, 1, 2); // inferior
            tri(this.pos, this.nor, [base[a], base[b + n], base[b]], 0, 1, 2); // lateral superior
            tri(this.pos, this.nor, [base[a], base[a + n], base[b + n]], 0, 1, 2); // lateral inferior
        };
  };

};

/**  ................................................................
* cria triângulos de um quad e os carrega nos arrays
* pos (posições) e nor (normais).  
* @param {*} pos : array de posições a ser carregado
* @param {*} nor : array de normais a ser carregado
* @param {*} vert : array com vértices do quad
* @param {*} a : indices de vertices
* @param {*} b : em ordem anti-horária
* @param {*} c : 
* @param {*} d :
*/

function tri(pos, nor, vert, a, b, c) {
  var t1 = subtract(vert[b], vert[a]);
  var t2 = subtract(vert[c], vert[b]);
  var normal = cross(t1, t2);
  normal = vec3(normal);

  pos.push(vert[a]);
  nor.push(normal);
  pos.push(vert[b]);
  nor.push(normal);
  pos.push(vert[c]);
  nor.push(normal);
};