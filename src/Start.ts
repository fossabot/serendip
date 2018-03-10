import { Server } from "./Server";
import * as dotenv from 'dotenv';
import * as cluster from 'cluster';
import { cpus } from 'os';
import * as models from './models';


export interface startOptions {

    controllersToRegister?: any,


}
export function start(opts: startOptions) {

    dotenv.config();

    var cpuCount = 1 || cpus().length;

    // if this is process
    if (cluster.isMaster) {

        console.log('Forking workers ...');

        for (var i = 0; i < cpuCount; i++) {
            console.log('Creating worker ' + (i + 1));
            cluster.fork();
        }

        cluster.on('exit', function (worker) {
            console.error('Worker %s has died! Creating a new one.', worker.id);
            cluster.fork();
        });

    } else {
        Server.bootstrap(opts, cluster.worker);

    }






}

