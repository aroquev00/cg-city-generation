import { Camera } from "../lib/webglutils/Camera.js";
import { CanvasAnimation } from "../lib/webglutils/CanvasAnimation.js";
import { SkinningAnimation } from "./App.js";
import { Mat4, Vec3, Vec4, Vec2, Mat2, Quat } from "../lib/TSM.js";
import { Bone, Mesh } from "./Scene.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";

import { getRayThroughMouse, rayBoneIntersection, rotateBone, getBoneTNBCoordSystem, Keyframe } from "./Utils.js";
import { debug, setHighlightedBoneIndex, getHighlightedBoneIndex } from "./App.js";

/**
 * Might be useful for designing any animation GUI
 */
interface IGUI {
  viewMatrix(): Mat4;
  projMatrix(): Mat4;
  dragStart(me: MouseEvent): void;
  drag(me: MouseEvent): void;
  dragEnd(me: MouseEvent): void;
  onKeydown(ke: KeyboardEvent): void;
}

export enum Mode {
  playback,  
  edit  
}

/**
 * Handles Mouse and Button events along with
 * the the camera.
 */

export class GUI implements IGUI {
  private static readonly rotationSpeed: number = 0.05;
  private static readonly zoomSpeed: number = 0.1;
  private static readonly rollSpeed: number = 0.1;
  private static readonly panSpeed: number = 0.1;

  private camera: Camera;
  private dragging: boolean;
  private fps: boolean;
  private prevX: number;
  private prevY: number;

  private height: number;
  private viewPortHeight: number;
  private width: number;

  private animation: SkinningAnimation;

  public time: number;
  
  public mode: Mode;
  

  public hoverX: number = 0;
  public hoverY: number = 0;

  private draggingBone: boolean;
  
  private shiftKeyActive: boolean;

  /**
   *
   * @param canvas required to get the width and height of the canvas
   * @param animation required as a back pointer for some of the controls
   * @param sponge required for some of the controls
   */
  constructor(canvas: HTMLCanvasElement, animation: SkinningAnimation) {
    this.height = canvas.height;
    this.viewPortHeight = this.height - 200;
    this.width = canvas.width;
    this.prevX = 0;
    this.prevY = 0;
    
    this.animation = animation;
    
    this.reset();
    
    this.registerEventListeners(canvas);
  }

  public getNumKeyFrames(): number {
    // TODO
    // Used in the status bar in the GUI
    return this.animation.getNumKeyframes();
  }
  public getTime(): number { return this.time; }
  
  public getMaxTime(): number { 
    // TODO
    // The animation should stop after the last keyframe
    return this.animation.getNumKeyframes() - 1;
  }

  /**
   * Resets the state of the GUI
   */
  public reset(): void {
    const cameraPosX = this.animation.city.size / 2;
    const cameraHeight = this.animation.city.size;

    this.fps = false;
    this.dragging = false;
    this.time = 0;
    this.mode = Mode.edit;
    this.camera = new Camera(
      new Vec3([cameraPosX, cameraHeight, cameraPosX]),
      new Vec3([cameraPosX, 0, cameraPosX]),
      new Vec3([0, 0, 1]),
      45,
      this.width / this.viewPortHeight,
      0.1,
      1000.0
    );
  }

  /**
   * Sets the GUI's camera to the given camera
   * @param cam a new camera
   */
  public setCamera(
    pos: Vec3,
    target: Vec3,
    upDir: Vec3,
    fov: number,
    aspect: number,
    zNear: number,
    zFar: number
  ) {
    this.camera = new Camera(pos, target, upDir, fov, aspect, zNear, zFar);
  }

  /**
   * Returns the view matrix of the camera
   */
  public viewMatrix(): Mat4 {
    return this.camera.viewMatrix();
  }

  /**
   * Returns the projection matrix of the camera
   */
  public projMatrix(): Mat4 {
    return this.camera.projMatrix();
  }

  /**
   * Callback function for the start of a drag event.
   * @param mouse
   */
  public dragStart(mouse: MouseEvent): void {
    if (mouse.offsetY > 600) {
      // outside the main panel
      return;
    }
    
    // TODO
    // Some logic to rotate the bones, instead of moving the camera, if there is a currently highlighted bone
    /*if (this.checkIfMouseIntersectsBone(mouse.offsetX, mouse.offsetY)) {
      this.draggingBone = true;
    } else {
      this.dragging = true;
    }*/
    this.dragging = true;
    this.prevX = mouse.screenX;
    this.prevY = mouse.screenY;

  }

  public incrementTime(dT: number): void {
    if (this.mode === Mode.playback) {
      this.time += dT;
      if (this.time >= this.getMaxTime()) {
        this.time = 0;
        this.mode = Mode.edit;
      }
    }
  }

  /**
   * The callback function for a drag event.
   * This event happens after dragStart and
   * before dragEnd.
   * @param mouse
   */
  public drag(mouse: MouseEvent): void {
    let x = mouse.offsetX;
    let y = mouse.offsetY;
    if (this.dragging) {
      const dx = mouse.screenX - this.prevX;
      const dy = mouse.screenY - this.prevY;
      this.prevX = mouse.screenX;
      this.prevY = mouse.screenY;

      /* Left button, or primary button */
      const mouseDir: Vec3 = this.camera.right();
      mouseDir.scale(-dx);
      mouseDir.add(this.camera.up().scale(dy));
      mouseDir.normalize();

      if (dx === 0 && dy === 0) {
        return;
      }

      switch (mouse.buttons) {
        case 1: {
          let rotAxis: Vec3 = Vec3.cross(this.camera.forward(), mouseDir);
          rotAxis = rotAxis.normalize();

          if (this.fps) {
            this.camera.rotate(rotAxis, GUI.rotationSpeed);
          } else {
            this.camera.orbitTarget(rotAxis, GUI.rotationSpeed);
          }
          break;
        }
        case 2: {
          /* Right button, or secondary button */
          this.camera.offsetDist(Math.sign(mouseDir.y) * GUI.zoomSpeed);
          break;
        }
        default: {
          break;
        }
      }
    } 
    
    // TODO
    // You will want logic here:
    // 1) To highlight a bone, if the mouse is hovering over a bone;
    // 2) To rotate a bone, if the mouse button is pressed and currently highlighting a bone.
    /*if (this.draggingBone) {
      // Work on rotating the bone.
      let inverse = new Mat4();
      this.camera.projMatrix().multiply(this.camera.viewMatrix(), inverse);
      inverse.inverse();
      var x1 = 1 - (mouse.screenX / this.width) * 2;
      var y1 = 1 - (mouse.screenY / this.height) * 2;
      var z1 = -1;

      var x2 = 1 - (this.prevX / this.width) * 2;
      var y2 = 1 - (this.prevY / this.height) * 2;
      var z2 = 1;

      this.prevX = mouse.screenX;
      this.prevY = mouse.screenY;

      var world1 = inverse.multiplyVec3(new Vec3([x2,y1,z1]));
      var world2 = inverse.multiplyVec3(new Vec3([x1,y2,z2]));

      var mouseDirection = Vec3.difference(world1, world2).normalize();
      var lookDirection = this.camera.forward();
      var rotateAxis = Vec3.cross(mouseDirection, lookDirection);
      if(!rotateAxis.equals(new Vec3([0,0,0]))) { 
        rotateAxis.normalize()
        rotateBone(this.animation.getScene().meshes[0], getHighlightedBoneIndex(), rotateAxis, GUI.rotationSpeed, this.animation.getScene().meshes[0].bones[getHighlightedBoneIndex()].endpoint.copy());
      }
    } else {
      // Just highlight bone
      this.checkIfMouseIntersectsBone(mouse.offsetX, mouse.offsetY);
    }*/
  }

  private checkIfMouseIntersectsBone(mouseX: number, mouseY: number) {
    let rayCast = getRayThroughMouse(mouseX, mouseY, this.width, this.viewPortHeight, this.camera);
    if (debug) {
      console.log("RAY INFO");
      console.log(rayCast);
    }
    let boneIndex = rayBoneIntersection(rayCast, this.animation.getScene().meshes[0]);
    setHighlightedBoneIndex(boneIndex);
    if (boneIndex !== null) {
      return true;
    } else {
      return false;
    }
  }

  public getModeString(): string {
    switch (this.mode) {
      case Mode.edit: { return "edit: " + this.getNumKeyFrames() + " keyframes"; }
      case Mode.playback: { return "playback: " + this.getTime().toFixed(2) + " / " + this.getMaxTime().toFixed(2); }
    }
  }

  /**
   * Callback function for the end of a drag event
   * @param mouse
   */
  public dragEnd(mouse: MouseEvent): void {
    this.dragging = false;
    this.prevX = 0;
    this.prevY = 0;
    
    // TODO
    // Maybe your bone highlight/dragging logic needs to do stuff here too
    this.draggingBone = false;
    
    this.shiftKeyActive = false;
  }

  /**
   * Callback function for a key press event
   * @param key
   */
  public onKeydown(key: KeyboardEvent): void {
    switch (key.code) {
      case "Digit1": {
        if (this.shiftKeyActive) {
          // Downtown
          this.animation.initCity(this.animation.city.size, "Downtown");
        } else {
          this.animation.initCity(10, this.animation.city.type);
        }
        break;
      }
      case "Digit2": {
        if (this.shiftKeyActive) {
          // Downtown
          this.animation.initCity(this.animation.city.size, "Residential");
        } else {
          this.animation.initCity(20, this.animation.city.type);
        }
        break;
      }
      case "Digit3": {
        if (this.shiftKeyActive) {
        } else {
          this.animation.initCity(30, this.animation.city.type);
        }
        break;
      }      
      case "Digit4": {
        if (this.shiftKeyActive) {
        } else {
          this.animation.initCity(40, this.animation.city.type);
        }
        break;
      }
      case "Digit5": {
        if (this.shiftKeyActive) {
        } else {
          this.animation.initCity(50, this.animation.city.type);
        }
        break;
      }
      case "Digit6": {
        if (this.shiftKeyActive) {
        } else {
          this.animation.initCity(60, this.animation.city.type);
        }
        break;
      }
      case "Digit7": {
        if (this.shiftKeyActive) {
        } else {
          this.animation.initCity(70, this.animation.city.type);
        }
        break;
      }
      case "Digit8": {
        if (this.shiftKeyActive) {
        } else {
          this.animation.initCity(80, this.animation.city.type);
        }
        break;
      }
      case "Digit9": {
        if (this.shiftKeyActive) {
        } else {
          this.animation.initCity(90, this.animation.city.type);
        }
        break;
      }
      case "KeyW": {
        this.camera.offset(
            this.camera.forward().negate(),
            GUI.zoomSpeed,
            true
          );
        break;
      }
      case "KeyA": {
        this.camera.offset(this.camera.right().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyS": {
        this.camera.offset(this.camera.forward(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyD": {
        this.camera.offset(this.camera.right(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyR": {
        this.animation.reset();
        break;
      }
      case "ArrowLeft": {
        if (getHighlightedBoneIndex() !== null) {
          let tangentAxis = getBoneTNBCoordSystem(this.animation.getScene().meshes[0].bones[getHighlightedBoneIndex()]);
          rotateBone(this.animation.getScene().meshes[0], getHighlightedBoneIndex(), tangentAxis.tangent, -GUI.rollSpeed, this.animation.getScene().meshes[0].bones[getHighlightedBoneIndex()].endpoint.copy())
        } else {
          this.camera.roll(GUI.rollSpeed, false);
        }
        break;
      }
      case "ArrowRight": {
        if (getHighlightedBoneIndex() !== null) {
          let tangentAxis = getBoneTNBCoordSystem(this.animation.getScene().meshes[0].bones[getHighlightedBoneIndex()]);
          rotateBone(this.animation.getScene().meshes[0], getHighlightedBoneIndex(), tangentAxis.tangent, GUI.rollSpeed, this.animation.getScene().meshes[0].bones[getHighlightedBoneIndex()].endpoint.copy())
        } else {
          this.camera.roll(GUI.rollSpeed, true);
        }
        break;
      }
      case "ArrowUp": {
        this.camera.offset(this.camera.up(), GUI.zoomSpeed, true);
        break;
      }
      case "ArrowDown": {
        this.camera.offset(this.camera.up().negate(), GUI.zoomSpeed, true);
        break;
      }
      case "KeyK": {
        if (this.mode === Mode.edit) {
            // TODO
            // Add keyframe
            let newKeyframe = new Keyframe(this.time);
            this.time += 1;
            this.animation.getScene().meshes[0].bones.forEach((bone, index) => {
              newKeyframe.rotations.push(bone.rotation.copy());
              if (bone.parent === -1) {
                Keyframe.parentIndices.push(index)
              }
            });
            this.animation.addKeyframe(newKeyframe);
        }
        break;
      }      
      case "KeyP": {
        if (this.mode === Mode.edit && this.getNumKeyFrames() > 1)
        {
          this.mode = Mode.playback;
          this.time = 0;
        } else if (this.mode === Mode.playback) {
          this.mode = Mode.edit;
        }
        break;
      }
      case "ShiftLeft": {
      }
      case "ShiftRight": {
        this.shiftKeyActive = true;
        break;
      }
      default: {
        console.log("Key : '", key.code, "' was pressed.");
        break;
      }
    }
  }

  private onKeyup(key: KeyboardEvent): void {
    switch(key.code) {
      case "ShiftLeft": {
      }
      case "ShiftRight": {
        this.shiftKeyActive = false;
        break;
      }
    }
  }

  /**
   * Registers all event listeners for the GUI
   * @param canvas The canvas being used
   */
  private registerEventListeners(canvas: HTMLCanvasElement): void {
    /* Event listener for key controls */
    window.addEventListener("keydown", (key: KeyboardEvent) =>
      this.onKeydown(key)
    );

    window.addEventListener("keyup", (key: KeyboardEvent) => 
      this.onKeyup(key)
    );

    /* Event listener for mouse controls */
    canvas.addEventListener("mousedown", (mouse: MouseEvent) =>
      this.dragStart(mouse)
    );

    canvas.addEventListener("mousemove", (mouse: MouseEvent) =>
      this.drag(mouse)
    );

    canvas.addEventListener("mouseup", (mouse: MouseEvent) =>
      this.dragEnd(mouse)
    );

    /* Event listener to stop the right click menu */
    canvas.addEventListener("contextmenu", (event: any) =>
      event.preventDefault()
    );
  }
}
