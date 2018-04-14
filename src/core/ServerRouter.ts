import { ServerRequestInterface, ServerResponseInterface, ServerRouteInterface, Server, ServerEndpointActionInterface, ServerError } from ".";
import * as pathMatch from 'path-match'
import * as url from 'url';
import * as qs from 'qs';
import { AuthService } from "..";

export class ServerRouter {




    constructor() {


    }

    static routerPathMatcher = pathMatch({
        // path-to-regexp options 
        sensitive: false,
        strict: false,
        end: false,
    });

    static findSrvRoute(req): ServerRouteInterface {

        var parsedUrl = url.parse(req.url);
        var path = parsedUrl.pathname;


        // finding controller by path
        var srvRoute: ServerRouteInterface = Server.routes.find((route) => {

            // Check if controller exist and requested method matches 
            if (route.method.toLowerCase() != req.method.toLowerCase())
                return false;


            var matcher = ServerRouter.routerPathMatcher(route.route);

            var params = matcher(path);

            if (params !== false) {

                req.query = qs.parse(parsedUrl.query);
                req.params = params;
                return true;
            }

            return false;

        });

        return srvRoute;

    }


    static executeRoute(srvRoute: ServerRouteInterface, req: ServerRequestInterface, res: ServerResponseInterface): Promise<number> {

        return new Promise((resolve, reject) => {


            // creating object from controllerClass 
            // Reason : basically because we need to run constructor
            var controllerObject = srvRoute.controllerObject;

            var actions: ServerEndpointActionInterface[] = (controllerObject[srvRoute.endpoint].actions);
            Server.middlewares.forEach((middle) => actions.unshift(middle));

            // starting from first action
            var actionIndex = 0;

            res.on('finish', () => resolve(actionIndex));


            var executeActions = function (passedModel) {

                actions[actionIndex](req, res, function _next(model) {


                    if (model)
                        if (model.constructor)
                            if (model.constructor.name == "ServerError") {

                                reject(model);
                                return;

                            }

                    // Execute next
                    actionIndex++;

                    if (actions.length == actionIndex)
                        return resolve(actionIndex);


                    executeActions(model);


                }, function _done() {
                    resolve(actionIndex);
                },
                    passedModel);


            };

            executeActions(null);

        });
    }

    static routeIt(req: ServerRequestInterface, res: ServerResponseInterface): Promise<void> {

        return new Promise((resolve, reject) => {

            // finding controller by path
            var srvRoute = ServerRouter.findSrvRoute(req);

            // Check if controller exist and requested method matches 
            if (!srvRoute) {

                res.statusCode = 404;
                res.send(`[${req.method.toUpperCase()} ${req.url}] route not found !`);
                return;

            }

            var authService: AuthService = Server.services["AuthService"];



            authService.authorizeRequest(req, srvRoute.controllerName, srvRoute.endpoint, srvRoute.publicAccess).then(() => {

                ServerRouter.executeRoute(srvRoute, req, res).then(() => {

                    resolve();

                }).catch(e => {

                    reject(e);
                    res.statusCode = e.code;
                    res.json(e);
                });


            }).catch((e) => {

                reject(e);
                res.statusCode = 401;
                res.json(new ServerError(401, e.message));

            });


        });






    }




}