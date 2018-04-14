"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const pathMatch = require("path-match");
const url = require("url");
const qs = require("qs");
class ServerRouter {
    constructor() {
    }
    static findSrvRoute(req) {
        var parsedUrl = url.parse(req.url);
        var path = parsedUrl.pathname;
        // finding controller by path
        var srvRoute = _1.Server.routes.find((route) => {
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
    static executeRoute(srvRoute, req, res) {
        return new Promise((resolve, reject) => {
            // creating object from controllerClass 
            // Reason : basically because we need to run constructor
            var controllerObject = srvRoute.controllerObject;
            var actions = (controllerObject[srvRoute.endpoint].actions);
            _1.Server.middlewares.forEach((middle) => actions.unshift(middle));
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
                }, passedModel);
            };
            executeActions(null);
        });
    }
    static routeIt(req, res) {
        return new Promise((resolve, reject) => {
            // finding controller by path
            var srvRoute = ServerRouter.findSrvRoute(req);
            // Check if controller exist and requested method matches 
            if (!srvRoute) {
                res.statusCode = 404;
                res.send(`[${req.method.toUpperCase()} ${req.url}] route not found !`);
                return;
            }
            var authService = _1.Server.services["AuthService"];
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
                res.json(new _1.ServerError(401, e.message));
            });
        });
    }
}
ServerRouter.routerPathMatcher = pathMatch({
    // path-to-regexp options 
    sensitive: false,
    strict: false,
    end: false,
});
exports.ServerRouter = ServerRouter;