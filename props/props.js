"use strict";

/**  ................................................................
* Objeto Espinho de raio 0.5 e altura 1.0 centrado na origem.
* @param {number} div - Divisões do espinho, determina a suavidade.
*/
export class Espinho {
  constructor(div=4) {
    this.pos = [];
    this.nor = [];
    this.div = div;
    this.np = Math.pow(2, this.div + 2) * 3;
    this.axis = 2;
    this.theta = vec3(0, 0, 0);
    this.rodando = true;
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
      tri(this.pos, this.nor, [base[a], apex, base[b]], 0, 1, 2);
      tri(this.pos, this.nor, [center, base[a], base[b]], 0, 1, 2);
    }
  }
}

/**  ................................................................
* Objeto Cubo de lado 1.0 centrado na origem.
*/
export class Cubo {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.np = 36;
    this.axis = 2;
    this.theta = vec3(0, 0, 0);
    this.rodando = true;
  }

  init() {
    var vertices = [
      vec3(-0.5, -0.5, -0.5), vec3(0.5, -0.5, -0.5), vec3(0.5, 0.5, -0.5), vec3(-0.5, 0.5, -0.5),
      vec3(-0.5, -0.5, 0.5), vec3(0.5, -0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(-0.5, 0.5, 0.5)
    ];
    tri(this.pos, this.nor, vertices, 0, 1, 2);
    tri(this.pos, this.nor, vertices, 0, 2, 3);
    tri(this.pos, this.nor, vertices, 4, 5, 6);
    tri(this.pos, this.nor, vertices, 4, 6, 7);
    tri(this.pos, this.nor, vertices, 0, 1, 5);
    tri(this.pos, this.nor, vertices, 0, 5, 4);
    tri(this.pos, this.nor, vertices, 2, 3, 7);
    tri(this.pos, this.nor, vertices, 2, 7, 6);
    tri(this.pos, this.nor, vertices, 0, 3, 7);
    tri(this.pos, this.nor, vertices, 0, 7, 4);
    tri(this.pos, this.nor, vertices, 1, 2, 6);
    tri(this.pos, this.nor, vertices, 1, 6, 5);
  }
}

/**  ................................................................
* Objeto Cilindro de raio 0.5 e altura 1 centrado na origem.
* @param {number} div - Divisões do cilindro, determina a suavidade.
*/
export class Cilindro {
  constructor(div=3) {
    this.pos = [];
    this.nor = [];
    this.div = div;
    this.np = Math.pow(2, this.div + 3) * 3;
    this.axis = 2;
    this.theta = vec3(0, 0, 0);
    this.rodando = true;
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
      tri(this.pos, this.nor, [base[a], base[b], bottom], 0, 1, 2);
      tri(this.pos, this.nor, [base[a + n], base[b + n], apex], 0, 1, 2);
      tri(this.pos, this.nor, [base[a], base[b + n], base[b]], 0, 1, 2);
      tri(this.pos, this.nor, [base[a], base[a + n], base[b + n]], 0, 1, 2);
    }
  }
}

// tri function remains the same
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
