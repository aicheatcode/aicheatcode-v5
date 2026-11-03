/* Search aliases and display labels only; source prompt text stays verbatim. */
(function(root){
  'use strict';
  const aliases={
    caption:['caption','captions','kapsyen'],kapsyen:['caption','captions','kapsyen'],
    restoran:['restoran','restaurant','food business','nasi lemak'],restaurant:['restaurant','restoran','food business','nasi lemak'],
    makanan:['makanan','food','menu','hidangan'],food:['food','makanan','hidangan'],
    pelajar:['pelajar','student','learner'],guru:['guru','teacher','tutor'],
    belajar:['belajar','learning','learn','pembelajaran'],kuiz:['kuiz','quiz','soalan'],
    ringkasan:['ringkasan','summary','summarize','summarise'],ringkaskan:['ringkaskan','summarize','summarise','summary'],
    nota:['nota','notes','note'],jadual:['jadual','schedule','calendar','table'],
    kandungan:['kandungan','content'],pemasaran:['pemasaran','marketing','advertising'],
    iklan:['iklan','advertising','advertisement','ad '],jenama:['jenama','brand'],
    imej:['imej','image'],gambar:['gambar','image','photo'],reka:['reka','design'],
    kod:['kod','code','coding'],automasi:['automasi','automation'],
    kerja:['kerja','work'],resume:['resume','cv','résumé'],emel:['emel','email','e-mel'],
    kapsyenrestoran:['kapsyen restoran','restaurant captions']
  };
  const reviewedTags={
    'USER-IA-001':'information architecture sitemap navigation website seni bina maklumat peta laman navigasi struktur laman web',
    'MA-120736':'kapsyen caption jualan restoran restaurant food business makanan nasi lemak',
    'MA-120737':'kapsyen caption produk digital digital product',
    'MA-120714':'belajar pendidikan pelajar guru sains fotosintesis learning science student teacher',
  };
  const titles={'MA-120736':'Kapsyen jualan makanan — dua ayat','MA-120737':'Kapsyen produk digital — dua ayat','MA-120714':'Terangkan fotosintesis dalam tiga langkah'};
  const labels={
    '{website_type}':'Jenis laman web','{audience}':'Audiens sasaran','{content_inventory}':'Kandungan dan tawaran yang tersedia','{primary_conversion}':'Tindakan utama yang dikehendaki','{navigation_limit}':'Had bilangan menu utama',
    'Solo creator':'Pencipta solo','Freelance studio':'Studio bebas','Early-stage SaaS':'SaaS peringkat awal','Local retail':'Kedai setempat','Online course':'Kursus dalam talian','Nonprofit':'Organisasi bukan untung','B2B consultancy':'Perundingan B2B','Digital downloads':'Produk muat turun digital','Membership community':'Komuniti ahli','Food business':'Perniagaan makanan','Event organizer':'Penganjur acara','Creative agency':'Agensi kreatif','Internal operations':'Operasi dalaman','Recruitment team':'Pasukan pengambilan pekerja','Customer support':'Khidmat pelanggan','Public education':'Pendidikan awam','Multilingual business':'Perniagaan pelbagai bahasa','Remote team':'Pasukan jarak jauh','Established brand':'Jenama sedia ada','Pilot project':'Projek rintis',
    'Guided practice':'Belajar dengan contoh','Working deliverable':'Hasil siap guna','Audit and repair':'Semak dan baiki','Options and tradeoffs':'Banding pilihan','Minimum viable version':'Versi asas','Step-by-step procedure':'Langkah demi langkah','Stakeholder handoff':'Serahan kepada pasukan','Quality test plan':'Pelan ujian kualiti','Constraint adaptation':'Sesuaikan kekangan','Iterative improvement':'Tambah baik hasil',
    '[desired result]':'Hasil yang anda perlukan','[paste relevant evidence, draft, data, references, or requirements]':'Fakta, nota atau bahan rujukan','[specific audience, deadline, budget, tools, brand rules]':'Audiens dan kekangan','[English unless another language is required]':'Bahasa output'
  };
  root.PromptLanguage={
    terms(q){return String(q||'').toLowerCase().trim().split(/\s+/).filter(Boolean).map(w=>aliases[w]||[w]);},
    matches(search,terms){return terms.every(alternatives=>alternatives.some(word=>search.includes(word)));},
    tags(id){return reviewedTags[id]||'';},
    title(p){return titles[p.sourceId||p.id]&&p.recordType!=='Versi peribadi'?titles[p.sourceId||p.id]:p.title;},
    label(value){return labels[value]||value;}
  };
})(globalThis);
