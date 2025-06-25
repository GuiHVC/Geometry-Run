import { Triangulo, Esfera } from '../props.js';

export class Passaro {
  constructor() {
    this.body = new Esfera(8);
    this.wings = [new Triangulo(0.05), new Triangulo(0.05)];
    this.tail = new Triangulo(0.05);
    this.beak = [new Triangulo(0.2), new Triangulo(0.2)];
    this.theta = vec3(0, 0, 0);
    this.animationTime = 0;
    this.animationSpeed = 0.03;
    this.cycleLength = Math.PI * 2;
    this.baseY = 0;
    this.position = vec3(0, this.baseY, 0);
    this.wingFlap = 0;
  }

  render(gl, gShader, gCtx, baseModel, materials, useTextures) {
    this.flyAnimation();

    let birdTransform = mult(baseModel, translate(this.position[0], this.position[1], this.position[2]));
    birdTransform = mult(birdTransform, rotate(this.theta[0] * 180 / Math.PI, vec3(1, 0, 0)));
    birdTransform = mult(birdTransform, rotate(this.theta[1], vec3(0, 1, 0)));
    birdTransform = mult(birdTransform, rotate(this.theta[2] * 180 / Math.PI, vec3(0, 0, 1)));

    let bodyModel = mult(birdTransform, rotate(0, vec3(0, 1, 0)));
    bodyModel = mult(bodyModel, scale(0.25, 0.17, .4));

    if (useTextures) {
      gl.uniform1i(gShader.uUseTexture, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, materials.birdBody);
      gl.uniform1i(gShader.uTextureMap, 0);
    } else {
      gl.uniform1i(gShader.uUseTexture, 0);
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.birdBody.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.birdBody.dif));
    }

    gl.bindVertexArray(gShader.birdBodyVao);
    let modelView = mult(gCtx.view, bodyModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(bodyModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(modelView))));
    gl.drawArrays(gl.TRIANGLES, 0, this.body.np);

    if (useTextures) {
      gl.bindTexture(gl.TEXTURE_2D, materials.birdWing);
    } else {
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.birdWing.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.birdWing.dif));
    }

    let leftWingModel = mult(birdTransform, translate(-0.25, 0.04, -0.06));
    leftWingModel = mult(leftWingModel, rotate(90, vec3(1, 0, 0)));
    leftWingModel = mult(leftWingModel, rotate(45, vec3(0, 0, 1)));
    leftWingModel = mult(leftWingModel, rotate(this.wingFlap, vec3(1, 0, 0)));
    leftWingModel = mult(leftWingModel, rotate(-this.wingFlap, vec3(0, 1, 0)));
    
    leftWingModel = mult(leftWingModel, scale(0.8, 0.4, 0.6));

    gl.bindVertexArray(gShader.birdWingVao);
    let leftWingMV = mult(gCtx.view, leftWingModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(leftWingModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(leftWingMV))));
    gl.drawArrays(gl.TRIANGLES, 0, this.wings[0].np);
    
    let rightWingModel = mult(birdTransform, translate(0.25, 0.04, -0.06));
    rightWingModel = mult(rightWingModel, rotate(90, vec3(1, 0, 0)));
    rightWingModel = mult(rightWingModel, rotate(-45, vec3(0, 0, 1)));
    rightWingModel = mult(rightWingModel, rotate(this.wingFlap, vec3(1, 1, 0)));
    rightWingModel = mult(rightWingModel, scale(0.8, 0.4, 0.6));

    let rightWingMV = mult(gCtx.view, rightWingModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(rightWingModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(rightWingMV))));
    gl.drawArrays(gl.TRIANGLES, 0, this.wings[1].np);

    if (useTextures) {
      gl.bindTexture(gl.TEXTURE_2D, materials.birdTail);
    } else {
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.birdTail.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.birdTail.dif));
    }

    let tailModel = mult(birdTransform, translate(0, 0, 0.4));
    tailModel = mult(tailModel, rotate(90, vec3(1, 0, 0)));
    tailModel = mult(tailModel, rotate(-15, vec3(1, 0, 0)));
    tailModel = mult(tailModel, scale(0.5, 0.8, 0.3));

    gl.bindVertexArray(gShader.birdTailVao);
    let tailMV = mult(gCtx.view, tailModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(tailModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(tailMV))));
    gl.drawArrays(gl.TRIANGLES, 0, this.tail.np);   
    
    if (useTextures) {
      gl.bindTexture(gl.TEXTURE_2D, materials.birdBeak);
    } else {
      gl.uniform4fv(gShader.uCorAmb, flatten(materials.birdBeak.amb));
      gl.uniform4fv(gShader.uCorDif, flatten(materials.birdBeak.dif));
    }

    let upperBeakModel = mult(birdTransform, translate(0, 0.05, -0.35));
    upperBeakModel = mult(upperBeakModel, rotate(90, vec3(0, 1, 0))); 
    upperBeakModel = mult(upperBeakModel, rotate(10, vec3(1, 0, 0)));
    upperBeakModel = mult(upperBeakModel, scale(0.3, 0.08, 0.08));

    gl.bindVertexArray(gShader.birdBeakVao);
    let upperBeakMV = mult(gCtx.view, upperBeakModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(upperBeakModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(upperBeakMV))));
    gl.drawArrays(gl.TRIANGLES, 0, this.beak[0].np);

    let lowerBeakModel = mult(birdTransform, translate(0, -0.05, -0.35));
    lowerBeakModel = mult(lowerBeakModel, rotate(90, vec3(0, 1, 0)));
    lowerBeakModel = mult(lowerBeakModel, rotate(180, vec3(0, 0, 1)));
    lowerBeakModel = mult(lowerBeakModel, scale(0.25, 0.06, 0.06));

    let lowerBeakMV = mult(gCtx.view, lowerBeakModel);
    gl.uniformMatrix4fv(gShader.uModel, false, flatten(lowerBeakModel));
    gl.uniformMatrix4fv(gShader.uInverseTranspose, false, flatten(transpose(inverse(lowerBeakMV))));
    gl.drawArrays(gl.TRIANGLES, 0, this.beak[1].np);

    gl.uniform1i(gShader.uUseTexture, 0);
  }
  flyAnimation() {
    this.animationTime += this.animationSpeed;
    
    const normalizedTime = this.animationTime % this.cycleLength;
    
    const verticalOffset = Math.sin(normalizedTime * 0.5) * this.flightHeight;
    this.position[1] = this.baseY;
    this.position[0] = 0;
    this.position[2] = 0;
    
    this.theta[1] = 0;
    this.theta[0] = 0;
    
    this.wingFlap = Math.sin(normalizedTime) * 10;
  }
}