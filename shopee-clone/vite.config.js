import { defineConfig } from 'vite';
import { createApiHandler } from './server/app.mjs';

export default defineConfig({
  plugins:[{name:'ally-server',configureServer(server){
    const api=createApiHandler();
    server.middlewares.use((req,res,next)=>{api(req,res).then(handled=>{if(!handled)next()}).catch(next)});
  }}],
});
