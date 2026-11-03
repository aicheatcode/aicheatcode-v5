/* Lossless catalog reader. Only the current page is materialized as prompt objects. */
(function (root) {
  'use strict';
  class PromptCatalog {
    constructor(index, prompts = [], deleted = []) {
      if (index.version !== 1 || index.total !== 100000 || index.groups.length !== 500) throw Error('Format katalog tidak sah.');
      this.index = index;
      this.aliasRows = new Map(Object.entries(index.aliases).map(([row, id]) => [id, Number(row)]));
      this.templates = index.groups.map(g => g.template.map(i => index.lines[i]).join('\n'));
      this.staticSearch = index.groups.map((g, i) => [g.category, g.type, g.title, this.templates[i].replace('[[CATALOG_CONTEXT_LINE]]', '').replace('[[CATALOG_MODE_LINE]]', '')].join(' ').toLowerCase());
      this.contextSearch = index.contextLines.map((line, i) => (index.contexts[i] + ' ' + line).toLowerCase());
      this.modeSearch = index.modeLines.map((line, i) => (index.modes[i] + ' ' + line).toLowerCase());
      this.setBase(prompts, deleted);
    }
    setBase(prompts, deleted = []) {
      this.deleted = new Set(deleted);
      this.base = prompts.filter(p => !this.deleted.has(p.id)).map(p => {
        const row = this.aliasRows.get(p.id);
        if (!row) return p;
        const g = this.index.groups[Math.floor((row - 1) / 200)], offset = (row - 1) % 200;
        return { ...p, csvType: g.type, context: p.context || this.index.contexts[Math.floor(offset / 10)], mode: p.mode || this.index.modes[offset % 10] };
      });
      this.byId = new Map(this.base.map(p => [p.id, p]));
      this.baseSearch = new Map(this.base.map(p => [p.id, [p.id, p.title, p.category, p.type, p.csvType, p.text, p.hook, p.problem, p.context, p.mode, root.PromptLanguage?.tags(p.id)].join(' ').toLowerCase()]));
      this.skipped = new Set(Object.keys(this.index.aliases).map(Number));
      for (const id of [...this.byId.keys(), ...this.deleted]) {
        const row = this.rowNumber(id);
        if (row) this.skipped.add(row);
      }
    }
    rowNumber(id) {
      if (!/^CSV-\d{6}$/.test(id)) return 0;
      const n = Number(id.slice(4));
      return n >= 1 && n <= this.index.total ? n : 0;
    }
    id(row) { return 'CSV-' + String(row).padStart(6, '0'); }
    get(ref) {
      if (typeof ref === 'object') return ref;
      if (typeof ref === 'string') {
        if (this.byId.has(ref)) return this.byId.get(ref);
        ref = this.rowNumber(ref);
      }
      if (!Number.isInteger(ref) || ref < 1 || ref > this.index.total) return undefined;
      const alias = this.index.aliases[ref];
      if (alias) return this.byId.get(alias);
      const id = this.id(ref);
      if (this.deleted.has(id)) return undefined;
      if (this.byId.has(id)) return this.byId.get(id);
      const gi = Math.floor((ref - 1) / 200), offset = (ref - 1) % 200;
      const ci = Math.floor(offset / 10), mi = offset % 10, g = this.index.groups[gi];
      const text = this.templates[gi].replace('[[CATALOG_CONTEXT_LINE]]', this.index.contextLines[ci]).replace('[[CATALOG_MODE_LINE]]', this.index.modeLines[mi]);
      return { id, title: g.title, category: g.category, type: g.type, context: this.index.contexts[ci], mode: this.index.modes[mi], text, source: this.index.filename, location: 'rekod data ' + ref + ' (tidak termasuk pengepala; medan berbilang baris)', recordType: 'Prompt daripada CSV pengguna', testStatus: 'NOT TESTED', qa: 'PASS — teks sepadan tepat dengan CSV', duplicate: 'UNIK TEKS — padanan lama dikekalkan melalui ID asal', attribution: 'Bukan dilabel prompt rasmi pembangun AI; CSV tidak menyertakan URL rasmi.' };
    }
    facets() {
      const categories = new Map(), types = new Map();
      const add = (map, name, n) => { if (name) map.set(name, (map.get(name) || 0) + n); };
      for (const p of this.base) { add(categories, p.category, 1); add(types, p.type, 1); if (p.csvType && p.csvType !== p.type) add(types, p.csvType, 1); }
      const groupSkips = new Array(this.index.groups.length).fill(0);
      for (const row of this.skipped) groupSkips[Math.floor((row - 1) / 200)]++;
      this.index.groups.forEach((g, i) => { const n = g.count - groupSkips[i]; add(categories, g.category, n); add(types, g.type, n); });
      const entries = map => [...map].sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
      return { total: [...categories.values()].reduce((a, b) => a + b, 0), categories: entries(categories), types: entries(types) };
    }
    taskId(ref) {
      if (typeof ref === 'number') return 'TASK-' + String(this.index.groups[Math.floor((ref - 1) / 200)].start).padStart(6, '0');
      const row=this.rowNumber(ref.id)||this.aliasRows.get(ref.id);
      if(row){const g=this.index.groups[Math.floor((row-1)/200)];if(ref.category===g.category&&ref.title===g.title&&(ref.csvType||ref.type)===g.type)return 'TASK-'+String(g.start).padStart(6,'0');}
      return ref.id;
    }
    variants(prompt) {
      const task=this.taskId(prompt);
      if(!task.startsWith('TASK-'))return [prompt];
      const start=Number(task.slice(5)),result=[];
      for(let row=start;row<start+200;row++){const p=this.get(row);if(p&&this.taskId(p)===task)result.push(p);}
      return result;
    }
    getTask(task,variant) {
      if(!/^TASK-\d{6}$/.test(task))return this.get(task);
      const start=Number(task.slice(5));if(start<1||start>this.index.total||(start-1)%200!==0)return undefined;
      if(variant){const p=this.get(variant);if(p&&this.taskId(p)===task)return p;}
      for(let row=start;row<start+200;row++){const p=this.get(row);if(p&&this.taskId(p)===task)return p;}
    }
    query(filters = {}, extras = []) {
      const terms = root.PromptLanguage ? root.PromptLanguage.terms(filters.q) : String(filters.q || '').trim().toLowerCase().split(/\s+/).filter(Boolean).map(w=>[w]);
      const topic = filters.topicData;
      const pattern = topic?.[3] ? new RegExp(topic[3], 'i') : null;
      const category = filters.category || '', type = filters.type || '';
      const references = [];
      const matchesBase = p => {
        if (category && p.category !== category || type && p.type !== type && p.csvType !== type) return false;
        if (topic?.[2] && p.category !== topic[2]) return false;
        if (filters.context && p.context !== filters.context || filters.mode && p.mode !== filters.mode) return false;
        if (filters.status === 'sample' && !p.testStatus?.startsWith('SAMPEL') || filters.status === 'untested' && p.testStatus !== 'NOT TESTED') return false;
        const search = this.baseSearch.get(p.id) || [p.id, p.title, p.category, p.type, p.text, p.context, p.mode].join(' ').toLowerCase();
        return terms.every(words=>words.some(w => search.includes(w))) && (!pattern || pattern.test(search));
      };
      for (const p of this.base) if (matchesBase(p)) references.push(p);
      for (const p of extras) if (matchesBase(p)) references.push(p);
      if (filters.status !== 'sample') this.index.groups.forEach((g, gi) => {
        if (category && g.category !== category || type && g.type !== type || topic?.[2] && g.category !== topic[2]) return;
        const staticText = this.staticSearch[gi];
        const remaining = terms.filter(words => !words.some(w=>staticText.includes(w)));
        const staticTopic = !pattern || pattern.test(staticText);
        for (let ci = 0; ci < this.index.contexts.length; ci++) {
          if (filters.context && filters.context !== this.index.contexts[ci]) continue;
          const contextText = this.contextSearch[ci];
          const contextRemaining = remaining.filter(words => !words.some(w=>contextText.includes(w)));
          for (let mi = 0; mi < this.index.modes.length; mi++) {
            if (filters.mode && filters.mode !== this.index.modes[mi]) continue;
            const row = g.start + ci * 10 + mi;
            if (this.skipped.has(row)) continue;
            const modeText = this.modeSearch[mi];
            if (!contextRemaining.every(words=>words.some(w => modeText.includes(w) || this.id(row).toLowerCase().includes(w)))) continue;
            if (!staticTopic && !pattern.test(contextText) && !pattern.test(modeText)) continue;
            references.push(row);
          }
        }
      });
      const title = ref => typeof ref === 'number' ? this.index.groups[Math.floor((ref - 1) / 200)].title : ref.title;
      const id = ref => typeof ref === 'number' ? this.id(ref) : ref.id;
      if (filters.sort === 'az') references.sort((a, b) => title(a).localeCompare(title(b)));
      else if (filters.sort === 'id') references.sort((a, b) => id(a).localeCompare(id(b)));
      else {
        const featured = filters.featured || [];
        if (featured.length) {
          const picks = new Map(featured.map((value, i) => [value, i]));
          references.sort((a, b) => (picks.get(id(a)) ?? 9999) - (picks.get(id(b)) ?? 9999));
        }
      }
      const recordTotal=references.length;
      let selected=references, counts=new Map();
      if(filters.grouped){
        const unique=new Map();
        for(const ref of references){const key=this.taskId(ref);counts.set(key,(counts.get(key)||0)+1);if(!unique.has(key))unique.set(key,ref);}
        selected=[...unique.values()];
      }
      const total = selected.length, pages = Math.max(1, Math.ceil(total / 12));
      const page = Math.max(1, Math.min(pages, Number(filters.page) || 1));
      return { total, recordTotal, pages, page, rows: selected.slice((page - 1) * 12, page * 12).map(ref => {const p=this.get(ref);return filters.grouped?{...p,variantCount:counts.get(this.taskId(ref))||1,taskId:this.taskId(ref)}:p;}) };
    }
  }
  root.PromptCatalog = PromptCatalog;
})(globalThis);
