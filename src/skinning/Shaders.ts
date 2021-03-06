export const cityGroundVSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;

    attribute vec4 aVertPos;
    attribute vec2 aUV;

    varying vec4 vClipPos;
    varying vec2 uv;

    void main () {

        gl_Position = uProj * uView * uWorld * aVertPos;
        vClipPos = gl_Position;

        uv = aUV;
    }
`;

export const cityGroundFSText = `
    precision mediump float;

    uniform mat4 uViewInv;
    uniform mat4 uProjInv;
    uniform vec4 uLightPos;

    varying vec4 vClipPos;
    varying vec2 uv;

    uniform sampler2D u_texture;

    void main() {
        gl_FragColor = texture2D(u_texture, uv);
        //gl_FragColor = vec4(0.0, .6, .2, 1.0);
    }
`;

export const floorVSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec4 aVertPos;

    varying vec4 vClipPos;

    void main () {

        gl_Position = uProj * uView * uWorld * aVertPos;
        vClipPos = gl_Position;
    }
`;

export const floorFSText = `
    precision mediump float;

    uniform mat4 uViewInv;
    uniform mat4 uProjInv;
    uniform vec4 uLightPos;

    varying vec4 vClipPos;

    void main() {
        vec4 wsPos = uViewInv * uProjInv * vec4(vClipPos.xyz/vClipPos.w, 1.0);
        wsPos /= wsPos.w;
        /* Determine which color square the position is in */
        float checkerWidth = 5.0;
        float i = floor(wsPos.x / checkerWidth);
        float j = floor(wsPos.z / checkerWidth);
        vec3 color = mod(i + j, 2.0) * vec3(1.0, 1.0, 1.0);

        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = max(dot(normalize(lightDirection), vec4(0.0, 1.0, 0.0, 0.0)), 0.0);
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
	
        gl_FragColor = vec4(clamp(dot_nl * color, 0.0, 1.0), 1.0);
    }
`;

export const buildingVSText = `
    precision mediump float;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    uniform vec4 lightPosition;
    
    attribute vec3 vertPosition;
    attribute vec3 normal;

    varying vec4 color;
    varying vec3 norm;
    varying float angle;

    void main () {
        norm = normalize(normal);
        color = vec4(.8, .8, .8, 1.0);
        vec4 lightDir = normalize(lightPosition - vec4(vertPosition, 1.0));
        angle = max(dot(lightDir, vec4(normal, 1.0)), 0.0);
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }
`;

export const buildingTextureVSText = `
    precision mediump float;

    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;
    uniform vec4 lightPosition;
    
    attribute vec3 vertPosition;
    attribute vec3 normal;
    attribute vec2 uv;

    varying vec2 textureUV;
    varying vec4 color;
    varying vec3 norm;
    varying float angle;

    void main () {
        textureUV = uv;
        norm = normal;
        color = vec4(.8, .8, .8, 1.0);
        vec4 lightDir = normalize(lightPosition - vec4(vertPosition, 1.0));
        angle = max(dot(lightDir, vec4(normal, 1.0)), 0.0);
        gl_Position = mProj * mView * mWorld * vec4(vertPosition, 1.0);
    }
`;

export const buildingFSText = `
    precision mediump float;

    varying vec4 color;
    varying float angle;

    void main() {
        gl_FragColor = color * angle;
        gl_FragColor.w = 1.0;
    }
`;

export const buildingTextureFSText = `
    precision mediump float;

    varying vec4 color;
    varying vec2 textureUV;
    varying vec3 norm;
    varying float angle;

    uniform sampler2D u_texture;

    void main() {
        if(norm.y == 1.0 || norm.y == -1.0) {
            gl_FragColor = color * angle;
        } else {
            gl_FragColor = angle * texture2D(u_texture, textureUV);
        }
        gl_FragColor.w = 1.0;
    }
`;

export const sceneVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec2 aUV;
    attribute vec3 aNorm;
    attribute vec4 skinIndices;
    attribute vec4 skinWeights;
    attribute vec4 v0;
    attribute vec4 v1;
    attribute vec4 v2;
    attribute vec4 v3;
    
    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;
 
    uniform vec4 lightPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    uniform vec3 jTrans[64];
    uniform vec4 jRots[64];

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        vec3 trans = vertPosition;
        vec4 worldPosition = mWorld * vec4(trans, 1.0);
        
        //  Compute light direction and transform to camera coordinates
        lightDir = lightPosition - worldPosition;

        // Do normals need to be edited?
        vec4 aNorm4 = vec4(aNorm, 0.0);
        normal = normalize(mWorld * vec4(aNorm, 0.0));

        uv = aUV;

        vec4 avg = vec4(0.0, 0.0, 0.0, 0.0);

        vec4 p1 = vec4( jTrans[int(skinIndices[0])] + qtrans( jRots[int(skinIndices[0])], v0.xyz), 1.0);
        avg = avg + skinWeights[0] * p1;

        vec4 p2 = vec4( jTrans[int(skinIndices[1])] + qtrans( jRots[int(skinIndices[1])], v1.xyz), 1.0);
        avg = avg + skinWeights[1] * p2;

        vec4 p3 = vec4( jTrans[int(skinIndices[2])] + qtrans( jRots[int(skinIndices[2])], v2.xyz), 1.0);
        avg = avg + skinWeights[2] * p3;

        vec4 p4 = vec4( jTrans[int(skinIndices[3])] + qtrans( jRots[int(skinIndices[3])], v3.xyz), 1.0);
        avg = avg + skinWeights[3] * p4;

        gl_Position = mProj * mView * mWorld * avg;

    }

`;

export const sBackVSText = `
    precision mediump float;

    attribute vec2 vertPosition;

    varying vec2 uv;

    void main() {
        gl_Position = vec4(vertPosition, 0.0, 1.0);
        uv = vertPosition;
        uv.x = (1.0 + uv.x) / 2.0;
        uv.y = (1.0 + uv.y) / 2.0;
    }
`;

export const sBackFSText = `
    precision mediump float;

    varying vec2 uv;

    void main () {
        gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0);
        if (abs(uv.y-.33) < .005 || abs(uv.y-.67) < .005) {
            gl_FragColor = vec4(1, 1, 1, 1);
        }
    }

`;