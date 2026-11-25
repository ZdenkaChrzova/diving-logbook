(() => {
  "use strict";
  let map=null, cluster=null, mapReady=false, selectedId=null;
  const el=id=>document.getElementById(id);
  const validNumber=v=>typeof v==="number"&&Number.isFinite(v);
  function hasCoordinates(site){return validNumber(site?.latitude)&&validNumber(site?.longitude)&&Math.abs(site.latitude)<=90&&Math.abs(site.longitude)<=180}
  function formatCoordinates(site){
    if(!hasCoordinates(site))return "";
    const lat=Math.abs(site.latitude).toFixed(5).replace(".",","),lon=Math.abs(site.longitude).toFixed(5).replace(".",",");
    return `${lat}° ${site.latitude<0?"J":"S"}, ${lon}° ${site.longitude<0?"Z":"V"}`;
  }
  function parseCoordinates(value){
    const raw=String(value||"").trim();
    if(!raw)return {latitude:null,longitude:null};
    const text=raw.toUpperCase().replace(/−/g,"-").replace(/\s+/g," ");
    const parts=text.split(/[;,](?=\s*[-+]?\d)/).map(x=>x.trim()).filter(Boolean);
    let match=text.match(/^\s*([-+]?\d{1,2}(?:[.,]\d+)?)\s*°?\s*([NSJ])?\s*[,;]\s*([-+]?\d{1,3}(?:[.,]\d+)?)\s*°?\s*([EVOZ])?\s*$/i);
    if(!match&&parts.length===2){
      const a=parts[0].match(/([-+]?\d{1,2}(?:[.,]\d+)?)\s*°?\s*([NSJ])?/i);
      const b=parts[1].match(/([-+]?\d{1,3}(?:[.,]\d+)?)\s*°?\s*([EVOZ])?/i);
      if(a&&b)match=[raw,a[1],a[2]||"",b[1],b[2]||""];
    }
    if(!match)throw new Error("Souřadnice se nepodařilo rozpoznat. Použij formát 50,00080° S, 14,76000° V.");
    let latitude=Number(match[1].replace(",",".")),longitude=Number(match[3].replace(",","."));
    const latDir=(match[2]||"").toUpperCase(),lonDir=(match[4]||"").toUpperCase();
    if(latDir==="J")latitude=-Math.abs(latitude);else if(latDir==="S"||latDir==="N")latitude=Math.abs(latitude);
    if(lonDir==="Z"||lonDir==="O")longitude=-Math.abs(longitude);else if(lonDir==="V"||lonDir==="E")longitude=Math.abs(longitude);
    if(!Number.isFinite(latitude)||Math.abs(latitude)>90)throw new Error("Zeměpisná šířka musí být v rozsahu −90 až 90°.");
    if(!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error("Zeměpisná délka musí být v rozsahu −180 až 180°.");
    return {latitude,longitude};
  }
  function allSites(){return Object.values(db.sites||{}).sort((a,b)=>(a.name||"").localeCompare(b.name||"","cs"))}
  function countDives(id){return (db.dives||[]).filter(d=>String(d.siteId)===String(id)).length}
  function lastDive(id){return [...(db.dives||[])].filter(d=>String(d.siteId)===String(id)).sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0]||null}
  function updateSummary(){
    const sites=allSites(),mapped=sites.filter(hasCoordinates),missing=sites.filter(x=>!hasCoordinates(x));
    if(el("mapSummary"))el("mapSummary").textContent=`${mapped.length} z ${sites.length} lokalit na mapě`;
    if(el("mapMappedCount"))el("mapMappedCount").textContent=mapped.length;
    if(el("mapMissingCount"))el("mapMissingCount").textContent=missing.length;
    if(el("mapTotalCount"))el("mapTotalCount").textContent=sites.length;
    if(el("showMissingSites")){el("showMissingSites").textContent=`Doplnit souřadnice u ${missing.length} lokalit`;el("showMissingSites").disabled=!missing.length}
  }
  function popup(site){
    const id=site.ssiId??site.id,last=lastDive(id),dives=countDives(id);
    return `<div class="map-popup"><strong>${esc(site.name||"Bez názvu")}</strong><span>${[site.country,site.region].filter(Boolean).map(esc).join(" · ")}</span><span>${dives} ${dives===1?"ponor":"ponorů"}${last?.date?` · poslední ${fmtDate(last.date)}`:""}</span><span>${formatCoordinates(site)}</span><button type="button" data-map-edit="${esc(String(id))}">Upravit lokalitu</button><a href="https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}" target="_blank" rel="noopener">Navigovat</a></div>`;
  }
  function renderMap(){
    updateSummary();
    const container=el("localitiesMap");if(!container)return;
    if(typeof L==="undefined"){container.innerHTML='<div class="map-unavailable">Mapu se nepodařilo načíst. Zkontroluj internetové připojení.</div>';return}
    if(!map){
      map=L.map(container,{zoomControl:true}).setView([49.8,15.5],6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
      cluster=typeof L.markerClusterGroup==="function"?L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:45}):L.layerGroup();
      map.addLayer(cluster);mapReady=true;
    }
    cluster.clearLayers();
    const q=(el("mapSearch")?.value||"").trim().toLocaleLowerCase("cs");
    const sites=allSites().filter(hasCoordinates).filter(s=>!q||`${s.name||""} ${s.country||""} ${s.region||""}`.toLocaleLowerCase("cs").includes(q));
    const bounds=[];
    sites.forEach(site=>{const marker=L.marker([site.latitude,site.longitude]).bindPopup(popup(site));marker.on("popupopen",()=>setTimeout(()=>{document.querySelector(`[data-map-edit="${CSS.escape(String(site.ssiId??site.id))}"]`)?.addEventListener("click",()=>openSiteFromMap(site.ssiId??site.id))},0));cluster.addLayer(marker);bounds.push([site.latitude,site.longitude])});
    if(bounds.length===1)map.setView(bounds[0],11);else if(bounds.length>1)map.fitBounds(bounds,{padding:[28,28],maxZoom:11});else map.setView([49.8,15.5],6);
    setTimeout(()=>map.invalidateSize(),50);
  }
  function openSiteFromMap(id){selectedId=String(id);showView("sitesView");renderSitesDb();openSiteForm(id)}
  function renderMissing(){
    const q=(el("mapSearch")?.value||"").trim().toLocaleLowerCase("cs");
      const missing=allSites().filter(s=>!hasCoordinates(s)).filter(s=>!q||`${s.name||""} ${s.country||""} ${s.region||""}`.toLocaleLowerCase("cs").includes(q));
    el("missingSitesList").innerHTML=missing.map(s=>`<button class="db-card" type="button" data-missing-site="${esc(String(s.ssiId??s.id))}"><div><h3>${esc(s.name||"Bez názvu")}</h3><p>${[s.country,s.region].filter(Boolean).map(esc).join(" · ")}</p><small>SSI ID ${esc(String(s.ssiId??s.id))}</small></div><b>›</b></button>`).join("")||'<div class="terms-ok"><span>✓</span><div><strong>Všechny lokality mají souřadnice</strong></div></div>';
    el("missingSitesPanel").classList.remove("hidden");
    document.querySelectorAll("[data-missing-site]").forEach(b=>b.onclick=()=>openSiteFromMap(b.dataset.missingSite));
  }
  window.parseSiteCoordinates=parseCoordinates;
  window.formatSiteCoordinates=formatCoordinates;
  window.siteHasCoordinates=hasCoordinates;
  window.refreshLocalitiesMapSummary=updateSummary;
  window.renderLocalitiesMap=renderMap;
    window.refreshMissingLocalitiesList=()=>{if(!el("missingSitesPanel")?.classList.contains("hidden"))renderMissing()};
  document.addEventListener("DOMContentLoaded",()=>{
    el("openMap").onclick=()=>{showView("mapView");el("missingSitesPanel").classList.add("hidden");renderMap()};
    el("mapSearch").oninput=()=>{renderMap();window.refreshMissingLocalitiesList?.()};
    el("showMissingSites").onclick=renderMissing;
    el("closeMissingSites").onclick=()=>el("missingSitesPanel").classList.add("hidden");
    updateSummary();
  });
})();
