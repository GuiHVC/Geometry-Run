import { Espinho, Cilindro, Esfera } from '../props.js';

export class Arvore {
  constructor() {
    this.base = new Cilindro(8);
    this.leaves = [new Espinho(8), new Espinho(8), new Espinho(8)];
    this.theta = vec3(0, 0, 0);
  }

  /**
   * Renders the tree. This method can draw the tree with either textures or colored lighting.
   * @param {WebGLRenderingContext} gl The WebGL context.
   * @param {object} gShader A reference to the shader program and its uniform locations.
   * @param {object} gCtx A reference to the context object containing view/projection matrices.
   * @param {mat4} baseModel The model matrix that positions the tree in the world.
   * @param {object} materials An object containing either WebGL texture objects or material color objects.
   * @param {boolean} useTextures A flag to determine whether to render with textures or lighting.
   */
  render(gl, gShader, gCtx, baseModel, materials, useTextures) {

    const instanceRotation = rotate(this.theta[1], vec3(0, 1, 0));

    let trunkModel = mult(baseModel, instanceRotation);
    trunkModel = mult(trunkModel, translate(0, -0.5, 0));
    trunkModel = mult(trunkModel, scale(1.0, 1.6, 1.0));

    if (useTextures) {
      gl.uniform1i(gShader.uUseTexture, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, materials.trunk);
      gl.uniform1i(gShader.uTextureMap, 0);
    } else {
      gl.uniform1i(gShader.uUseTexture, 0);
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.trunk.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.trunk.dif));
    }

    gl.bindVertexArray(gShader.treeTrunkVao);
    let modelView = mult(gCtx.view, trunkModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(trunkModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(modelView))));
    gl.drawArrays(gl.TRIANGLES, 0, this.base.np);

    if (useTextures) {
      gl.bindTexture(gl.TEXTURE_2D, materials.pointyLeaves);
    } else {
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.pointyLeaves.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.pointyLeaves.dif));
    }
    
    const leavesScales = [[3.0, 2, 3.0], [2.6, 2, 2.6], [2.2, 2, 2.2]];
    const leafOffsets = [0.8, 1.1, 1.4];

    for (let i = 0; i < this.leaves.length; ++i) {
      let leafModel = mult(baseModel, instanceRotation);
      leafModel = mult(leafModel, translate(0, leafOffsets[i] - 0.5, 0));
      leafModel = mult(leafModel, scale(...leavesScales[i]));

      gl.bindVertexArray(gShader.pointyLeafVao);
      let mv = mult(gCtx.view, leafModel);
      gl.uniformMatrix4fv(gShader.uModel, false, flatten(leafModel));
      gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(mv))));
      gl.drawArrays(gl.TRIANGLES, 0, this.leaves[i].np);
    }

    gl.uniform1i(gShader.uUseTexture, 0);
  }
}

export class ArvoreRedonda {
  constructor() {
    this.base = new Cilindro(8);
    this.leaves = [new Esfera(4), new Esfera(4)];
    this.theta = vec3(0, 0, 0);
  }
  
  render(gl, gShader, gCtx, baseModel, materials, useTextures) {
    const instanceRotation = rotate(this.theta[1], vec3(0, 1, 0));
    baseModel = mult(baseModel, translate(0, -0.5, -2));
    baseModel = mult(baseModel, rotate(90, vec3(0, 1, 0)));
    let trunkModel = mult(baseModel, instanceRotation);
    trunkModel = mult(trunkModel, translate(0, -0.5, 0));
    trunkModel = mult(trunkModel, scale(1.0, 1.6, 1.0));

    if (useTextures) {
      gl.uniform1i(gShader.uUseTexture, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, materials.trunk);
      gl.uniform1i(gShader.uTextureMap, 0);
    } else {
      gl.uniform1i(gShader.uUseTexture, 0);
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.trunk.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.trunk.dif));
    }

    gl.bindVertexArray(gShader.treeTrunkVao);
    let modelView = mult(gCtx.view, trunkModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(trunkModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(modelView))));
    gl.drawArrays(gl.TRIANGLES, 0, this.base.np);

    if (useTextures) {
      gl.bindTexture(gl.TEXTURE_2D, materials.roundLeaves);
    } else {
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.roundLeaves.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.roundLeaves.dif));
    }

    const leavesScales = [[1.2, 1.2, 1.2], [0.8, 0.8, 0.8]];
    const leafOffsets = [1.2, 2.0];

    for (let i = 0; i < this.leaves.length; ++i) {
      let leafModel = mult(baseModel, instanceRotation);
      leafModel = mult(leafModel, translate(0, leafOffsets[i], 0));
      leafModel = mult(leafModel, scale(...leavesScales[i]));

      gl.bindVertexArray(gShader.roundLeafVao);
      let mv = mult(gCtx.view, leafModel);
      gl.uniformMatrix4fv(gShader.uModel, false, flatten(leafModel));
      gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(mv))));
      gl.drawArrays(gl.TRIANGLES, 0, this.leaves[i].np);
    }

    gl.uniform1i(gShader.uUseTexture, 0);
  }
}

export class ArvoreComGalhos {
  constructor() {
    this.base = new Cilindro(8);
    this.leaves = [new Esfera(4), new Esfera(4), new Esfera(4)];
    this.branches = [new Cilindro(8), new Cilindro(8)];
    this.theta = vec3(0, 0, 0);
  }

  render(gl, gShader, gCtx, baseModel, materials, useTextures) {
    const instanceRotation = rotate(this.theta[1], vec3(0, 1, 0));

    let trunkModel = mult(baseModel, instanceRotation);
    trunkModel = mult(trunkModel, translate(0, 0.4, 0));
    trunkModel = mult(trunkModel, scale(1.0, 3.6, 1.0));
    
    if (useTextures) {
        gl.uniform1i(gShader.uUseTexture, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, materials.trunk);
        gl.uniform1i(gShader.uTextureMap, 0);
    } else {
        gl.uniform1i(gShader.uUseTexture, 0);
        gl.uniform4fv(gShader.uCorAmb, flatten(materials.trunk.amb));
        gl.uniform4fv(gShader.uCorDif, flatten(materials.trunk.dif));
    }

    gl.bindVertexArray(gShader.treeTrunkVao);
    let trunkModelView = mult(gCtx.view, trunkModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(trunkModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(trunkModelView))));
    gl.drawArrays(gl.TRIANGLES, 0, this.base.np);

    const branchScales = [[0.2, 1.6, 0.2], [0.2, 1.6, 0.2]];
    const branchOffsets = [[0.2, 1.2, 0], [-0.2, 1.5, 0.1]];
    const branchRotations = [[-35, 0, -30], [-25, 0, 30]]; 
    
    for (let i = 0; i < this.branches.length; ++i) {
        let branchModel = mult(baseModel, instanceRotation);
        branchModel = mult(branchModel, rotate(branchRotations[i][1], vec3(0, 1, 0)));
        branchModel = mult(branchModel, translate(...branchOffsets[i]));
        branchModel = mult(branchModel, rotate(branchRotations[i][0], vec3(1, 0, 0)));
        branchModel = mult(branchModel, rotate(branchRotations[i][2], vec3(0, 0, 1)));
        branchModel = mult(branchModel, scale(...branchScales[i]));
        
        gl.bindVertexArray(gShader.treeTrunkVao);
        let branchMV = mult(gCtx.view, branchModel);
        gl.uniformMatrix4fv(gShader.uModel, false, flatten(branchModel));
        gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(branchMV))));
        gl.drawArrays(gl.TRIANGLES, 0, this.branches[i].np);
    }

    if (useTextures) {
        gl.bindTexture(gl.TEXTURE_2D, materials.roundLeaves);
    } else {
        gl.uniform4fv(gShader.uCorAmb, flatten(materials.roundLeaves.amb));
        gl.uniform4fv(gShader.uCorDif, flatten(materials.roundLeaves.dif));
    }
    
    const leavesScales = [[1.2, 0.8, 1.2], [1.6, 1.2, 1.6], [1.0, 0.6, 1.0]];
    const leafOffsets = [[0, 1.6, -1.2], [0, 2.3, 0], [0, 2.2, 1]];

    for (let i = 0; i < this.leaves.length; ++i) {
        let leafModel = mult(baseModel, instanceRotation);
        leafModel = mult(leafModel, translate(...leafOffsets[i]));
        leafModel = mult(leafModel, scale(...leavesScales[i]));
        
        gl.bindVertexArray(gShader.roundLeafVao);
        let leafMV = mult(gCtx.view, leafModel);
        gl.uniformMatrix4fv(gShader.uModel, false, flatten(leafModel));
        gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(leafMV))));
        gl.drawArrays(gl.TRIANGLES, 0, this.leaves[i].np);
    }

    gl.uniform1i(gShader.uUseTexture, 0);
  }
}