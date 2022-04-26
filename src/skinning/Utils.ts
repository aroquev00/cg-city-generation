import { Mat4, Quat, Vec4 } from "../lib/TSM.js";
import { Vec3 } from "../lib/tsm/Vec3.js";
import { Camera } from "../lib/webglutils/Camera.js";
import { Mesh, Bone } from "./Scene.js";
import { kCylinderRadius, debug } from "./App.js";
import { Quaternion } from "../lib/threejs/src/Three.js";

// takes screen x,y and converts them to ndc values
function getNDCCoordinatesFromScreen(x: number, y: number, width: number, height: number){
    return [2 * x / width - 1, 1 - (2 * y) / height];
}

// Get world coordinates from ndc screen coordinates
function screenToWorld(x: number, y: number, z: number, camera: Camera) {
    // src for algorithm: https://antongerdelan.net/opengl/raycasting.html?msclkid=00ccd855ab0411ecbc23b627040c3f0f
    /* console.log("NDC X: " + x);
    console.log("NDC Y: " + y);
    console.log("NDC Z: " + z); */
    let ray_clip = new Vec4([x, y, z, 1]);
    let inverseProjMat = new Mat4();
    camera.projMatrix().inverse(inverseProjMat);
    let ray_eye = inverseProjMat.multiplyVec4(ray_clip);
    let inverseViewMatrix = new Mat4();
    camera.viewMatrix().inverse(inverseViewMatrix);
    let ray_world = inverseViewMatrix.multiplyVec4(ray_eye);
    /* console.log("Ray World before scaling") */
    //console.log(ray_world)
    let ray_world_scaled = new Vec4();
    ray_world.scale((1.0/ray_world.w), ray_world_scaled);
    //console.log("Ray World SCALED")
    //console.log(ray_world_scaled)
    return new Vec3(ray_world_scaled.xyz);
}

// Calculates ray from screen coordinates (ray through point from camera)
export function getRayThroughMouse(x: number, y: number, width: number, height: number, camera: Camera) {

    let ndc = getNDCCoordinatesFromScreen(x, y, width, height);
    //console.log("NDC")
    //console.log(ndc)
    let q = screenToWorld(ndc[0], ndc[1], 0, camera);
    //console.log(q);
    let p = screenToWorld(ndc[0], ndc[1], 1, camera);
    //console.log(p);
    let direction = new Vec3;
    q.subtract(p, direction);
    //q.subtract(camera.pos(), direction);
    direction.normalize();
    return {"origin": p.copy(), "direction": direction.copy(), "q": q.copy()};
    //return {"origin": camera.pos().copy(), "direction": direction.copy(), "q": q.copy()};
}

export function rayBoneIntersection(ray: {
    origin: Vec3;
    direction: Vec3;
    q: Vec3;
}, mesh: Mesh) {
    let closestT: number = null;
    let closestBone: Bone = null;
    let closestBoneIndex: number = null;
    if (debug) {console.log("Starting going over BONES");}
    mesh.bones.forEach((bone, index) => {
        if (debug) {
            console.log(`STARTING Bone ${index}`)
        }

        if (debug) {
            console.log("Bone details");
            console.log(bone);
        }

        // First convert the ray (point and direction) to bone local coordinates.
        // We do want to unrotate and untranslate the eye position.
        let rayOriginInBoneCoords = convertPointToBoneCoordinates(ray.origin, bone).copy();
        if (debug) {
            console.log("Ray Origin in Bone Coords")
            console.log(rayOriginInBoneCoords.xyz);
        }
        // We only want to unrotate the ray direction.
        let rayQInBoneCoords = convertPointToBoneCoordinates(ray.q, bone).copy();
        if (debug) {
            console.log("Ray Q in Bone Coords")
            console.log(rayQInBoneCoords.xyz);
        }

        // Now calculate ray direction in bone coordinates
        let rayDirInBoneCoords = new Vec3();
        rayQInBoneCoords.subtract(rayOriginInBoneCoords, rayDirInBoneCoords);
        rayDirInBoneCoords.normalize()
        if (debug) {
            console.log("Ray Dir in Bone Coords")
            console.log(rayDirInBoneCoords.xyz);
        }

        //intersect with x^2 + z^2 = radius
        // Solve quadratic equation to find t.
        let a = Math.pow(rayDirInBoneCoords.x, 2) + Math.pow(rayDirInBoneCoords.z, 2);
        let b = 2 * rayOriginInBoneCoords.x * rayDirInBoneCoords.x + 2 * rayOriginInBoneCoords.z * rayDirInBoneCoords.z;
        let c = Math.pow(rayOriginInBoneCoords.x, 2) + Math.pow(rayOriginInBoneCoords.z, 2) - Math.pow(kCylinderRadius, 2);
        
        let tSolutions = solveQuadraticEquation(a, b, c);
        if (debug) {
            console.log("T solutions for quadratic equation");
            console.log(tSolutions);
        }

        let closestLocalT = null;
        for (let t of tSolutions) {
            // Check that t is not negative.
            if (t < 0) {
                // Point is behind eye, no good.
                continue;
            }
            // Check height
            let pointAtT = new Vec3();
            let rayDirScaled = new Vec3();
            rayDirInBoneCoords.scale(t, rayDirScaled);
            rayOriginInBoneCoords.add(rayDirScaled, pointAtT);
            let boneHeightVector = new Vec3()
            bone.endpoint.subtract(bone.position, boneHeightVector);
            const boneHeight = boneHeightVector.length()
            if (pointAtT.y >= 0 && pointAtT.y <= boneHeight) {
                // Intersection!
                if (debug) {
                    console.log("Intersection in local bone!")
                }
                if (closestLocalT === null || t < closestLocalT) {
                    closestLocalT = t;
                }
            }
        }
        if (closestLocalT !== null) {
            if (closestT === null || closestLocalT < closestT) {
                closestT = closestLocalT;
                closestBone = bone;
                closestBoneIndex = index;
            }
        }
        if (debug) {
            console.log(`FINISHING Bone ${index}`)
        }
    });
    // We now have the bone with which we have intersected, if any.
    if (debug && closestBone !== null) {
        console.log("Intersection!")
        console.log(closestBone);
    }
    return closestBoneIndex;
}

function solveQuadraticEquation(a: number, b: number, c: number) {
    let discriminant =  Math.pow(b, 2) - 4 * a * c;
    if (debug) {
        console.log("Discriminant of quadratic equation solving");
        console.log(discriminant);
    }
    let solution: number[] = [];
    if (discriminant > 0) {
        solution.push((-1 * b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a));
        solution.push((-1 * b - Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a));
    } else if (discriminant == 0) {
        solution.push((-1 * b + Math.sqrt(Math.pow(b, 2) - (4 * a * c))) / (2 * a));
    }
    return solution;
}

function getBoneOrientationMatrix(boneCoordSys: {
    tangent: Vec3;
    normal: Vec3;
    binormal: Vec3;
}) {
    // We are setting the normal to x axis, tangent to y axis, and binormal to z axis.
    let rotMatArr = [];
    Array.prototype.push.apply(rotMatArr, boneCoordSys.normal.xyz);
    rotMatArr.push(0);
    Array.prototype.push.apply(rotMatArr, boneCoordSys.tangent.xyz);
    rotMatArr.push(0);
    Array.prototype.push.apply(rotMatArr, boneCoordSys.binormal.xyz);
    rotMatArr.push(0);
    Array.prototype.push.apply(rotMatArr, [0,0,0,1]);
    let rotationMatrix = new Mat4(rotMatArr);
    return rotationMatrix;
}

function convertPointToBoneCoordinates(point: Vec3, bone: Bone) {
    const boneCoordSys = getBoneTNBCoordSystem(bone);
    if (debug) {console.log("Bone coord system"); console.log(boneCoordSys);}

    let rotationMatrix = getBoneOrientationMatrix(boneCoordSys);
    if (debug) {console.log("Rotation matrix"); console.log(rotationMatrix);}

    //let test = new Vec4([boneCoordSys.tangent.x, boneCoordSys.tangent.y, boneCoordSys.tangent.z, 1]);
    //console.log(rotationMatrix.multiplyVec4(test));
    
    // First untranslate point
    let point4Vec = new Vec4([point.x, point.y, point.z, 1]);
    const bonePosition4Vec = new Vec4([bone.position.x, bone.position.y, bone.position.z, 1]);
    let untranslatedPoint = new Vec4();
    point4Vec.subtract(bonePosition4Vec, untranslatedPoint);
    if (debug) {console.log("Untranslated point"); console.log(untranslatedPoint.xyzw);}

    // Then unrotate point
    let inverseRotationMatrix = new Mat4();
    rotationMatrix.inverse(inverseRotationMatrix);
    if (debug) {console.log("Inverse rotation matrix"); console.log(inverseRotationMatrix);}

    let unrotatedPoint = new Vec4();
    inverseRotationMatrix.multiplyVec4(untranslatedPoint, unrotatedPoint);
    if (debug) {console.log("Unrotated point"); console.log(unrotatedPoint.xyzw);}

    // In theory this should be the point in bone coordinate space.
    return new Vec3(unrotatedPoint.xyz);
}

export function getBoneTNBCoordSystem(bone: Bone) {
    /* 
        Rotation encapsulates the TNB orientation, so you can think of that quaternion as representing 
        the updated orientation after the skeleton is deformed from its A-pose. In terms of constructing 
        the TNB, we can create a valid normal and binormal by taking the the cross product of t with a 
        unit vector constructed from t (where the axis in t with the smallest magnitude is set to 1 and 
        the other axes are set to 0). This gives us an arbitrary, but valid, vector for the normal that 
        is orthogonal to the tangent, and using these two values, we can choose a binormal with 
        crossproduct.
    */


    let t = new Vec3();
    bone.endpoint.subtract(bone.position, t);
    t.normalize();
    let smallestValue = 1;
    let smallestIndex = 0;
    for (const [index, value] of t.xyz.entries()) {
        if (Math.abs(value) < smallestValue) {
            smallestIndex = index;
        }
    }
    
    let unitVec = new Vec3();
    unitVec.x = smallestIndex == 0 ? 1.0 : 0.0;
    unitVec.y = smallestIndex == 1 ? 1.0 : 0.0;
    unitVec.z = smallestIndex == 2 ? 1.0 : 0.0;
    let n = Vec3.cross(t, unitVec);

    let b = Vec3.cross(t, n);
    return {tangent: t, normal: n, binormal: b};
}

// Rotate a bone.
export function rotateBone(mesh: Mesh, boneIndex: number, axis: Vec3, angle: number, previousEndpoint: Vec3) {
    let bone = mesh.bones[boneIndex];
    let rotationQuat = Quat.fromAxisAngle(axis, angle);
    rotationQuat.multiply(bone.rotation, bone.rotation);
    
    let initialBoneTangent = new Vec3();
    bone.initialEndpoint.subtract(bone.initialPosition, initialBoneTangent);
    initialBoneTangent.normalize();
    let newBoneTangent = bone.rotation.multiplyVec3(initialBoneTangent);
    let newEndpointVector = new Vec3();
    newBoneTangent.scale(bone.length, newEndpointVector);
    // Set the new endpoint's position.
    let newEndpointPosition = new Vec3();
    bone.position.add(newEndpointVector, newEndpointPosition);

    // Finally, do set this bone's endpoint.
    bone.endpoint = newEndpointPosition;
    
    // Update children.
    for (let childBoneIndex of bone.children) {
        let childBone = mesh.bones[childBoneIndex];
        // Calculate offset of that bone
        let offset = new Vec3();
        childBone.position.subtract(previousEndpoint, offset);
        
        // Rotate the offset.
        offset = rotationQuat.multiplyVec3(offset);

        // The child's position is the new endpoint + offset.
        let childBonePositionEndpointVector = new Vec3();
        childBone.endpoint.subtract(childBone.position, childBonePositionEndpointVector);

        let childBonePreviousEndpoint = childBone.endpoint.copy();

        newEndpointPosition.add(offset, childBone.position);
        childBone.position.add(childBonePositionEndpointVector, childBone.endpoint);
        rotateBone(mesh, childBoneIndex, axis, angle, childBonePreviousEndpoint);
    }
}

export class Keyframe {
    static parentIndices: number[] = [];

    public time: number;
    public rotations: Quat[];
    public parentIndex: number;

    constructor(time: number) {
        this.time = time;
        this.rotations = [];
    }
}

export function interpolateSkeleton(mesh: Mesh, boneIndex: number, firstKf: Keyframe, secondKf: Keyframe, time: number) {
    let bone = mesh.bones[boneIndex];
    
    let rotationQuat = Quat.slerpShort(firstKf.rotations[boneIndex], secondKf.rotations[boneIndex], time);
    bone.rotation = rotationQuat.copy();

    let initialBoneTangent = new Vec3();
    bone.initialEndpoint.subtract(bone.initialPosition, initialBoneTangent);
    initialBoneTangent.normalize();
    let newBoneTangent = rotationQuat.multiplyVec3(initialBoneTangent);
    let newEndpointVector = new Vec3();
    newBoneTangent.scale(bone.length, newEndpointVector);
    // Set the new endpoint's position.
    
    bone.position.add(newEndpointVector, bone.endpoint);

    // Update children.
    for (let childBoneIndex of bone.children) {
        let childBone = mesh.bones[childBoneIndex];
        // Calculate offset of that bone
        let offset = new Vec3();
        childBone.initialPosition.subtract(bone.initialEndpoint, offset);
        
        // Rotate the offset.
        offset = rotationQuat.multiplyVec3(offset);

        bone.endpoint.add(offset, childBone.position);
        
        interpolateSkeleton(mesh, childBoneIndex, firstKf, secondKf, time);
    }
}
