/* Browser-local drafts; original catalog records are never mutated. */
(function(root){
  'use strict';
  const fields=['role','task','context','audience','format','tone','limits'];
  const validPlaceholder=s=>/^(?:\[[^\]\n]{1,160}\]|\{[a-zA-Z_][a-zA-Z0-9_]{0,100}\})$/.test(s);
  const blank=()=>({version:1,adaptations:Object.create(null),builder:null,filters:null,scroll:0});
  class PromptWorkspace{
    constructor(storage,key='aicheatcode-drafts-v1'){
      this.storage=storage;this.key=key;this.state=blank();this.available=true;
      try{
        const raw=JSON.parse(storage.getItem(key)||'null');
        if(raw&&typeof raw==='object'){
          if(raw.adaptations&&typeof raw.adaptations==='object')for(const [id,record]of Object.entries(raw.adaptations)){
            if(!/^[A-Za-z0-9_-]{1,120}$/.test(id)||!record||typeof record!=='object')continue;
            const values={};for(const [placeholder,value]of Object.entries(record.values||{}))if(validPlaceholder(placeholder)&&typeof value==='string'&&value.length<=4000)values[placeholder]=value;
            this.state.adaptations[id]={values,updatedAt:typeof record.updatedAt==='string'?record.updatedAt:''};
          }
          if(raw.builder&&typeof raw.builder==='object'){
            const values={};for(const key of fields)if(typeof raw.builder.fields?.[key]==='string')values[key]=raw.builder.fields[key].slice(0,6000);
            this.state.builder={fields:values,output:typeof raw.builder.output==='string'?raw.builder.output.slice(0,60000):'',signature:typeof raw.builder.signature==='string'?raw.builder.signature.slice(0,20000):'',updatedAt:typeof raw.builder.updatedAt==='string'?raw.builder.updatedAt:''};
          }
          if(raw.filters&&typeof raw.filters==='object'){
            this.state.filters={};for(const [key,value]of Object.entries(raw.filters))if(['q','category','type','status','context','mode','sort','topic'].includes(key)&&typeof value==='string')this.state.filters[key]=value.slice(0,200);
            this.state.filters.page=Math.max(1,Math.min(100000,Number(raw.filters.page)||1));
          }
          this.state.scroll=Math.max(0,Number(raw.scroll)||0);
        }
      }catch{this.available=false;}
    }
    persist(){try{this.storage.setItem(this.key,JSON.stringify(this.state));this.available=true;return true;}catch{this.available=false;return false;}}
    values(id){return this.state.adaptations[id]?.values||{};}
    setValue(id,placeholder,value){if(!/^[A-Za-z0-9_-]{1,120}$/.test(id)||!validPlaceholder(placeholder))return false;const values={...this.values(id),[placeholder]:String(value).slice(0,4000)};this.state.adaptations[id]={values,updatedAt:new Date().toISOString()};return this.persist();}
    adapt(prompt){let text=prompt.text;for(const [placeholder,value]of Object.entries(this.values(prompt.id)))if(value.trim())text=text.split(placeholder).join(value.trim());return text;}
    setBuilder(values,output,signature){const clean={};for(const key of fields)clean[key]=String(values[key]||'').slice(0,6000);this.state.builder={fields:clean,output:String(output||'').slice(0,60000),signature:String(signature||''),updatedAt:new Date().toISOString()};return this.persist();}
    signature(values){return JSON.stringify(fields.map(k=>String(values[k]||'')));}
    setFilters(filters,scroll){this.state.filters={...filters};this.state.scroll=Math.max(0,scroll||0);return this.persist();}
    clearAdaptation(id){delete this.state.adaptations[id];return this.persist();}
    clear(){this.state=blank();return this.persist();}
  }
  root.PromptWorkspace=PromptWorkspace;
})(globalThis);
