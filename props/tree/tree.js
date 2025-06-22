import { Espinho, Cilindro} from '../props.js';

export class Arvore{
  constructor() {
    this.base = new Cilindro(8);
    this.base.init();
    this.leaves = [new Espinho(8), new Espinho(8), new Espinho(8)];
    for (let leaf of this.leaves) leaf.init();
     
    this.axis = 2;
    this.theta = vec3(0, 0, 0);  // rotação em cada eixo
    this.rodando = true;        // pausa a animação
  };

  render(gl, gShader, gCtx) {
    if(this.rodando){
        this.theta[1] += 0.5; // incrementa a rotação
    };

    let baseModel = mat4();
    baseModel = mult(baseModel, rotate(this.theta[0], vec3(1, 0, 0)));
    baseModel = mult(baseModel, rotate(this.theta[1], vec3(0, 1, 0)));
    baseModel = mult(baseModel, rotate(this.theta[2], vec3(0, 0, 1)));
    baseModel = mult(baseModel, translate(0, -0.5, 0)); // move a base para baixo
    
    gl.bindVertexArray(gShader.ArvoreVAOs[0]);
    let trunkModel = mult(baseModel, scale(.5, .8, .5));

    let modelView = mult(gCtx.view, trunkModel);
    let modelViewInvTrans = transpose(inverse(modelView));
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(trunkModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(modelViewInvTrans));
    gl.drawArrays(gl.TRIANGLES, 0, this.base.np);

    // === Leaves ===
    const leavesScales = [[1.5, 1, 1.5], [1.3, 1, 1.3], [1.1, 1, 1.1]];
    const leafOffsets = [.8, 1.1, 1.4];

    for (let i = 0; i < this.leaves.length; ++i) {
      gl.bindVertexArray(gShader.ArvoreVAOs[i + 1]);

      let leafModel = mat4();
      leafModel = mult(leafModel, scale(...leavesScales[i]));
      leafModel = mult(leafModel, translate(0, leafOffsets[i], 0));
      
      // Apply baseModel transform to the whole leaf (including position above trunk)
      leafModel = mult(baseModel, leafModel);

      let mv = mult(gCtx.view, leafModel);
      let invT = transpose(inverse(mv));
      gl.uniformMatrix4fv(gShader.uModel, false, flatten(leafModel));
      gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(invT));
      gl.drawArrays(gl.TRIANGLES, 0, this.leaves[i].np);
    }
  };

};
