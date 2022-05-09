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
  floorFSText,
  floorVSText,
  sBackVSText,
  sBackFSText,
  buildingFSText,
  buildingVSText,
  buildingTextureFSText,
  buildingTextureVSText
} from "./Shaders.js";
import { Mat4, Vec4, Vec3 } from "../lib/TSM.js";
import { CLoader } from "./AnimationFileLoader.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";
import { Camera } from "../lib/webglutils/Camera.js";

import { CityGround } from "../lib/webglutils/CityGround.js";

import { Keyframe, interpolateSkeleton } from "./Utils.js";
import { Building, Buildings } from "./buildingGeneration.js";
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

  /* Scrub bar background rendering info */
  private sBackRenderPass: RenderPass;

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

    this.city = new City(20, "Downtown");
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

    // Initializes individual renderpasses
    /*for(var i = 0;i < this.buildings.buildings.length; i++){
      this.buildings.buildings[i].renderPass = new RenderPass(this.extVAO, gl, buildingVSText, buildingFSText);
      this.initSingleBuilding(this.buildings.buildings[i]);
    }*/

    // Status bar
    this.sBackRenderPass = new RenderPass(
      this.extVAO,
      gl,
      sBackVSText,
      sBackFSText
    );

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
    this.gui.reset();
  }

  public initBuildings(){
    this.buildingRenderPass.setIndexBufferData(this.buildings.getIndices());

    // Currently only textures for skyscrapers are supported
    if(this.city.type == "Downtown") {
      console.log("Adding UV");
      this.buildingRenderPass.addTextureMap("cityGeneration/windows.jpg", buildingTextureVSText, buildingTextureFSText);

      this.buildingRenderPass.addAttribute("uv", 2, this.ctx.FLOAT, false,
          2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, this.buildings.getUV());
    }

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

  /* Used to add a renderpass for each individual building */
  public initSingleBuilding(b: Building) {
    b.renderPass.setIndexBufferData(b.indicesFlat);

    var textures = ["cityGeneration/windows.jpg","cityGeneration/windows2.jpeg","cityGeneration/windows3.jpeg"]
    var textureFile = textures[Math.floor(Math.random()*3)];

    b.renderPass.addTextureMap(textureFile, buildingVSText, buildingTextureFSText);

    b.renderPass.addAttribute("uv", 2, this.ctx.FLOAT, false,
        2 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, b.uvFlat);

    b.renderPass.addAttribute("vertPosition", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, b.verticesFlat);
    
    b.renderPass.addAttribute("normal", 3, this.ctx.FLOAT, false,
      3 * Float32Array.BYTES_PER_ELEMENT, 0, undefined, b.normalsFlat);

    b.renderPass.addUniform(
      "mWorld",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(new Mat4().setIdentity().all())
        );
      }
    );
    b.renderPass.addUniform(
      "mProj",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.projMatrix().all())
        );
      }
    );
    b.renderPass.addUniform(
      "mView",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniformMatrix4fv(
          loc,
          false,
          new Float32Array(this.gui.viewMatrix().all())
        );
      }
    );
    b.renderPass.addUniform(
      "lightPosition",
      (gl: WebGLRenderingContext, loc: WebGLUniformLocation) => {
        gl.uniform4fv(loc, this.lightPosition.xyzw);
      }
    );

    b.renderPass.setDrawData(
      this.ctx.TRIANGLES,
      b.indices.length,
      this.ctx.UNSIGNED_INT,
      0
    );
    b.renderPass.setup();
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
    // Code uses individual renderpasses to draw buildings
    /*for(var i = 0;i < this.buildings.buildings.length; i++){
      this.buildings.buildings[i].renderPass.draw();
    }*/
  }

  public getGUI(): GUI {
    return this.gui;
  }

  /**
   * Creates a new city.
   * @param citySize The size of the new city.
   */
  public initCity(citySize: number, cityType: string): void {
    this.city = new City(citySize, cityType);
    this.buildingRenderPass = new RenderPass(
      this.extVAO,
      this.ctx,
      buildingVSText,
      buildingFSText
    );
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
