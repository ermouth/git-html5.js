define(["formats/upload_pack_parser", "thirdparty/underscore-min", "thirdparty/inflate.min", "thirdparty/crc32", "thirdparty/2.2.0-sha1", "workers/worker_messages"], function(PackParser){
    return function(){

        var lastPercentUpdate = 0;
        var progress = function(info){
            var pct = (info.at/info.total) * 100;
            if (pct - lastPercentUpdate > 5){
                postMessage({type: GitLiteWorkerMessages.PROGRESS, at: info.at, total: info.total, msg: pct});
                lastPercentUpdate = pct;
            }
        }

        var finish = function(objects, data, common){
            var msgObject = {type: GitLiteWorkerMessages.FINISHED, objects: objects, data: data.buffer, common: common};
            postMessage(msgObject, [msgObject.data]);
        }
        var id = 0;
        var callbacks = {};
        var repoShim = {
            _retrieveRawObject : function(sha, type, callback){
                callbacks[id] = callback;
                postMessage({type: GitLiteWorkerMessages.RETRIEVE_OBJECT, id: id++, sha: sha});
            }
        }
        onmessage = function(evt){

            var msgData = evt.data;
            if (msgData.type == GitLiteWorkerMessages.START){
                packData = msgData.data;
                PackParser.parse(packData, repoShim, finish, progress);
            }
            else if (msgData.type == GitLiteWorkerMessages.OBJECT_RETRIEVED){
                var rawObject = msgData.object;
                var callback = callbacks[msgData.id];
                delete callbacks[msgData.id];
                callback(rawObject);
            }
        }

    };
});