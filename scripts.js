// scripts.js

let scene, camera, renderer, plane;
let currentColor = { h: 210, s: 50, v: 50 }; // Estado global da cor
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
    
    const rgb = ColorConverter.hsvToRgb(currentColor.h, currentColor.s, currentColor.v);
    const colorA = new THREE.Color(`rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`);
    scene.background = colorA;
    plane.material.color.lerp(colorA, 0.05);
    
    renderer.render(scene, camera);
}

// --- UI UPDATE ENGINE ---
function updateUI(h, s, v, source = '') {
    // Garante limites de 0-360 para H e 0-100 para S e V
    h = (h < 0) ? 0 : (h > 360 ? 360 : h);
    s = (s < 0) ? 0 : (s > 100 ? 100 : s);
    v = (v < 0) ? 0 : (v > 100 ? 100 : v);

    currentColor = { h, s, v };
    const rgb = ColorConverter.hsvToRgb(h, s, v);
    const hex = ColorConverter.rgbToHex(rgb.r, rgb.g, rgb.b);
    const cmyk = ColorConverter.rgbToCmyk(rgb.r, rgb.g, rgb.b);
    const hsl = ColorConverter.rgbToHsl(rgb.r, rgb.g, rgb.b);

    // Atualiza o slider de Hue se a mudança não veio dele
    if (source !== 'hsv') {
        document.getElementById('hue-slider').value = h;
    }

    // Atualiza Inputs de Texto
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

    // Estilização Dinâmica (Contraste e Cor de Destaque)
    const lum = ColorConverter.getLuminance(rgb.r, rgb.g, rgb.b);
    const textColor = lum > 0.5 ? '#000000' : '#ffffff';
    document.documentElement.style.setProperty('--accent-color', hex);
    document.documentElement.style.setProperty('--text-on-accent', textColor);

    // Atualiza Visual do Picker
    document.getElementById('picker-area').style.backgroundColor = `hsl(${h}, 100%, 50%)`;
    const cursor = document.getElementById('picker-cursor');
    cursor.style.left = s + '%';
    cursor.style.top = (100 - v) + '%';
}

// --- INPUT EVENT LISTENERS ---
function initEventListeners() {
    // 1. Hue Slider
    document.getElementById('hue-slider').addEventListener('input', (e) => {
        updateUI(parseFloat(e.target.value), currentColor.s, currentColor.v, 'hsv');
    });

    // 2. Picker Area (Drag)
    const pickerArea = document.getElementById('picker-area');
    let isDragging = false;
    const handleMove = (e) => {
        if (!isDragging) return;
        const rect = pickerArea.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        updateUI(currentColor.h, Math.max(0, Math.min(100, x)), 100 - Math.max(0, Math.min(100, y)), 'hsv');
    };
    pickerArea.addEventListener('mousedown', (e) => { isDragging = true; handleMove(e); });
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', () => { 
        if(isDragging) addToHistory(document.getElementById('in-hex').value);
        isDragging = false; 
    });

    // 3. HEX Input
    document.getElementById('in-hex').addEventListener('input', (e) => {
        const val = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
            const rgb = ColorConverter.hexToRgb(val);
            const hsv = ColorConverter.rgbToHsv(rgb.r, rgb.g, rgb.b);
            updateUI(hsv.h, hsv.s, hsv.v, 'hex');
        }
    });

    // 4. RGB Inputs
    ['r', 'g', 'b'].forEach(id => {
        document.getElementById(`in-${id}`).addEventListener('input', () => {
            const r = parseInt(document.getElementById('in-r').value) || 0;
            const g = parseInt(document.getElementById('in-g').value) || 0;
            const b = parseInt(document.getElementById('in-b').value) || 0;
            const hsv = ColorConverter.rgbToHsv(r, g, b);
            updateUI(hsv.h, hsv.s, hsv.v, 'rgb');
        });
    });

    // 5. CMYK Inputs
    ['c', 'm', 'y', 'k'].forEach(id => {
        document.getElementById(`in-${id}`).addEventListener('input', () => {
            const c = parseFloat(document.getElementById('in-c').value) || 0;
            const m = parseFloat(document.getElementById('in-m').value) || 0;
            const y = parseFloat(document.getElementById('in-y').value) || 0;
            const k = parseFloat(document.getElementById('in-k').value) || 0;
            const rgb = ColorConverter.cmykToRgb(c, m, y, k);
            const hsv = ColorConverter.rgbToHsv(rgb.r, rgb.g, rgb.b);
            updateUI(hsv.h, hsv.s, hsv.v, 'cmyk');
        });
    });

    // 6. HSL Inputs
    ['h', 's', 'l'].forEach(id => {
        document.getElementById(`in-hsl-${id}`).addEventListener('input', () => {
            const h = parseFloat(document.getElementById('in-hsl-h').value) || 0;
            const s = parseFloat(document.getElementById('in-hsl-s').value) || 0;
            const l = parseFloat(document.getElementById('in-hsl-l').value) || 0;
            const rgb = ColorConverter.hslToRgb(h, s, l);
            const hsv = ColorConverter.rgbToHsv(rgb.r, rgb.g, rgb.b);
            updateUI(hsv.h, hsv.s, hsv.v, 'hsl');
        });
    });

    // 7. HSV Inputs
    ['h', 's', 'v'].forEach(id => {
        document.getElementById(`in-hsv-${id}`).addEventListener('input', () => {
            const h = parseFloat(document.getElementById('in-hsv-h').value) || 0;
            const s = parseFloat(document.getElementById('in-hsv-s').value) || 0;
            const v = parseFloat(document.getElementById('in-hsv-v').value) || 0;
            updateUI(h, s, v, 'hsv');
        });
    });

    // Botão Copiar
    document.getElementById('btn-copy').addEventListener('click', () => {
        const hex = document.getElementById('in-hex').value;
        navigator.clipboard.writeText(hex);
        const btn = document.getElementById('btn-copy');
        btn.innerText = 'Copiado!';
        setTimeout(() => btn.innerText = 'Copiar', 1500);
    });
}

// --- FUNÇÕES DE AUXÍLIO (HISTORY/PALETTES) ---
function addToHistory(hex) {
    if (history[0] === hex) return;
    history.unshift(hex);
    if (history.length > 20) history.pop();
    localStorage.setItem('color_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('history-container');
    if(!container) return;
    container.innerHTML = history.map((hex, i) => `
        <div class="history-item" style="background: ${hex}" data-tooltip="${hex}" onclick="useColor('${hex}')">
            <div class="delete-btn" onclick="event.stopPropagation(); deleteHistoryItem(${i})">×</div>
        </div>
    `).join('');
}

window.useColor = function(hex) {
    const rgb = ColorConverter.hexToRgb(hex);
    const hsv = ColorConverter.rgbToHsv(rgb.r, rgb.g, rgb.b);
    updateUI(hsv.h, hsv.s, hsv.v);
}

function deleteHistoryItem(index) {
    history.splice(index, 1);
    localStorage.setItem('color_history', JSON.stringify(history));
    renderHistory();
}

window.confirmClear = function() {
    if(confirm("Limpar histórico e paletas?")) {
        localStorage.clear();
        history = []; palettes = [];
        renderHistory(); renderPalettes();
    }
}

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
    if(!container) return;
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
                        <div class="w-12 h-12 rounded shadow-inner cursor-pointer" style="background: ${c}" onclick="useColor('${c}')"></div>
                        <span class="text-[9px]">${c}</span>
                        <button onclick="deleteColor(${pIdx}, ${cIdx})" class="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 text-[8px] opacity-0 group-hover:opacity-100 transition">×</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

window.addColorToPalette = (idx) => { palettes[idx].colors.push(document.getElementById('in-hex').value); savePalettes(); };
window.deletePalette = (idx) => { palettes.splice(idx, 1); savePalettes(); };
window.editPaletteName = (idx) => { 
    const n = prompt("Novo nome:", palettes[idx].name); 
    if(n) { palettes[idx].name = n; savePalettes(); }
};
window.deleteColor = (pIdx, cIdx) => { palettes[pIdx].colors.splice(cIdx, 1); savePalettes(); };

window.exportPaletteJSON = (idx) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(palettes[idx]));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", palettes[idx].name + ".json");
    dl.click();
};

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    initThree();
    initEventListeners();
    updateUI(210, 50, 50);
    renderHistory();
    renderPalettes();
});

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});