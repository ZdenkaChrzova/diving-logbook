(() => {
  "use strict";
  const DB_NAME="DivingLogBookDB", DB_VERSION=1, STORE="appData", RECORD="database", LEGACY_KEY="divingLogBook.v1";
  let opening=null;
  function open(){
    if(opening)return opening;
    opening=new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB_NAME,DB_VERSION);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error||new Error("IndexedDB nelze otevřít."));
      r.onblocked=()=>reject(new Error("Migraci blokuje jiné otevřené okno aplikace."));
    });
    return opening;
  }
  async function read(){const idb=await open();return new Promise((resolve,reject)=>{const tx=idb.transaction(STORE,"readonly"),r=tx.objectStore(STORE).get(RECORD);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}
  async function write(data){const idb=await open();return new Promise((resolve,reject)=>{const tx=idb.transaction(STORE,"readwrite");tx.objectStore(STORE).put(data,RECORD);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error("Data se nepodařilo uložit."));tx.onabort=()=>reject(tx.error||new Error("Ukládání bylo přerušeno."))})}
  async function loadOrMigrate(){
    const stored=await read();if(stored)return {data:stored,migrated:false};
    const raw=localStorage.getItem(LEGACY_KEY);if(!raw)return {data:null,migrated:false};
    let legacy;try{legacy=JSON.parse(raw)}catch{return {data:null,migrated:false}};
    await write(legacy);const verified=await read();
    if(!verified||!Array.isArray(verified.dives))throw new Error("Kontrola migrace selhala. Původní data zůstala zachována.");
    localStorage.removeItem(LEGACY_KEY);localStorage.setItem("divingLogBook.storage","indexedDB-v1");
    return {data:verified,migrated:true};
  }
  window.DiveStorage={read,write,loadOrMigrate,DB_NAME,STORE};
})();
