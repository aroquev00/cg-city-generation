import { GroundType } from "../cityGeneration/cityEnums.js";
import { City } from "../cityGeneration/cityGeneration.js";
import { Mat4 } from "../lib/TSM.js";
import { RenderPass } from "../lib/webglutils/RenderPass.js";

const CELL_SIZE = 1;

export class Buildings {

    buildings: Building[];

    constructor(city: City) {
        this.buildings = [];

        for(let i = 0; i < city.map.length; i++){
            for(let j = 0; j < city.map[0].length; j++){
                if (city.map[i][j].type == GroundType.Block) {
                    this.buildings.push(new Building(i, j, Math.random() * 5, city.type));
                }
            }
        }
    }

    getVertices(): Float32Array {
        let values = [];
        for (let i = 0;i < this.buildings.length;i++){
            let b = this.buildings[i];
            values.push(...b.vertices);
        }
        return Float32Array.from(values);
    }

    getIndices(): Uint32Array {
        let values = [];
        let vertsSeen = 0;
        for (let i = 0;i < this.buildings.length;i++){
            let b = this.buildings[i];
            for(let j = 0;j<b.indices.length;j++){
                values.push(b.indices[j] + vertsSeen);
            }
            vertsSeen += b.vertices.length / 3;
        }
        return Uint32Array.from(values);
    }

    getNormals(): Float32Array {
        let values = [];
        for (let i = 0;i < this.buildings.length;i++){
            let b = this.buildings[i];
            values.push(...b.normals);
        }
        return Float32Array.from(values);
    }

    getUV(): Float32Array {
        let values = [];
        for (let i = 0;i < this.buildings.length;i++){
            let b = this.buildings[i];
            values.push(...b.uv);
        }
        return Float32Array.from(values);
    }
}


// Generates string/vertices from L-System
class BuildingBuilder {

}

const cubeVerts = [
    // Front face
     0.0,  0.0,  1.0,
     1.0,  0.0,  1.0,
     1.0,  1.0,  1.0,
     0.0,  1.0,  1.0,
  
    // Back face
     0.0,  0.0,  0.0,
     0.0,  1.0,  0.0,
     1.0,  1.0,  0.0,
     1.0,  0.0,  0.0,
  
    // Top face
     0.0,  1.0,  0.0,
     0.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0,  0.0,
  
    // Bottom face
     0.0,  0.0,  0.0,
     1.0,  0.0,  0.0,
     1.0,  0.0,  1.0,
     0.0,  0.0,  1.0,
  
    // Right face
     1.0,  0.0,  0.0,
     1.0,  1.0,  0.0,
     1.0,  1.0,  1.0,
     1.0,  0.0,  1.0,
  
    // Left face
     0.0,  0.0,  0.0,
     0.0,  0.0,  1.0,
     0.0,  1.0,  1.0,
     0.0,  1.0,  0.0,
];

const cubeUV = [
    // Front face
     0.0,  0.0,
     1.0,  0.0,
     1.0,  1.0,
     0.0,  1.0,
  
    // Back face
     0.0,  0.0,
     0.0,  1.0,
     1.0,  1.0,
     1.0,  0.0,
  
    // Top face
     0.0, 0.0,
     0.0, 1.0,
     1.0, 1.0,
     1.0, 0.0,
  
    // Bottom face
     0.0, 0.0,
     1.0, 0.0,
     1.0, 1.0,
     0.0, 1.0,
  
    // Right face
     0.0,  0.0,
     1.0,  0.0,
     1.0,  1.0,
     0.0,  1.0,
  
    // Left face
     0.0,  0.0,
     0.0,  1.0,
     1.0,  1.0,
     1.0,  0.0,
];

const cubeIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23,   // left
];

const cubeNormals = [
    // Front
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0, 
    0.0, 0.0, 1.0, 
    0.0, 0.0, 1.0, 

    // Back
    0.0, 0.0, -1.0, 
    0.0, 0.0, -1.0, 
    0.0, 0.0, -1.0, 
    0.0, 0.0, -1.0, 

    // Top
    0.0, 1.0, 0.0, 
    0.0, 1.0, 0.0, 
    0.0, 1.0, 0.0, 
    0.0, 1.0, 0.0, 

    // Bottom
    0.0, -1.0, 0.0, 
    0.0, -1.0, 0.0, 
    0.0, -1.0, 0.0, 
    0.0, -1.0, 0.0, 

    // Right
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,

    // Left
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,

];

const roofVerts = [
    0.0, 0.0, 0.0,
    0.0, 0.0, 1.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 1.0,

    0.0, 0.0, 0.0,
    0.0, 0.5, 0.5,
    1.0, 0.5, 0.5,
    1.0, 0.0, 0.0,

    1.0, 0.0, 1.0,
    1.0, 0.5, 0.5,
    0.0, 0.5, 0.5,
    0.0, 0.0, 1.0,

    0.0, 0.0, 1.0,
    0.0, 0.5, 0.5,
    0.0, 0.0, 0.0,

    1.0, 0.0, 0.0,
    1.0, 0.5, 0.5, 
    1.0, 0.0, 1.0
];

const roofIndices = [
    0, 2, 1,
    1, 2, 3,

    4, 5, 7,
    7, 5, 6,

    8, 9, 11,
    11, 9, 10,

    12, 13, 14,
    15, 16, 17
];

const roofNormals = [
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,

    -1.0, 1.0, 0.0, // normalize these
    -1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0,

    1.0, 1.0, 0.0,  // normalize too
    1.0, 1.0, 0.0,
    1.0, 1.0, 0.0,
    1.0, 1.0, 0.0,

    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0, 
    0.0, 0.0, -1.0,

    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0
]

// Contains all info for rendering
export class Building {
    private posX: number;
    private posY: number;
    private height: number;

    vertices: number[];
    normals: number[];
    indices: number[];
    uv: number[];

    verticesFlat: Float32Array;
    normalsFlat: Float32Array;
    indicesFlat: Uint32Array;
    uvFlat: Float32Array;

    renderPass: RenderPass;

    // roof type variable?

    constructor(posX, posY, height, type) {
        this.posX = posX;
        this.posY = posY;
        this.height = height;

        if(type == "Residential"){
            this.generateHouseVertices();
        }
        else if(type == "Downtown") {
            this.generateVertices();
        }

    }

    private generateVertices(){
        let clone = [...cubeVerts];
        for(let i = 0;i < clone.length;i+=3){
            clone[i] = clone[i] * .8 + this.posX * CELL_SIZE + .1;
            clone[i+1] = clone[i+1] * this.height * CELL_SIZE;
            clone[i+2] = clone[i+2] * .8 + this.posY * CELL_SIZE + .1;
        }
        this.vertices = clone;
        this.indices = [...cubeIndices];
        this.normals = [...cubeNormals];
        this.uv = [...cubeUV];

        this.verticesFlat = Float32Array.from(this.vertices);
        this.indicesFlat = Uint32Array.from(this.indices);
        this.normalsFlat = Float32Array.from(this.normals);
        this.uvFlat = Float32Array.from(this.uv);
    }

    private generateHouseVertices(){
        let clone = [...cubeVerts];
        for(let i = 0;i < clone.length;i+=3){
            clone[i] = clone[i] * .8 + this.posX * CELL_SIZE + .1;
            clone[i+2] = clone[i+2] * .8 + this.posY * CELL_SIZE + .1;
        }
        let roofClone = [...roofVerts];
        for(let i = 0;i < roofClone.length;i+=3){
            roofClone[i] = roofClone[i] * .8 + this.posX * CELL_SIZE + .1;
            roofClone[i+1] = (roofClone[i+1] + 1) * CELL_SIZE;
            roofClone[i+2] = roofClone[i+2] * .8 + this.posY * CELL_SIZE + .1;
        }
        
        let rI = [...roofIndices];
        for(let i = 0;i < rI.length;i++){
            rI[i] = rI[i] + clone.length / 3;
        }

        clone = clone.concat(roofClone);

        this.vertices = clone;
        this.indices = [...cubeIndices].concat(rI);
        this.normals = [...cubeNormals].concat([...roofNormals]);

        /*console.log(this.vertices);
        console.log(this.indices);
        console.log(this.normals);*/
    }
}

/*

Generate floors, windows from L-system?
Ending is top of building
L-system to do transforms to rectangle
change width, length on floors

L system to perform arbitrary transformations
Ex: do a push on each side, etc...

Join buildings?

*/