import { Mat4, Vec2, Vec3, Vec4 } from "../TSM.js";
import { MaterialObject } from "./Objects.js";

import { City } from "../../cityGeneration/cityGeneration.js";
import { Direction } from "../../cityGeneration/cityEnums.js";

export class CityGround implements MaterialObject {
  private cityModel: City;

  private floorY: GLfloat = 0;
  private vertices: Vec4[] = [];
  private ind: Vec3[] = [];
  private norms: Vec4[] = [];
  private uvs: Vec2[] = [];

  private verticesF32: Float32Array;
  private indicesU32: Uint32Array;
  private normalsF32: Float32Array;
  private uvsF32: Float32Array;

  constructor(city: City) {
    // Build city model.
    this.cityModel = city;

    city.streetsPos.forEach((streetNode, idx) => {
      const x = streetNode[0];
      const y = streetNode[1];

      // Set up vertices, their normals, and UV values.
      // Left bottom edge. # 2
      this.vertices.push(new Vec4([x, this.floorY, y, 1]));
      this.norms.push(new Vec4([0, 1, 0, 1]));
      this.uvs.push(
        this.cityModel.map[x][y].direction === Direction.North ||
          this.cityModel.map[x][y].direction === Direction.South
          ? new Vec2([0, 0])
          : new Vec2([1, 0])
      );

      // Right bottom edge. 3 1
      this.vertices.push(new Vec4([x + 1, this.floorY, y, 1]));
      this.norms.push(new Vec4([0, 1, 0, 1]));
      this.uvs.push(
        this.cityModel.map[x][y].direction === Direction.North ||
          this.cityModel.map[x][y].direction === Direction.South
          ? new Vec2([1, 0])
          : new Vec2([1, 1])
      );

      // Left top edge. 1 3
      this.vertices.push(new Vec4([x, this.floorY, y + 1, 1]));
      this.norms.push(new Vec4([0, 1, 0, 1]));
      this.uvs.push(
        this.cityModel.map[x][y].direction === Direction.North ||
          this.cityModel.map[x][y].direction === Direction.South
          ? new Vec2([0, 1])
          : new Vec2([0, 0])
      );

      // Right top edge. 2 #
      this.vertices.push(new Vec4([x + 1, this.floorY, y + 1, 1]));
      this.norms.push(new Vec4([0, 1, 0, 1]));
      this.uvs.push(
        this.cityModel.map[x][y].direction === Direction.North ||
          this.cityModel.map[x][y].direction === Direction.South
          ? new Vec2([1, 1])
          : new Vec2([0, 1])
      );

      // Set up indices.
      const iterNum = idx * 4;
      this.ind.push(new Vec3([iterNum + 2, iterNum + 3, iterNum + 1]));
      this.ind.push(new Vec3([iterNum + 1, iterNum, iterNum + 2]));
    });

    /* Flatten Position. */
    this.verticesF32 = new Float32Array(this.vertices.length * 4);
    this.vertices.forEach((v: Vec4, i: number) => {
      this.verticesF32.set(v.xyzw, i * 4);
    });
    console.assert(this.verticesF32 != null);

    /* Set indices. */
    console.assert(this.ind != null);

    /* Flatten Indices. */
    this.indicesU32 = new Uint32Array(this.ind.length * 3);
    this.ind.forEach((v: Vec3, i: number) => {
      this.indicesU32.set(v.xyz, i * 3);
    });
    console.assert(this.indicesU32 != null);

    /* Set Normals. */
    this.normalsF32 = new Float32Array(this.norms.length * 4);
    this.norms.forEach((v: Vec4, i: number) => {
      this.normalsF32.set(v.xyzw, i * 4);
    });

    /* Set UVs. */
    console.assert(this.uvs != null);

    /* Flatten UVs. */
    this.uvsF32 = new Float32Array(this.uvs.length * 2);
    this.uvs.forEach((v: Vec2, i: number) => {
      this.uvsF32.set(v.xy, i * 2);
    });
  }

  public positions(): Vec4[] {
    return this.vertices;
  }

  public positionsFlat(): Float32Array {
    return this.verticesF32;
  }

  public colors(): Vec4[] {
    throw new Error("Floor::colors() incomplete method");
    return [];
  }

  public colorsFlat(): Float32Array {
    throw new Error("Floor::colorsFlat() incomplete method");
    return new Float32Array([]);
  }

  public setColors(colors: Vec4[]): void {
    throw new Error("Floor::setColors() incomplete method");
  }

  public indices(): Vec3[] {
    return this.ind;
  }

  public indicesFlat(): Uint32Array {
    return this.indicesU32;
  }

  public uMatrix(): Mat4 {
    throw new Error("Floor::uMatrix() incomplete method");
    return new Mat4();
  }

  public scale(s: GLfloat): void {
    throw new Error("Floor::scale() incomplete method");
  }

  public translate(p: Vec3): void {
    throw new Error("Floor::translate() incomplete method");
  }

  public normals(): Vec4[] {
    return this.norms;
  }

  public normalsFlat(): Float32Array {
    return this.normalsF32;
  }

  public getUVValuesFlat(): Float32Array {
    return this.uvsF32;
  }

  public getTextureSrc(): string {
    //return "skinning/minecraft_tree_wood.jpg";
    return "cityGeneration/street.jpg";
  }
}
