"use strict";

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

/**  ................................................................
* Objeto Espinho de raio 0.5 e altura 1.0 centrado na origem.
* @param {number} div - Divisões do espinho, determina a suavidade.
*/
class Espinho {
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
class Cubo {
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
    tri(this.pos, this.nor, vertices, 0, 2, 1); // corrigido a ordem de vértices para manter a normal correta
    tri(this.pos, this.nor, vertices, 0, 3, 2); // corrigido
    tri(this.pos, this.nor, vertices, 4, 5, 6);
    tri(this.pos, this.nor, vertices, 4, 6, 7);
    tri(this.pos, this.nor, vertices, 0, 1, 5);
    tri(this.pos, this.nor, vertices, 0, 5, 4);
    tri(this.pos, this.nor, vertices, 2, 3, 7);
    tri(this.pos, this.nor, vertices, 2, 7, 6);
    tri(this.pos, this.nor, vertices, 0, 7, 3); // corrigido
    tri(this.pos, this.nor, vertices, 0, 4, 7); // corrigido
    tri(this.pos, this.nor, vertices, 1, 2, 6);
    tri(this.pos, this.nor, vertices, 1, 6, 5);
  }
}

/** ................................................................
* Objeto Cilindro de raio 0.5 e altura 1 centrado na origem.
* @param {number} div - Divisões do cilindro, determina a suavidade.
*/
class Cilindro {
    constructor(div = 3) {
        this.pos = [];
        this.nor = [];
        this.div = div;
        this.np = 0;
        this.axis = 2;
        this.theta = vec3(0, 0, 0);
        this.rodando = true;
    }

    init() {
        const n = Math.pow(2, this.div + 1);
        const radius = 0.5;
        const height = 1.0;

        const topCenter = vec3(0, height / 2, 0);
        const bottomCenter = vec3(0, -height / 2, 0);
        const topNormal = vec3(0, 1, 0);
        const bottomNormal = vec3(0, -1, 0);

        for (let i = 0; i < n; i++) {
            const angle1 = 2 * Math.PI * i / n;
            const angle2 = 2 * Math.PI * (i + 1) / n;

            const x1 = radius * Math.cos(angle1);
            const z1 = radius * Math.sin(angle1);
            const x2 = radius * Math.cos(angle2);
            const z2 = radius * Math.sin(angle2);

            const v1_top = vec3(x1, height / 2, z1);
            const v2_top = vec3(x2, height / 2, z2);
            const v1_bottom = vec3(x1, -height / 2, z1);
            const v2_bottom = vec3(x2, -height / 2, z2);

            const n1 = normalize(vec3(x1, 0, z1));
            const n2 = normalize(vec3(x2, 0, z2));

            // Side triangles
            this.pos.push(v1_bottom, v2_top, v1_top);
            this.nor.push(n1, n2, n1);
            this.pos.push(v1_bottom, v2_bottom, v2_top);
            this.nor.push(n1, n2, n2);

            // Top cap triangles
            this.pos.push(topCenter, v2_top, v1_top);
            this.nor.push(topNormal, topNormal, topNormal);

            // Bottom cap triangles
            // Reversed winding order to match the -Y normal
            this.pos.push(bottomCenter, v2_bottom, v1_bottom);
            this.nor.push(bottomNormal, bottomNormal, bottomNormal);
        }

        this.np = this.pos.length;
    }
}

class Plano {
    constructor(width, depth, divisions) {
        this.pos = [];
        this.nor = [];
        this.np = 0;
        this.init(width, depth, divisions);
    }

    init(width, depth, divisions) {
        const vertices = [];
        for (let i = 0; i <= divisions; i++) {
            for (let j = 0; j <= divisions; j++) {
                const x = (j / divisions - 0.5) * width;
                const z = (i / divisions - 0.5) * depth;
                vertices.push(vec3(x, 0, z));
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
        }
        this.np = indices.length;
    }
}