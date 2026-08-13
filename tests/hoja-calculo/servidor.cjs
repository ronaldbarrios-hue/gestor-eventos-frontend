const http=require('http'),fs=require('fs'),p=require('path');
const raiz=process.argv[2], puerto=8899;
const tipos={'.html':'text/html','.js':'text/javascript','.xlsx':'application/octet-stream','.css':'text/css'};
http.createServer((req,res)=>{
  let ruta=decodeURIComponent(req.url.split('?')[0]);
  if(ruta==='/')ruta='/_prueba/hoja.html';
  // /src/... vive en el repo; el resto cuelga de public/
  const abs=ruta.startsWith('/src/')?p.join(raiz,ruta):p.join(raiz,'public',ruta);
  fs.readFile(abs,(e,d)=>{
    if(e){res.writeHead(404);return res.end('no: '+abs);}
    res.writeHead(200,{'Content-Type':tipos[p.extname(abs)]||'application/octet-stream'});
    res.end(d);
  });
}).listen(puerto,()=>console.log('sirviendo en http://localhost:'+puerto));
