// === Scene Setup ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,2,5);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Resize
window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// === Lighting ===
const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(10,20,10);
scene.add(light);

// === Ground ===
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50,50),
    new THREE.MeshStandardMaterial({color:0x228B22})
);
ground.rotation.x = -Math.PI/2;
scene.add(ground);

// === Arena Walls ===
const walls = [];
function createWall(x,z,w,h){
    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(w,2,h),
        new THREE.MeshStandardMaterial({color:0x654321})
    );
    wall.position.set(x,1,z);
    scene.add(wall);
    walls.push(wall);
}
createWall(0,-25,50,1);
createWall(0,25,50,1);
createWall(-25,0,1,50);
createWall(25,0,1,50);

// === Player ===
const player = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0xff0000})
);
player.position.y = 0.5;
scene.add(player);

let velocityY = 0;
const gravity = -0.02;
let canJump = false;

// === Mouse Control ===
let yaw = 0;
let pitch = 0;
let sensitivity = 1;
let invertY = false;

const sensSlider = document.getElementById('sensitivity');
const senseValue = document.getElementById('senseValue');
sensSlider.addEventListener('input', ()=>{
    sensitivity = parseFloat(sensSlider.value);
    senseValue.innerText = sensitivity;
});

document.getElementById('invertY').addEventListener('change', e=>{
    invertY = e.target.checked;
});

const startButton = document.getElementById('start-button');
startButton.addEventListener('click', ()=>{
    document.body.requestPointerLock();
});
document.addEventListener('pointerlockchange', ()=>{
    if(document.pointerLockElement===document.body){
        startButton.style.display = 'none';
    }
});

document.addEventListener('mousemove', e=>{
    if(document.pointerLockElement===document.body){
        const factor = invertY?-1:1;
        yaw -= e.movementX * 0.002 * sensitivity;
        pitch -= e.movementY * 0.002 * sensitivity * factor;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    }
});

// === Movement ===
const keys = {};
document.addEventListener('keydown', e=>keys[e.key.toLowerCase()]=true);
document.addEventListener('keyup', e=>keys[e.key.toLowerCase()]=false);

// === Bullets ===
const bullets = [];
function shootBullet(){
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.2,8,8),
        new THREE.MeshStandardMaterial({color:0xffff00})
    );
    bullet.position.copy(player.position);
    const direction = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)).normalize();
    bullet.direction = direction;
    bullets.push(bullet);
    scene.add(bullet);
}
document.addEventListener('mousedown', e=>{
    if(document.pointerLockElement===document.body){
        shootBullet();
    }
});

// === Rivals ===
const rivals = [];
const rivalCount = 5;
for(let i=0;i<rivalCount;i++){
    const rival = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshStandardMaterial({color:0x0000ff})
    );
    rival.position.set((Math.random()-0.5)*30,0.5,(Math.random()-0.5)*30);
    scene.add(rival);
    rivals.push(rival);
}

// === Obstacles ===
const obstacles = [];
for(let i=0;i<5;i++){
    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(2,2,2),
        new THREE.MeshStandardMaterial({color:0xaaaaaa})
    );
    obs.position.set((Math.random()-0.5)*20,1,(Math.random()-0.5)*20);
    scene.add(obs);
    obstacles.push(obs);
}

// === Score ===
let score = 0;
function updateScore(val){
    score += val;
    document.getElementById('score').innerText = "Score: "+score;
}

// === Helper for collisions ===
function checkCollision(obj, arr){
    for(const a of arr){
        if(obj.position.distanceTo(a.position)<1) return true;
    }
    return false;
}

// === Camera Update ===
function updateCamera(){
    const radius = 5;
    const x = player.position.x + radius * Math.cos(pitch) * Math.sin(yaw);
    const y = player.position.y + radius * Math.sin(pitch) + 2;
    const z = player.position.z + radius * Math.cos(pitch) * Math.cos(yaw);
    camera.position.set(x,y,z);
    camera.lookAt(player.position.x, player.position.y+0.5, player.position.z);
}

// === Game Loop ===
function animate(){
    requestAnimationFrame(animate);

    // Player movement
    let speed = 0.2;
    const dir = new THREE.Vector3();
    if(keys['w']) dir.z -= 1;
    if(keys['s']) dir.z += 1;
    if(keys['a']) dir.x -= 1;
    if(keys['d']) dir.x += 1;
    dir.normalize();

    const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),forward);
    const move = forward.multiplyScalar(dir.z*speed).add(right.multiplyScalar(dir.x*speed));
    player.position.add(move);

    // Gravity & jump
    velocityY += gravity;
    player.position.y += velocityY;
    if(player.position.y<=0.5){
        player.position.y=0.5;
        velocityY=0;
        canJump=true;
    }
    if(keys[' '] && canJump){
        velocityY=0.4;
        canJump=false;
    }

    // Keep inside walls
    player.position.x = Math.max(-24.5, Math.min(24.5, player.position.x));
    player.position.z = Math.max(-24.5, Math.min(24.5, player.position.z));

    // Rivals move toward player
    rivals.forEach(rival=>{
        const dirToPlayer = new THREE.Vector3().subVectors(player.position,rival.position);
        dirToPlayer.y = 0;
        dirToPlayer.normalize();
        rival.position.add(dirToPlayer.multiplyScalar(0.05));
    });

    // Bullet movement & collisions
    bullets.forEach((b,i)=>{
        b.position.addScaledVector(b.direction,0.5);
        rivals.forEach((r,j)=>{
            if(b.position.distanceTo(r.position)<0.7){
                scene.remove(r);
                rivals.splice(j,1);
                scene.remove(b);
                bullets.splice(i,1);
                updateScore(10);
            }
        });
        if(Math.abs(b.position.x)>25 || Math.abs(b.position.z)>25){
            scene.remove(b);
            bullets.splice(i,1);
        }
    });

    updateCamera();
    renderer.render(scene,camera);
}
animate();
