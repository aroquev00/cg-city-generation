import { Vec2, Vec3, Vec4 } from "../TSM.js";

export class Cylinder {
    
    n: number;
    private positions: Vec2[];
    private indices: Vec2[];
    
    private positionsF32: Float32Array;
    private indicesU32: Uint32Array;

    constructor(n) {
        this.positions = [];
        this.indices = [];
        this.n = n;
        
        let interval = 1.0 / n;
        
        for(var i = 0; i < n; i++){

            this.positions.push(new Vec2([interval * i, 0]));
            this.positions.push(new Vec2([interval * i, 1]));
            this.positions.push(new Vec2([0, interval * i]));
            this.positions.push(new Vec2([1, interval * i]));
            this.indices.push(new Vec2([4*i, 4*i + 1]));
            this.indices.push(new Vec2([4*i+2, 4*i + 3]));
        }

        this.positionsF32 = new Float32Array(this.positions.length*2);
        this.positions.forEach((v: Vec2, i: number) => {this.positionsF32.set(v.xy, i*2)});
        this.indicesU32 = new Uint32Array(this.indices.length*2);
        this.indices.forEach((v: Vec2, i: number) => {this.indicesU32.set(v.xy, i*2)});
    }

    public positionsFlatMap() : Float32Array {
        return this.positionsF32;
    }

    public indicesFlatMap() : Uint32Array {
        return this.indicesU32;
    }

    public getN() : number {
        return this.n;
    }
}