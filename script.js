const el = (id) => document.getElementById(id);

const promptEl = el("prompt");
const styleEl = el("style");
const ratioEl = el("ratio");
const seedEl = el("seed");
const modelEl = el("model");

const generateBtn = el("generate");
const copyPromptBtn = el("copyPrompt");
const regenerateBtn = el("regenerate");
const downloadBtn = el("download");
const output = el("output");

const galleryEl = el("gallery");

const STORAGE_KEY = "codenest_gallery_v1";

const SURPRISES = [
    'a cyberpunk city street with neon reflections after rain, cinematic, 35mm, moody, fog',
    'a cozy reading nook with a huge window, golden hour sunlight, soft focus, film grain',
    'isometric pixel art coffee shop interior, warm lighting, tiny characters, wholesome',
    'a dragon made of galaxies soaring over mountains, long exposure, astrophotography vibe',
    'retro 3D render of a cassette player on a checkerboard floor, soft studio light'
];

function ratioToSize(ratio){
    const map = {
        '1:1': [768, 768],
        '16:9': [1024, 576],
        '9:16': [768, 1365],
        '3:2': [1024, 682],
        '2:3': [768, 1152]
    }

    return map[ratio] || map['1:1']
}

function showToast(message, error, success){
    const toast = el("toast");
    if (error) {
        toast.classList.add("error");
    }
    if(success){
        toast.classList.add("success");
    }
    toast.innerText = message;
    toast.style.opacity = 1;
    setTimeout(()=>{
        toast.style.opacity = 0;
    },3000)
}

function buildPollinationsURL(prompt, {ratio = '1:1', seed = '', model = 'flux'} = {}){
    const [w, h] = ratioToSize(ratio);
    const base = "https://image.pollinations.ai/prompt/";
    const safePrompt = encodeURIComponent(prompt);

    const params = new URLSearchParams({width: String(w), height: String(h), model, seed: seed || Math.floor(Math.random() * 1e9), nologo: true, enhance: false, ts: String(Date.now())});
    return `${base}${safePrompt}?${params.toString()}`;
}

function setLoading(loading){
    output.innerHTML = '';
    if (loading) {
        const sk = document.createElement("div");
        sk.classList.add("skeleton");
        output.append(sk);
    }
}

function saveHistory(item){
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    arr.unshift(item);
    const trimmed = arr.slice(0, 8);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(trimmed));
    renderGallery();
}

function renderGallery(){
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    galleryEl.innerHTML = '';
    if (arr.length === 0) {
        const div = document.createElement("div");
        div.style.width = "100%";
        div.innerHTML = "<center><p class='muted'>No recent Generations.</p></center>"
        galleryEl.appendChild(div);
    }
    for (const it of arr){
        const div = document.createElement("div");
        div.classList.add("thumb");
        div.innerHTML = `
            <img src="${it.url}" alt="generated" loading="lazy"/>
            <div class="meta">
                <button class="mini-btn" data-act="use" data-url="${encodeURIComponent(it.url)}" data-prompt="${encodeURIComponent(it.prompt)}" data-seed="${encodeURIComponent(it.seed)}">Use</button>
                <button class="mini-btn" data-act="dl" data-url="${encodeURIComponent(it.url)}">download</button>
            </div>
        `
        galleryEl.appendChild(div);
    }
}

async function fetchAsBlob(url){
    const res = await fetch(url, {mode: "cors", cache: "no-store"});
    if (!res.ok) {
        showToast("Failed to fetch, Network Error",true,false);
        return;
    }
    return await res.blob();
}

async function downloadImage(url, filename= "codenest_AI.png"){
    try {
        const blob = await fetchAsBlob(url);
        const objURL = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objURL; a.download = filename; a.click();
        URL.revokeObjectURL(objURL);
    } catch (error) {
        showToast("Failed to download Image, try right-click > save as!",true,false);
    }
}

async function generate({regenerate = false} = {}){
    generateBtn.disabled = true;
    const basePrompt = (promptEl.value || '').trim();
    if (!basePrompt) {
        showToast("please Enter a prompt!",true,false);
        return;
    }
    const styled = basePrompt + (styleEl.value || '');
    const seed = (regenerate ? (regenerateBtn.dataset.seed || '') : (seedEl.value || '')) || '';
    const ratio = ratioEl.value;
    const model = modelEl.value;

    const url = buildPollinationsURL(styled, {ratio, seed, model})
    setLoading(true);

    try{
        const img = new Image();
        img.referrerPolicy = "no-referrer";
        img.onload = ()=>{
            output.innerHTML = "";
            output.appendChild(img);
            downloadBtn.disabled = false;
            regenerateBtn.disabled = false;
            copyPromptBtn.disabled = false;
            downloadBtn.dataset.url = url;
            copyPromptBtn.dataset.prompt = styled;
            regenerateBtn.dataset.seed = (new URL(url)).searchParams.get("seed");
            saveHistory({url, prompt: styled, seed: regenerateBtn.dataset.seed, ts: Date.now()})
        }
        img.onerror = () => showToast("Image Failed to load!",true,false);
        img.src = url;
        generateBtn.disabled = false;
    }
    catch(error){
        setLoading(false);
        console.log(error);
        showToast("Failed to generate Image,try again later.",true,false);
    }
}

generateBtn.addEventListener("click",()=> generate());
el("surprise").addEventListener("click", ()=>{
    const pick = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
    promptEl.value = pick;
})
el("clearHistory").addEventListener("click",()=>{
    localStorage.removeItem(STORAGE_KEY);
    renderGallery();
})
downloadBtn.addEventListener("click",()=>{
    if(downloadBtn.disabled) return;
    downloadImage(downloadBtn.dataset.url, "codenest-ai.png")
})
copyPromptBtn.addEventListener("click",async ()=>{
    if(copyPromptBtn.disabled) return;
    try{
        await navigator.clipboard.writeText(copyPromptBtn.dataset.prompt || '');
        showToast("prompt copied to clipboard!",false,true);
    }catch(error){
        showToast("couldn't copy prompt, an error occured!",true,false);
    }
})
regenerateBtn.addEventListener("click",()=> generate({regenerate: true}));
galleryEl.addEventListener("click",(e)=>{
    const btn = e.target.closest("button.mini-btn");
    if(!btn) return;
    const act = btn.dataset.act;
    const url = decodeURIComponent(btn.dataset.url || '');
    if(act == "dl") {
        downloadImage(url,"codenest-ai.png");
    }
    if (act == "use") {
        const p = decodeURIComponent(btn.dataset.prompt || '');
        promptEl.value = p;
        seedEl.value = btn.dataset.seed || "";
        const img = new Image();
        img.src = url;
        img.onload = ()=>{
            output.innerHTML = "";
            output.appendChild(img);
        }
        downloadBtn.disabled = false; copyPromptBtn.disabled = false; regenerateBtn.disabled = false;
        downloadBtn.dataset.url = url; copyPromptBtn.dataset.prompt = p; regenerateBtn.dataset.seed = btn.dataset.seed || "";
    }
})

renderGallery();