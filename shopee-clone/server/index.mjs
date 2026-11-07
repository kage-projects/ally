import { createServer } from 'node:http';
import { createAppHandler, readSettings } from './app.mjs';
import { createDashboardUpgradeProxy } from './dashboard-proxy.mjs';

const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||5173);
const server=createServer(createAppHandler());
const upgrade=createDashboardUpgradeProxy({origin:()=>readSettings().dashboardOrigin});
server.on('upgrade',(req,socket,head)=>{if(!upgrade(req,socket,head))socket.destroy()});
server.listen(port,host,()=>console.log(`Shopee + Ally: http://${host}:${port}`));
for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>server.close(()=>process.exit(0)));
