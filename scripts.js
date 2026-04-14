// scripts.js

let scene, camera, renderer, plane;
let currentColor = { h: 210, s: 50, v: 50 }; // Default
let palettes = JSON.parse(localStorage.getItem('color_palettes')) || [];
let history = JSON.parse(localStorage.getItem('color_history')) || [];

// --- THREE.JS BACKGROUND ---
function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const geometry = new THREE.PlaneGeometry(20, 20, 10, 10);
    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 100,
        flatShading: true,
        side: THREE.DoubleSide
    });

    plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    const light1 = new THREE.PointLight(0xffffff, 1);
    light1.position.set(5, 5, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 0.5);
    light2.position.set(-5, -5, 2);
    scene.add(light2);

    camera.position.z = 5;
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    plane.rotation.z += 0.002;
    plane.position.z = Math.sin(Date.now() * 0.001) * 0.5;
    
    // Update background color dynamic
    const rgb = ColorConverter.hsvToRgb(currentColor.h, currentColor.s, currentColor.v);
    const compHue = ColorConverter.getComplementary(currentColor.h);
    const compRgb = ColorConverter.hsvToRgb(compHue, currentColor.s, currentColor.v);
    
    const colorA = new THREE.Color(`rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`);
    scene.background = colorA;
    plane.material.color.lerp(colorA, 0.05);
    
    renderer.render(scene, camera);
}

// --- UI LOGIC ---
function updateUI(h, s, v, source = '') {
    currentColor = { h, s, v };
    const rgb = ColorConverter.hsvToRgb(h, s, v);
    const hex = ColorConverter.rgbToHex(rgb.r, rgb.g, rgb.b);
    const cmyk = ColorConverter.rgbToCmyk(rgb.r, rgb.g, rgb.b);
    const hsl = ColorConverter.rgbToHsl(rgb.r, rgb.g, rgb.b);

    // Update Inputs
    if (source !== 'hex') document.getElementById('in-hex').value = hex;
    if (source !== 'rgb') {
        document.getElementById('in-r').value = Math.round(rgb.r);
        document.getElementById('in-g').value = Math.round(rgb.g);
        document.getElementById('in-b').value = Math.round(rgb.b);
    }
    if (source !== 'cmyk') {
        document.getElementById('in-c').value = Math.round(cmyk.c);
        document.getElementById('in-m').value = Math.round(cmyk.m);
        document.getElementById('in-y').value = Math.round(cmyk.y);
        document.getElementById('in-k').value = Math.round(cmyk.k);
    }
    if (source !== 'hsl') {
        document.getElementById('in-hsl-h').value = Math.round(hsl.h);
        document.getElementById('in-hsl-s').value = Math.round(hsl.s);
        document.getElementById('in-hsl-l').value = Math.round(hsl.l);
    }
    if (source !== 'hsv') {
        document.getElementById('in-hsv-h').value = Math.round(h);
        document.getElementById('in-hsv-s').value = Math.round(s);
        document.getElementById('in-hsv-v').value = Math.round(v);
    }

    // Dynamic Styling
    const lum = ColorConverter.getLuminance(rgb.r, rgb.g, rgb.b);
    const textColor = lum > 0.5 ? '#000000' : '#ffffff';
    document.documentElement.style.setProperty('--accent-color', hex);
    document.documentElement.style.setProperty('--text-on-accent', textColor);

    // Update Picker Visuals
    document.getElementById('picker-area').style.backgroundColor = `hsl(${h}, 100%, 50%)`;
    const cursor = document.getElementById('picker-cursor');
    cursor.style.left = s + '%';
    cursor.style.top = (100 - v) + '%';
}

// --- EVENT HANDLERS ---
function initEventListeners() {
    // Hue Slider
    document.getElementById('hue-slider').addEventListener('input', (e) => {
        updateUI(parseInt(e.target.value), currentColor.s, currentColor.v, 'hsv');
    });

    // Saturation/Value Area
    const pickerArea = document.getElementById('picker-area');
    let isDragging = false;

    const handleMove = (e) => {
        if (!isDragging) return;
        const rect = pickerArea.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        updateUI(currentColor.h, x, 100 - y, 'hsv');
    };

    pickerArea.addEventListener('mousedown', (e) => { isDragging = true; handleMove(e); });
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', () => { 
        if(isDragging) addToHistory(ColorConverter.rgbToHex(...Object.values(ColorConverter.hsvToRgb(currentColor.h, currentColor.s, currentColor.v))));
        isDragging = false; 
    });

    // Copy Button
    document.getElementById('btn-copy').addEventListener('click', () => {
        const hex = document.getElementById('in-hex').value;
        navigator.clipboard.writeText(hex);
        const btn = document.getElementById('btn-copy');
        const original = btn.innerText;
        btn.innerText = 'Copiado!';
        setTimeout(() => btn.innerText = original, 1500);
    });
}

function addToHistory(hex) {
    if (history[0] === hex) return;
    history.unshift(hex);
    if (history.length > 20) history.pop();
    localStorage.setItem('color_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('history-container');
    container.innerHTML = history.map((hex, i) => `
        <div class="history-item" style="background: ${hex}" data-tooltip="${hex}" onclick="useColor('${hex}')">
            <div class="delete-btn" onclick="event.stopPropagation(); deleteHistoryItem(${i})">×</div>
        </div>
    `).join('');
}

function useColor(hex) {
    const rgb = ColorConverter.hexToRgb(hex);
    const hsv = ColorConverter.rgbToHsv(rgb.r, rgb.g, rgb.b);
    document.getElementById('hue-slider').value = hsv.h;
    updateUI(hsv.h, hsv.s, hsv.v);
}

function deleteHistoryItem(index) {
    history.splice(index, 1);
    localStorage.setItem('color_history', JSON.stringify(history));
    renderHistory();
}

// --- MODAL & GLOBAL CLEAR ---
window.confirmClear = function() {
    if(confirm("Deseja realmente limpar todo o histórico e paletas?")) {
        localStorage.clear();
        history = [];
        palettes = [];
        renderHistory();
        renderPalettes();
    }
}

// --- PALETTE SYSTEM ---
window.addPalette = function() {
    const name = prompt("Nome da paleta:") || "Minha Paleta";
    palettes.push({ name, colors: [] });
    savePalettes();
}

function savePalettes() {
    localStorage.setItem('color_palettes', JSON.stringify(palettes));
    renderPalettes();
}

function renderPalettes() {
    const container = document.getElementById('palettes-container');
    container.innerHTML = palettes.map((p, pIdx) => `
        <div class="glass-panel p-4 rounded-xl mb-4">
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                    <h3 class="font-bold">${p.name}</h3>
                    <button onclick="editPaletteName(${pIdx})" class="text-xs opacity-50 hover:opacity-100">✎</button>
                </div>
                <div class="flex gap-2">
                    <button onclick="addColorToPalette(${pIdx})" class="bg-green-600 text-[10px] px-2 py-1 rounded">+ Cor</button>
                    <button onclick="exportPaletteJSON(${pIdx})" class="bg-blue-600 text-[10px] px-2 py-1 rounded">JSON</button>
                    <button onclick="deletePalette(${pIdx})" class="bg-red-600 text-[10px] px-2 py-1 rounded">🗑</button>
                </div>
            </div>
            <div class="flex flex-wrap gap-2">
                ${p.colors.map((c, cIdx) => `
                    <div class="flex flex-col items-center gap-1 group relative">
                        <div class="w-12 h-12 rounded shadow-inner" style="background: ${c}"></div>
                        <span class="text-[9px]">${c}</span>
                        <div class="absolute -top-1 -right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                             <button onclick="deleteColor(${pIdx}, ${cIdx})" class="bg-red-500 rounded-full w-4 h-4 text-[8px]">×</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

window.addColorToPalette = (idx) => {
    const hex = document.getElementById('in-hex').value;
    palettes[idx].colors.push(hex);
    savePalettes();
};

window.deletePalette = (idx) => { palettes.splice(idx, 1); savePalettes(); };
window.editPaletteName = (idx) => { 
    const n = prompt("Novo nome:", palettes[idx].name); 
    if(n) { palettes[idx].name = n; savePalettes(); }
};
window.deleteColor = (pIdx, cIdx) => { palettes[pIdx].colors.splice(cIdx, 1); savePalettes(); };

window.exportPaletteJSON = (idx) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(palettes[idx]));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", palettes[idx].name + ".json");
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

// Initialize everything
window.addEventListener('load', () => {
    initThree();
    initEventListeners();
    updateUI(210, 50, 50);
    renderHistory();
    renderPalettes();
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});