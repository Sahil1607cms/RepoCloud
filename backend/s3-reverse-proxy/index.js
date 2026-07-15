import express from 'express'
import httpProxy from 'http-proxy'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })
const app = express()

const PORT =process.env.S3_PORT || 8000

const proxy = httpProxy.createProxy() //creating the proxy, it can forward request to another server

console.log(`Base path : ${process.env.BASE_PATH}`)
if (!process.env.BASE_PATH) {
  throw new Error("BASE_PATH is not defined");
}

//middleware
//handle all requests without a path also
app.use((req,res)=>{
    const hostname  = req.hostname              // abc123.localhost:8000 => abc123.localhost
    const projectId = hostname.split('.')[0];   // abc123
 
    const basePath = process.env.BASE_PATH.replace(/\/$/, "");
    const resolvesTo = `${basePath}/${projectId}`
    return proxy.web(req,res, {target:resolvesTo,changeOrigin:true}) 
    //changeOrigin changes the Host header of the proxied request to match the target server, making the request appear as if it was sent directly to that server.


})

proxy.on('proxyReq', (proxyReq, req, res) => { //proxyReq build in event, runs just before proxy sends the request to S3
    const url = req.url;
    if (url === '/')
        proxyReq.path += 'index.html' //changing /__outputs__/abc123/ => /__outputs__/abc123/index.html just before sending

})

app.listen(PORT, ()=> console.log(`Reverse proxy server running on port ${PORT}`))
