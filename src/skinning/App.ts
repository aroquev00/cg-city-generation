import { Debugger } from "../lib/webglutils/Debugging.js";
import {
  CanvasAnimation,
  WebGLUtilities,
} from "../lib/webglutils/CanvasAnimation.js";
import { Floor } from "../lib/webglutils/Floor.js";
import { GUI, Mode } from "./Gui.js";
import {
  cityGroundVSText,
  cityGroundFSText,
  sceneFSText,
  sceneVSText,
  sceneTextureFSText,
  floorFSText,
  floorVSText,
  cylinderVSText,
  cylinderFSText,
  skeletonFSText,
  skeletonVSText,
  sBackVSText,
  sBackFSText,
  buildingFSText,
  buildingVSText,
  buildingTextureFSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { CLoader } from "./AnimationFileLoader.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Camera } from "../lib/webglutils/Camera.js";
import { Cylinder } from "../lib/webglutils/Cylinder.js";

import { CityGround } from "../lib/webglutils/CityGround.js";

import { Keyframe, interpolateSkeleton } from "./Utils.js";
import { Buildings } from "./buildingGeneration.js";
import { City } from "../cityGeneration/cityGeneration.js";

export const debug = false;

export const kCylinderRadius = 0.1;

let highlightedBoneIndex = null;

export function setHighlightedBoneIndex(index: number) {
  highlightedBoneIndex = index;
}

export function getHighlightedBoneIndex() {
  return highlightedBoneIndex;
}

export class SkinningAnimation extends CanvasAnimation {
  // Keyframes
  private keyframes: Keyframe[];

  private gui: GUI;
  private millis: number;

  private loadedScene: string;

  /* City Rendering Info */
  public city: City;
  private cityGround: CityGround;
  private cityGroundRenderPass: RenderPass;

  /* Floor Rendering Info */
  private floor: Floor;
  private floorRenderPass: RenderPass;

  /* Scene rendering info */
  private scene: CLoader;
  private sceneRenderPass: RenderPass;

  /* Skeleton rendering info */
  private skeletonRenderPass: RenderPass;

  /* Scrub bar background rendering info */
  private sBackRenderPass: RenderPass;

  /* Cylinder rendering info */
  private cylinderRenderPass: RenderPass;
  private cylinder: Cylinder;

  /* Building rendering info */
  private buildingRenderPass: RenderPass;
  private buildings: Buildings;

  /* Global Rendering Info */
  private lightPosition: Vec4;
  private backgroundColor: Vec4;
  private lightRadians: number;

  private canvas2d: HTMLCanvasElement;
  private ctx2: CanvasRenderingContext2D | null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.canvas2d = document.getElementById("textCanvas") as HTMLCanvasElement;
    this.ctx2 = this.canvas2d.getContext("2d");
    if (this.ctx2) {
      this.ctx2.font = "25px serif";
      this.ctx2.fillStyle = "#ffffffff";
    }

    this.ctx = Debugger.makeDebugContext(this.ctx);
    let gl = this.ctx;

    this.floor = new Floor();
    this.cylinder = new Cylinder(10);

    this.city = new City(40, "Downtown");
    this.cityGround = new CityGround(this.city);

    this.cityGroundRenderPass = new RenderPass(
      this.extVAO,
      gl,
      cityGroundVSText,
      cityGroundFSText
    );

    this.floorRenderPass = new RenderPass(
      this.extVAO,
      gl,
      floorVSText,
      floorFSText
    );
    this.sceneRenderPass = new RenderPass(
      this.extVAO,
      gl,
      sceneVSText,
      sceneFSText
    );
    this.skeletonRenderPass = new RenderPass(
      this.extVAO,
      gl,
      skeletonVSText,
      skeletonFSText
    );
    this.cylinderRenderPass = new RenderPass(
      this.extVAO,
      gl,
      cylinderVSText,
      cylinderFSText
    );
    this.buildingRenderPass = new RenderPass(
      this.extVAO,
      gl,
      buildingVSText,
      buildingFSText
    );

    this.gui = new GUI(this.canvas2d, this);
    this.lightRadians = 0;
    this.lightPosition = new Vec4([
      50 * Math.cos(this.lightRadians),
      50,
      50 * Math.sin(this.lightRadians),
      1,
    ]);
    this.backgroundColor = new Vec4([0.0, 0.37254903, 0.37254903, 1.0]);

    this.initCityGround();

    this.initFloor();

    this.buildings = new Buildings(this.city);
    this.initBuildings();
    this.scene = new CLoader("");

    // Status bar
    this.sBackRenderPass = new RenderPass(
      this.extVAO,
      gl,
      sBackVSText,
      sBackFSText
    );

    // TODO
    // Other initialization, for instance, for the bone highlighting

    this.initGui();

    this.millis = new Date().getTime();

    // Initialization for keyframes
    this.keyframes = [];
  }

  public addKeyframe(keyframe: Keyframe) {
    this.keyframes.push(keyframe);
  }

  public getNumKeyframes() {
    return this.keyframes.length;
  }

  public getScene(): CLoader {
    return this.scene;
  }

  /**
   * Setup the animation. This can be called again to reset the animation.
   */
  public reset(): void {
    this.gui.reset();
    this.setScene(this.loadedScene);
  }

  public initGui(): void {
    // Status bar background
    let verts = new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]);
    this.sBackRenderPass.setIndexBufferData(
      new Uint32Array([1, 0, 2, 2, 0, 3])
    );
    this.sBackRenderPass.addAttribute(
      "vertPosition",
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      verts
    );

    this.sBackRenderPass.setDrawData(
      this.ctx.TRIANGLES,
      6,
      this.ctx.UNSIGNED_INT,
      0
    );
    this.sBackRenderPass.setup();
  }

  public initScene(): void {
    if (this.scene.meshes.length === 0) {
      return;
    }
    //this.initModel();
    //this.initSkeleton();
    //this.initCylinder();
    this.gui.reset();
  }

  public initBuildings(){
    this.buildingRenderPass.setIndexBufferData(this.buildings.getIndices());

    this.buildingRenderPass.addTextureMap("windows.jpg", buildingVSText, buildingTextureFSText);

    this.buildingRenderPass.addAttribute("uv", 2, this.ctx.FLOAT, false,
        2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.buildings.getUV());

    this.buildingRenderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.buildings.getVertices());
    
      this.buildingRenderPass.addAttribute("normal", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.buildings.getNormals());

    this.buildingRenderPass.addUniform(
      "mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(new Mat4().setIdentity().all())
        );
      }
    );
    this.buildingRenderPass.addUniform(
      "mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().all())
        );
      }
    );
    this.buildingRenderPass.addUniform(
      "mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().all())
        );
      }
    );
    this.buildingRenderPass.addUniform(
      "lightPosition",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
      }
    );

    this.buildingRenderPass.setDrawData(
      this.ctx.TRIANGLES,
      this.buildings.getIndices().length,
      this.ctx.UNSIGNED_INT,
      0
    );
    this.buildingRenderPass.setup();
  }

  public initCylinder(): void {
    this.cylinderRenderPass.setIndexBufferData(this.cylinder.indicesFlatMap());

    this.cylinderRenderPass.addAttribute(
      "vertPosition",
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cylinder.positionsFlatMap()
    );

    this.cylinderRenderPass.addUniform(
      "mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(new Mat4().setIdentity().all())
        );
      }
    );
    this.cylinderRenderPass.addUniform(
      "mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().all())
        );
      }
    );
    this.cylinderRenderPass.addUniform(
      "mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().all())
        );
      }
    );

    this.cylinderRenderPass.addUniform(
      "initialTrans",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix3fv(
          loc,
          false,
          new Float32Array(
            this.getScene()
              .meshes[0].bones[
                getHighlightedBoneIndex()
              ].initialTransformation.toMat3()
              .all()
          )
        );
      }
    );

    this.cylinderRenderPass.addUniform(
      "bTrans",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform3fv(
          loc,
          this.getScene().meshes[0].bones[getHighlightedBoneIndex()].position
            .xyz
        );
      }
    );

    this.cylinderRenderPass.addUniform(
      "bRot",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(
          loc,
          this.getScene().meshes[0].bones[getHighlightedBoneIndex()].rotation
            .xyzw
        );
      }
    );

    this.cylinderRenderPass.addUniform(
      "length",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform1f(
          loc,
          this.getScene().meshes[0].bones[getHighlightedBoneIndex()].length
        );
      }
    );

    this.cylinderRenderPass.setDrawData(
      this.ctx.LINES,
      this.cylinder.indicesFlatMap().length,
      this.ctx.UNSIGNED_INT,
      0
    );
    this.cylinderRenderPass.setup();
  }

  /**
   * Sets up the mesh and mesh drawing
   */
  public initModel(): void {
    this.sceneRenderPass = new RenderPass(
      this.extVAO,
      this.ctx,
      sceneVSText,
      sceneFSText
    );

    if (this.scene.meshes[0].imgSrc !== null) {
      this.sceneRenderPass.addTextureMap(
        this.scene.meshes[0].imgSrc,
        sceneVSText,
        sceneTextureFSText
      );
    }

    let faceCount = this.scene.meshes[0].geometry.position.count / 3;
    let fIndices = new Uint32Array(faceCount * 3);
    for (let i = 0; i < faceCount * 3; i += 3) {
      fIndices[i] = i;
      fIndices[i + 1] = i + 1;
      fIndices[i + 2] = i + 2;
    }
    this.sceneRenderPass.setIndexBufferData(fIndices);

    this.sceneRenderPass.addAttribute(
      "vertPosition",
      3,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].geometry.position.values
    );
    this.sceneRenderPass.addAttribute(
      "aNorm",
      3,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].geometry.normal.values
    );
    if (this.scene.meshes[0].geometry.uv) {
      this.sceneRenderPass.addAttribute(
        "aUV",
        2,
        this.ctx.FLOAT,
        false,
        2 * Float32Array.BYTES_PER_ELEMENT,
        0,
        undefined,
        this.scene.meshes[0].geometry.uv.values
      );
    } else {
      this.sceneRenderPass.addAttribute(
        "aUV",
        2,
        this.ctx.FLOAT,
        false,
        2 * Float32Array.BYTES_PER_ELEMENT,
        0,
        undefined,
        new Float32Array(this.scene.meshes[0].geometry.normal.values.length)
      );
    }
    this.sceneRenderPass.addAttribute(
      "skinIndices",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].geometry.skinIndex.values
    );
    this.sceneRenderPass.addAttribute(
      "skinWeights",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].geometry.skinWeight.values
    );
    this.sceneRenderPass.addAttribute(
      "v0",
      3,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].geometry.v0.values
    );
    this.sceneRenderPass.addAttribute(
      "v1",
      3,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].geometry.v1.values
    );
    this.sceneRenderPass.addAttribute(
      "v2",
      3,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].geometry.v2.values
    );
    this.sceneRenderPass.addAttribute(
      "v3",
      3,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].geometry.v3.values
    );

    this.sceneRenderPass.addUniform(
      "lightPosition",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
      }
    );
    this.sceneRenderPass.addUniform(
      "mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(new Mat4().setIdentity().all())
        );
      }
    );
    this.sceneRenderPass.addUniform(
      "mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().all())
        );
      }
    );
    this.sceneRenderPass.addUniform(
      "mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().all())
        );
      }
    );
    this.sceneRenderPass.addUniform(
      "jTrans",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform3fv(loc, this.scene.meshes[0].getBoneTranslations());
      }
    );
    this.sceneRenderPass.addUniform(
      "jRots",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.scene.meshes[0].getBoneRotations());
      }
    );

    this.sceneRenderPass.setDrawData(
      this.ctx.TRIANGLES,
      this.scene.meshes[0].geometry.position.count,
      this.ctx.UNSIGNED_INT,
      0
    );
    this.sceneRenderPass.setup();
  }

  /**
   * Sets up the skeleton drawing
   */
  public initSkeleton(): void {
    this.skeletonRenderPass.setIndexBufferData(
      this.scene.meshes[0].getBoneIndices()
    );

    this.skeletonRenderPass.addAttribute(
      "vertPosition",
      3,
      this.ctx.FLOAT,
      false,
      3 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].getBonePositions()
    );

    this.skeletonRenderPass.addAttribute(
      "boneIndex",
      1,
      this.ctx.FLOAT,
      false,
      1 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.scene.meshes[0].getBoneIndexAttribute()
    );

    this.skeletonRenderPass.addUniform(
      "mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
      }
    );
    this.skeletonRenderPass.addUniform(
      "mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().all())
        );
      }
    );
    this.skeletonRenderPass.addUniform(
      "mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().all())
        );
      }
    );
    this.skeletonRenderPass.addUniform(
      "bTrans",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform3fv(loc, this.getScene().meshes[0].getBoneTranslations());
      }
    );
    this.skeletonRenderPass.addUniform(
      "bRots",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.getScene().meshes[0].getBoneRotations());
      }
    );

    this.skeletonRenderPass.setDrawData(
      this.ctx.LINES,
      this.scene.meshes[0].getBoneIndices().length,
      this.ctx.UNSIGNED_INT,
      0
    );
    this.skeletonRenderPass.setup();
  }

  /**
   * Sets up the city ground drawing
   */
  public initCityGround(): void {
    this.cityGroundRenderPass.addTextureMap(this.cityGround.getTextureSrc());

    this.cityGroundRenderPass.setIndexBufferData(this.cityGround.indicesFlat());
    this.cityGroundRenderPass.addAttribute(
      "aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cityGround.positionsFlat()
    );

    this.cityGroundRenderPass.addAttribute(
      "aUV",
      2,
      this.ctx.FLOAT,
      false,
      2 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.cityGround.getUVValuesFlat()
    );

    this.cityGroundRenderPass.addUniform(
      "uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
      }
    );
    this.cityGroundRenderPass.addUniform(
      "uWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
      }
    );
    this.cityGroundRenderPass.addUniform(
      "uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().all())
        );
      }
    );
    this.cityGroundRenderPass.addUniform(
      "uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().all())
        );
      }
    );
    this.cityGroundRenderPass.addUniform(
      "uProjInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().inverse().all())
        );
      }
    );
    this.cityGroundRenderPass.addUniform(
      "uViewInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().inverse().all())
        );
      }
    );

    this.cityGroundRenderPass.setDrawData(
      this.ctx.TRIANGLES,
      this.cityGround.indicesFlat().length,
      this.ctx.UNSIGNED_INT,
      0
    );
    this.cityGroundRenderPass.setup();
  }

  /**
   * Sets up the floor drawing
   */
  public initFloor(): void {
    this.floorRenderPass.setIndexBufferData(this.floor.indicesFlat());
    this.floorRenderPass.addAttribute(
      "aVertPos",
      4,
      this.ctx.FLOAT,
      false,
      4 * Float32Array.BYTES_PER_ELEMENT,
      0,
      undefined,
      this.floor.positionsFlat()
    );

    this.floorRenderPass.addUniform(
      "uLightPos",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
      }
    );
    this.floorRenderPass.addUniform(
      "uWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(loc, false, new Float32Array(Mat4.identity.all()));
      }
    );
    this.floorRenderPass.addUniform(
      "uProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().all())
        );
      }
    );
    this.floorRenderPass.addUniform(
      "uView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().all())
        );
      }
    );
    this.floorRenderPass.addUniform(
      "uProjInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().inverse().all())
        );
      }
    );
    this.floorRenderPass.addUniform(
      "uViewInv",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().inverse().all())
        );
      }
    );

    this.floorRenderPass.setDrawData(
      this.ctx.TRIANGLES,
      this.floor.indicesFlat().length,
      this.ctx.UNSIGNED_INT,
      0
    );
    this.floorRenderPass.setup();
  }

  /** @internal
   * Draws a single frame
   *
   */
  public draw(): void {
    // Advance to the next time step
    let curr = new Date().getTime();
    let deltaT = curr - this.millis;
    this.millis = curr;
    deltaT /= 1000;
    this.getGUI().incrementTime(deltaT);

    // TODO
    // If the mesh is animating, probably you want to do some updating of the skeleton state here
    if (this.getGUI().mode === Mode.playback) {
      let kfIndex = Math.floor(this.getGUI().getTime());
      let interpolationTime = this.getGUI().getTime() % 1;
      for (let parentIndex of Keyframe.parentIndices) {
        interpolateSkeleton(
          this.scene.meshes[0],
          parentIndex,
          this.keyframes[kfIndex],
          this.keyframes[kfIndex + 1],
          interpolationTime
        );
      }
    }

    // draw the status message
    if (this.ctx2) {
      this.ctx2.clearRect(
        0,
        0,
        this.ctx2.canvas.width,
        this.ctx2.canvas.height
      );
      if (this.scene.meshes.length > 0) {
        this.ctx2.fillText(this.getGUI().getModeString(), 50, 710);
      }
    }

    // Drawing
    const gl: WebGLRenderingContext = this.ctx;
    const bg: Vec4 = this.backgroundColor;
    gl.clearColor(bg.r, bg.g, bg.b, bg.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // null is the default frame buffer
    this.drawScene(0, 200, 800, 600);

    /* Draw status bar */
    if (this.scene.meshes.length > 0) {
      gl.viewport(0, 0, 800, 200);
      this.sBackRenderPass.draw();
    }
  }

  private drawScene(x: number, y: number, width: number, height: number): void {
    const gl: WebGLRenderingContext = this.ctx;
    gl.viewport(x, y, width, height);
    this.lightRadians += 0.002;
    this.lightPosition.x = 50 * Math.cos(this.lightRadians);
    this.lightPosition.z = 50 * Math.sin(this.lightRadians);
    this.floorRenderPass.draw();

    this.cityGroundRenderPass.draw();

    this.buildingRenderPass.draw();

    /* Draw Scene */
    /*if (this.scene.meshes.length > 0) {

      //this.sceneRenderPass.draw();
      gl.disable(gl.DEPTH_TEST);
      //this.skeletonRenderPass.draw();
      // TODO
      // Also draw the highlighted bone (if applicable)
      //if (getHighlightedBoneIndex() !== null) {
      //  this.cylinderRenderPass.draw();
      //}
      gl.enable(gl.DEPTH_TEST);      
    }*/
  }

  public getGUI(): GUI {
    return this.gui;
  }

  /**
   * Creates a new city.
   * @param citySize The size of the new city.
   */
  public initCity(citySize: number): void {
    this.city = new City(citySize, "Downtown");
    this.cityGround = new CityGround(this.city);
    this.buildings = new Buildings(this.city);
    this.initCityGround();
    this.initBuildings();
    this.gui.reset();
  }

  /**
   * Loads and sets the scene from a Collada file
   * @param fileLocation URI for the Collada file
   */
  public setScene(fileLocation: string): void {
    this.loadedScene = fileLocation;
    this.scene = new CLoader(fileLocation);
    this.scene.load(() => this.initScene());
    this.keyframes = [];
  }
}

export function initializeCanvas(): void {
  const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;
  /* Start drawing */
  const canvasAnimation: SkinningAnimation = new SkinningAnimation(canvas);
  canvasAnimation.start();
  canvasAnimation.setScene("/static/assets/skinning/split_cube.dae");
}
