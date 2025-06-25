import { Esfera, Triangulo } from '../props.js';

export class Peixe {
  constructor() {
    this.body = new Esfera(8);
    this.tail = new Triangulo(0.4);
    this.theta = vec3(0, 0, 0);
    this.animationTime = 0;
    this.animationSpeed = 0.02;
    this.arcHeight = 2.0;
    this.cycleLength = Math.PI * 2;
    this.baseY = -1.0;
    this.position = vec3(0, this.baseY, 0);
  }

  render(gl, gShader, gCtx, baseModel, materials, useTextures) {
    this.diveAnimation();

    let fishTransform = mult(baseModel, translate(this.position[0], this.position[1], this.position[2]));
    fishTransform = mult(fishTransform, rotate(this.theta[0] * 180 / Math.PI, vec3(1, 0, 0)));
    fishTransform = mult(fishTransform, rotate(this.theta[1], vec3(0, 1, 0)));
    fishTransform = mult(fishTransform, rotate(this.theta[2] * 180 / Math.PI, vec3(0, 0, 1)));

    let bodyModel = mult(fishTransform, rotate(90, vec3(0, 1, 0)));
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

    if (useTextures) {
      gl.bindTexture(gl.TEXTURE_2D, materials.fishTail);
    } else {
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.fishTail.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.fishTail.dif));
    }

    let tailModel = mult(fishTransform, translate(-0.8, 0, 0));
    tailModel = mult(tailModel, rotate(90, vec3(0, 0, 1)));
    tailModel = mult(tailModel, scale(0.8, 1.2, 0.4));

    gl.bindVertexArray(gShader.fishTailVao);
    let tailMV = mult(gCtx.view, tailModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(tailModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(tailMV))));
    gl.drawArrays(gl.TRIANGLES, 0, this.tail.np);

    gl.uniform1i(gShader.uUseTexture, 0);
  }
  diveAnimation() {
    this.animationTime += this.animationSpeed;
    
    const normalizedTime = this.animationTime % this.cycleLength;
    
    const verticalOffset = Math.sin(normalizedTime) * this.arcHeight;
    this.position[1] = this.baseY + verticalOffset;
    
    this.position[0] = Math.cos(normalizedTime) * 0.5;
    this.position[2] = Math.sin(normalizedTime * 0.5) * 0.3;
    
    const velocityY = Math.cos(normalizedTime) * this.arcHeight;
    this.theta[2] = Math.atan2(-velocityY, 1.0) * 0.5;
    
    this.theta[0] = Math.sin(normalizedTime * 2) * 0.1;
  }
}