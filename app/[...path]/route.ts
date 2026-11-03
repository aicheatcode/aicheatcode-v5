import {env} from 'cloudflare:workers';
import {servePage} from '../../lib/site-response';
export function GET(request:Request){return servePage(request,env.DB);}
