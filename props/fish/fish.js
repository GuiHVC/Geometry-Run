import { Esfera, Triangulo } from '../props.js';

export class Peixe {
  constructor() {
    this.body = new Esfera(8);
    this.tail = new Triangulo(0.4);
    this.theta = vec3(0, 0, 0);
  }

  /**
   * Renders the fish. This method can draw the fish with either textures or colored lighting.
   * @param {WebGLRenderingContext} gl The WebGL context.
   * @param {object} gShader A reference to the shader program and its uniform locations.
   * @param {object} gCtx A reference to the context object containing view/projection matrices.
   * @param {mat4} baseModel The model matrix that positions the tree in the world.
   * @param {object} materials An object containing either WebGL texture objects or material color objects.
   * @param {boolean} useTextures A flag to determine whether to render with textures or lighting.
   */  render(gl, gShader, gCtx, baseModel, materials, useTextures) {
    //this.theta[1] += 0.5;

    const instanceRotation = rotate(this.theta[1], vec3(0, 1, 0));

    // Desenha Corpo do Peixe
    let bodyModel = mult(baseModel, instanceRotation);
    bodyModel = mult(bodyModel, translate(0, 0, 0));
    bodyModel = mult(bodyModel, rotate(90, vec3(0, 1, 0)));
    bodyModel = mult(bodyModel, scale(0.3, 0.6, 1.0));

    if (useTextures) {
      gl.uniform1i(gShader.uUseTexture, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, materials.fishBody);
      gl.uniform1i(gShader.uTextureMap, 0);
    } else {
      gl.uniform1i(gShader.uUseTexture, 0);
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.fishBody.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.fishBody.dif));
    }

    gl.bindVertexArray(gShader.fishBodyVao);
    let modelView = mult(gCtx.view, bodyModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(bodyModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(modelView))));
    gl.drawArrays(gl.TRIANGLES, 0, this.body.np);

    // Desenha Cauda do Peixe
    if (useTextures) {
      gl.bindTexture(gl.TEXTURE_2D, materials.fishTail);
    } else {
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.fishTail.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.fishTail.dif));
    }

    let tailModel = mult(baseModel, instanceRotation);
    tailModel = mult(tailModel, translate(-0.8, 0, 0));
    tailModel = mult(tailModel, rotate(90, vec3(0, 0, 1)));
    tailModel = mult(tailModel, scale(0.8, 1.2, 0.4));

    gl.bindVertexArray(gShader.fishTailVao);
    let tailMV = mult(gCtx.view, tailModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(tailModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(tailMV))));
    gl.drawArrays(gl.TRIANGLES, 0, this.tail.np);

    gl.uniform1i(gShader.uUseTexture, 0);
  }
}

