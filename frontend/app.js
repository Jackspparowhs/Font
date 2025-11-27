const apiBase = (window.location.hostname === "localhost") 
  ? "http://localhost:3000/api" 
  : "/api"; // adjust if deployed under subpath

// Age gate
const ageGate = document.getElementById("ageGate");
const enterBtn = document.getElementById("enterBtn");
if (ageGate) {
  const seen = localStorage.getItem("age_ok");
  if (seen) ageGate.style.display = "none";
  enterBtn?.addEventListener("click", () => {
    localStorage.setItem("age_ok", "1");
    ageGate.style.display = "none";
  });
}

// Basic UI elements
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const videosGrid = document.getElementById("videosGrid");
const categoryList = document.getElementById("categoryList");
const loadMoreBtn = document.getElementById("loadMore");

let page = 1;
let lastQuery = "trending";

// Generic category list (you can replace/add using provider categories)
const categories = [
  "amateur","asian","bigtits","blonde","milf","lesbian","pov","anal","ebony","hentai"
];
function renderCategories(){
  if(!categoryList) return;
  categoryList.innerHTML = categories.map(c=>`<li><a href="category.html?cat=${encodeURIComponent(c)}">${c}</a></li>`).join("");
}
renderCategories();

async function search(q, reset=true){
  if(!q) return;
  if(reset){ page=1; videosGrid && (videosGrid.innerHTML=""); }
  lastQuery = q;
  try{
    const res = await fetch(`${apiBase}/search?q=${encodeURIComponent(q)}&page=${page}`);
    if(!res.ok) throw new Error("search failed");
    const json = await res.json();
    // Provider data is under json.provider — adjust if different
    const data = json?.provider || json;
    // Attempt to find an array of video items
    let items = [];
    // Common shapes: check data.video (array) or data.videos or data.results
    if (Array.isArray(data)) items = data;
    else if (Array.isArray(data.videos)) items = data.videos;
    else if (Array.isArray(data.results)) items = data.results;
    else if (Array.isArray(data.items)) items = data.items;
    else {
      // fallback: try to find first array in object
      for(const k of Object.keys(data||{})){
        if(Array.isArray(data[k])){ items = data[k]; break; }
      }
    }

    // Map items to cards. This mapping may need to be adjusted to provider field names.
    items.forEach(it=>{
      const title = it.title || it.name || it.video_title || "Untitled";
      const thumb = it.thumbnail || it.preview || it.thumb || (it.thumbs && it.thumbs[0]) || "";
      const duration = it.duration || it.length || "";
      const vidId = it.id || it.video_id || encodeURIComponent(title);
      const card = document.createElement("a");
      card.className = "card";
      card.href = `video.html?id=${encodeURIComponent(vidId)}`;
      card.innerHTML = `
        <div class="thumb" style="background-image:url('${thumb}');"></div>
        <div class="meta">
          <div class="title">${escapeHtml(title)}</div>
          <div class="sub">${escapeHtml(duration)}</div>
        </div>`;
      videosGrid && videosGrid.appendChild(card);
    });

    page += 1;
  }catch(err){
    console.error("Search error", err);
  }
}

function escapeHtml(s=""){
  return String(s).replace(/[&<>"']/g, function(m){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
  });
}

// handle search form
searchForm?.addEventListener("submit", e=>{
  e.preventDefault();
  const q = searchInput.value.trim();
  if(!q) return;
  search(q,true);
});

// load trending on page load
document.addEventListener("DOMContentLoaded", ()=>{
  // if search input present and page is index: run initial fetch
  if(videosGrid) search('blonde'); // initial trending query
});

// load more
loadMoreBtn?.addEventListener("click", ()=> search(lastQuery, false));

// On video page: fetch video metadata and render
async function loadVideoPage(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if(!id) return;
  try{
    const res = await fetch(`${apiBase}/video?id=${encodeURIComponent(id)}`);
    const json = await res.json();
    const data = json.provider || json;
    // Attempt to pick the first item for metadata
    let item = null;
    if (Array.isArray(data)) item = data[0];
    else if (data.video) item = data.video[0];
    else {
      for(const k of Object.keys(data||{})){
        if(Array.isArray(data[k]) && data[k].length>0){ item = data[k][0]; break; }
      }
    }
    if(!item) return;
    document.getElementById("videoTitle").innerText = item.title || item.name || "Video";
    document.getElementById("videoPerformer").innerText = item.performer || item.model || "";
    document.getElementById("videoDuration").innerText = item.duration || "";
    document.getElementById("videoDesc").innerText = item.description || item.desc || "";
    // embed player if provider gave an embed url
    const playerWrap = document.getElementById("playerWrap");
    if(item.embed_url){
      playerWrap.innerHTML = `<iframe src="${item.embed_url}" frameborder="0" allowfullscreen width="100%" height="360"></iframe>`;
    } else if(item.video_url){
      playerWrap.innerHTML = `<video controls src="${item.video_url}" style="width:100%;height:360px;background:#000"></video>`;
    }
  }catch(err){
    console.error("video page error", err);
  }
}

// Run loadVideoPage on video.html
loadVideoPage();
