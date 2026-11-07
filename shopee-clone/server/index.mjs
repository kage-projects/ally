import { createServer } from 'node:http';
import { createAppHandler } from './app.mjs';

const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);
const server=createServer(createAppHandler());
server.listen(port,host,()=>console.log(`Shopee + Ally: http://${host}:${port}`));
for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>server.close(()=>process.exit(0)));
