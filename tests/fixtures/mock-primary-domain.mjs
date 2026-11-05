// Safe deterministic HTTP stubs. No requests leave the CI runner.
globalThis.fetch=async input=>{
 const url=new URL(String(input)),mode=process.env.MOCK_DOMAIN_MODE;
 if(url.hostname!=='cannybrainy.com')throw Error('Unexpected fetch target');
 if(mode==='blocked')return new Response('Old origin 404',{status:404});
 if(mode!=='ready')throw Error('Missing test mode');
 if(url.pathname==='/api/health')return Response.json({status:'ok',database:'d1',commit:process.env.GITHUB_SHA});
 if(url.pathname==='/')return new Response('<html><link rel="stylesheet" href="/hub.css"><h1>AICHEATCODE</h1></html>');
 if(url.pathname==='/api/editor'||url.pathname==='/api/site-cms')return new Response('Forbidden',{status:403});
 return new Response('Not Found',{status:404});
};
