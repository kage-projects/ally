import { defineConfig } from 'vite';
import { createApiHandler, readSettings } from './server/app.mjs';
import { createDashboardProxy, createDashboardUpgradeProxy } from './server/dashboard-proxy.mjs';

export default defineConfig({
  plugins:[{name:'ally-server',configureServer(server){
    const api=createApiHandler();
    const dashboard=createDashboardProxy({origin:()=>readSettings().dashboardOrigin});
    const upgrade=createDashboardUpgradeProxy({origin:()=>readSettings().dashboardOrigin});
    server.httpServer?.on('upgrade',upgrade);
    server.middlewares.use((req,res,next)=>{if(!dashboard(req,res))next()});
    server.middlewares.use((req,res,next)=>{api(req,res).then(handled=>{if(!handled)next()}).catch(next)});
  }}],
});
