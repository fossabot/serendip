import { Server, ServerOptionsInterface } from "./core";
import * as cluster from 'cluster';
import { cpus } from 'os';
import { EventEmitter } from 'events';

export function start(opts?: ServerOptionsInterface) {

    if (!opts.controllers)
        opts.controllers = [];

    if (!opts.services)
        opts.services = [];


    var workerEmitter = new EventEmitter();

    return new Promise((resolve, reject) => {

        var cpuCount = 1;
        //opts.cpuCores || cpus().length

        if (opts.cpuCores)
            if (opts.cpuCores == 'max')
                cpuCount = cpus().length;
            else
                cpuCount = parseInt(opts.cpuCores.toString());

        var stopForking = false;

        // if this is process
        if (cluster.isMaster && cpuCount > 1) {

            var onClusterMsg = (msg) => {

                if (msg == "fork")
                    cluster.fork().on('message', onClusterMsg);

            };

            onClusterMsg('fork');

            cluster.on('exit', function (worker) {
                console.error('Worker %s has died! Creating a new one.', worker.id);
                if (!stopForking)
                    cluster.fork();
            });

        } else {

            Server.bootstrap(opts, cluster.worker || { id: 0 }, (err) => {

                if (err)
                    return reject(err);

                if (cpuCount == 1)
                    resolve();
                else
                    if (cluster.worker.id == cpuCount) {
                        resolve(cluster.workers);
                    }
                    else if (cluster.worker.id < cpuCount)
                        process.send('fork');

            });

        }


    });





}

