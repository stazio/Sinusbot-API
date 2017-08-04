registerPlugin({
    name: "Test",
    version: '1.0.0',
    description: 'I made things, they are my things.',
    author: 'Staz.IO <staz@staz.io>',
    vars: {
        additionalCommands: {
            'title': 'Additional Commands',
            'type': 'multiline',
            'description': 'Along with the sinusbot commands, add more commands to list here.'
        }
    }
}, function (sinusbot, config) {
    function buildUnit(proto, caller, name, is_module, internalGetters) {
        if (caller === null || caller === undefined)
            return false;

        if (caller.hasOwnProperty(name) && caller.name === name) {
            proto = caller;
        } else {
            if (!isNaN(caller))
                caller = parseInt(caller);

            var res = loop(internalGetters, function (key, val) {
                if (typeof(caller) === key || key === undefined) {
                    if (val === true) {
                        proto.getInternal = function () {
                            if (!proto.internal)
                                return proto.internal = caller;
                            return proto.internal;
                        };
                    } else {
                        proto.getInternal = function () {
                            if (!proto.internal)
                                return proto.internal = val(caller);
                            return proto.internal;
                        };
                    }
                    return true;
                }
            });
            if (res !== true)
                return false;
        }

        proto.name = name;

        if (is_module === true) {
            proto.isModule = function () {
                return true;
            };
            proto.isEntity = function () {
                return false;
            };
        } else if (is_module === false) {
            proto.isModule = function () {
                return false;
            };
            proto.isEntity = function () {
                return true;
            };
        } else {
            proto.isModule = proto.isEntity = function () {
                return null;
            }
        }

        proto.equals = function (test) {
            return (new proto(test)) == test;
        };

        proto.internal = false;

        if (proto.hasOwnProperty('build')) {
            proto.build(proto.getInternal());
            proto.build = null;
        }
        return proto;
    }

    function upgrade(arrOr, proto) {
        if (typeof(arrOr) === "object") {
            var res = [];
            loop(arrOr, function (i, obj) {
                res.push(proto(obj));
            });
            return res;
        } else {
            return proto(arrOr);
        }
    }

    /*
    Doesn't Work:
    typing
    track
    trackInfo
    connectionFailed
    clientKicked
    clientKickedFromChannel
    clientNick
    clientIPAddress
    clientAway
    clientBack
    clientMute
    clientUnmute
    channelCreate
    channelUpdate
    channelDelete
    talkerCount
     */
    // Eevnts
    var Events = function() {

        this.chat = function(cb, filter) {
            sinusbot.on('chat', function(ev) {
                var msg = ev.msg;
                var channel = getChannel(ev.channel);
                var client = getClient(ev.clientUid);
                var mode = ev.mode;
                var serverGroups = ev.clientServerGroups;
                var newE = {
                    msg: msg,
                    channel: channel,
                    client: client,
                    source: mode,
                    clientServerGroups: serverGroups
                };

                if (!filter || filter(newE)) {
                    var response = cb(newE);
                    if (response) {
                        switch (mode) {
                            case ChatSources.PRIVATE:
                                client.message(response);
                                break;
                            case ChatSources.CHANNEL:
                                channel.message(response);
                                break;
                            case ChatSources.SERVER:
                                getBackend().message(response);
                                break;
                        }
                    }
                }
            });
        };

        this.connect = function(cb){
            sinusbot.on('connect', cb);
        };

        this.disconnect = function(cb) {
            sinusbot.on('disconnect', cb);
        };

        this.pokeBot = function(cb, filter) {
            sinusbot.on('poke', function(ev) {
                var client = getClient(ev.clientUid);
                var msg = ev.msg;

                var newE = {
                    client: client,
                    msg: msg
                };

                if (!filter || filter(newE)) {
                    var res = cb(newE);
                    if (res)
                        client.poke(res);
                }
            });
        };

        this.trackEnd = function(cb){
            sinusbot.on('trackEnd', cb);// Help em out!
        };

        this.clientMove = function(cb, filter){
            sinusbot.on('clientMove', function(ev) {
                var client = getClient(ev.clientUid);
                var newChannel = getChannel(ev.newChannel);
                var oldChannel = getChannel(ev.oldChannel);

                var newE = {
                    client: client,
                    msg: ev.msg,
                    newChannel: newChannel,
                    oldChannel: oldChannel
                };

                if (!filter || filter(newE)) {
                    var res = cb(newE);

                }
            });
        };

        this.clientCount = function(cb, filter) {
            sinusbot.on('clientCount', function(ev) {
                var count = ev.count;

                var newE = {
                    channel: getBackend().getCurrentChannel(),
                    newCount: count
                };

                if (!filter || filter(newE)) {
                    var res = cb(newE);
                }
            });
        };
    };

    var ChatSources = {
        PRIVATE: 1,
        CHANNEL: 2,
        SERVER: 3
    };

    var _events = false;
    function getEvents() {
        if (_events)
            return _events;
        return _events = new Events();
    }

    // Engine
    var Engine = function () {
        this.name = 'Engine';
        this.internal = require('engine');

        this.getSinusbotInstanceUID = this.internal.getInstanceID;
        this.getBotUID = this.internal.getBotID;
        this.getServerType = this.internal.getBackend;

        this.setInstanceLogLevel = this.internal.setInstanceLogLevel;
        this.setBotLogLevel = this.internal.setBotLogLevel;
        this.getBotLogLevel = this.internal.getBotLogLevel;
        this.reloadScripts = this.internal.reloadScripts;
        this.getNick = this.internal.getNick;
        this.setNick = this.internal.setNick;
        this.setDefaultChannelID = function (channel) {
            this.internal.setDefaultChannelID(getChannel(channel).getID());
        };

        this.webAlert = this.internal.notify;
        this.saveScriptConfig = this.internal.saveConfig;
        this.log = this.internal.log;
    };

    var Servers = {
        TEAMSPEAK: 'ts3',
        DISCORD: 'discord'
    };

    var _engine = false;

    function getEngine() {
        if (_engine)
            return _engine;
        return _engine = new Engine();
    }


// Store
    var Store = function () {
        this.internal = require('store');
        this.setScript = this.internal.set;
        this.getScript = this.internal.get;
        this.unsetScript = this.internal.unset;
        this.getScriptKeys = this.internal.getKeys;
        this.getAllScript = this.internal.getAll;

        this.setGlobal = this.internal.setGlobal;
        this.getGlobal = this.internal.getGlobal;
        this.unsetGlobal = this.internal.unsetGlobal;
        this.getGlobalKeys = this.internal.getKeysGlobal;
        this.getAllGlobal = this.internal.getAllGlobal;

        this.set = this.internal.setInstance;
        this.get = this.internal.getInstance;
        this.unset = this.internal.unsetInstance;
        this.getKeys = this.internal.getKeysInstance;
        this.getAll = this.internal.getAllInstance;
    };

    var _store = false;

    function getStore() {
        if (_store)
            return _store;
        return _store = new Store();
    }

// Backend
    var Backend = function () {
        this.internal = require('backend');

        this.connect = this.internal.connect;
        this.disconnect = this.internal.disconnect;
        this.isConnected = this.internal.connect;
        this.getBotClientUID = this.internal.getBotClientID;
        this.getBotClient = function () {
            return getClient(this.getBotClientUID);
        };
        this.getNick = this.internal.getNick;
        this.getChannelByID = function (id) {
            return getChannel(this.internal.getChannelByID(id));
        };
        this.getCurrentChannel = function () {
            return getChannel(this.internal.getCurrentChannel());
        };
        this.getChannelByName = function (name) {
            return getChannel(this.internal.getChannelByName(name));
        };
        this.getChannelCount = this.internal.getChannelCount;
        this.getChannels = function () {
            var channels = this.internal.getChannels();
            return upgrade(channels, getChannel);
        };
        this.getClients = function () {
            var clients = this.internal.getClients();
            return upgrade(clients, getClient);
        };
        this.getClientByID = function (id) {
            return getClient(this.internal.getClientByID(id));
        };
        this.getClientByName = function (name) {
            return getClient(this.internal.getClientByName(name));
        };
        this.getClientByNick = function (nick) {
            return getClient(this.internal.getClientByNick(nick));
        };
        this.getClientByUID = function (uid) {
            return getClient(this.internal.getClientByUID(uid));
        };
        this.message = this.internal.chat;

        this.getServerGroupByID = function (id) {
            return getServerGroup(this.internal.getServerGroupByID(id));
        };
        this.getChannelGroupByID = function (id) {
            return getChannelGroup(this.internal.getChannelGroupByID(id));
        };

    };

    var _backend = false;

    function getBackend() {
        if (_backend)
            return _backend;
        return _backend = new Backend();
    }

// Media
    var Media = function () {
        this.internal = require('media');

        this.playURL = this.internal.playURL;
        this.getCurrentTrack = function () {
            return getTrack(this.internal.getCurrentTrack())
        };
        this.getTrackByID = function (id) {
            return getTrack(this.internal.getTrackByID(id))
        };
        this.search = function (search) {
            return upgrade(this.internal.search(search), getTrack)
        };
        this.enqueue = function (track) {
            this.enqueue(getTrack(track).getURL())
        };
        this.addNext = function (track) {
            this.addNext(getTrack(track).getURL())
        };
        this.playNext = this.internal.playNext;
        this.playPrevious = this.internal.playPrevious;
        this.stop = this.internal.stop;
        this.getQueue = function () {
            return upgrade(this.internal.getQueue(), getTrack)
        };
        this.getPlaylists = function () {
            return upgrade(this.internal.getPlaylists(), getPlaylist)
        };
        this.getPlaylistByID = function (id) {
            return upgrade(this.internal.getPlaylistByID(id), getPlaylist)
        };
        this.getActivePlaylist = function () {
            return upgrade(this.internal.getActivePlaylist(), getPlaylist)
        };
        this.removeFromQueueByIndex = this.internal.removeFromQueue;
        this.clearQueue = this.internal.clearQueue;
        this.clearPlaylist = this.internal.clearPlaylist;
        this.yt = this.internal.yt;
        this.ytdl = this.internal.ytdl;
        this.ytdl = this.internal.ytdl;
        this.enqueueYt = this.internal.enqueueYt;
        this.enqueueYtdl = this.internal.enqueueYtdl;
    };
    var _media = false;

    function getMedia() {
        if (_media)
            return _media;
        return _media = new Media();
    }

// Audio
    var Audio = function () {
        this.internal = require('audio');

        this.setAudioFilter = this.internal.setAudioFilter;
        this.setAudioReturnChannel = this.internal.setAudioReturnChannel;
        this.startRecording = this.internal.startRecording;
        this.stopRecording = this.internal.stopRecording;
        this.isRecording = function () {
            return getBackend().getBotClient().isRecording();
        };
        this.toggleRecording = function () {
            this.isRecording() ? this.stopRecording() : this.startRecording();
        };

        this.streamTo = this.internal.streamToServer;
        this.stopStream = this.internal.stopStream;

        this.isRepeat = this.internal.isRepeat;
        this.setRepeat = this.internal.setRepeat;
        this.toggleRepeat = function () {
            this.setRepeat(!this.isRepeat());
            return this.isRepeat;
        };

        this.isShuffle = this.internal.isShuffle;
        this.setShuffle = this.internal.setShuffle;
        this.toggleShuffle = function () {
            this.setShuffle(!this.isShuffle());
            return this.isShuffle;
        };

        this.getVolume = this.internal.getVolume;
        this.setVolume = this.internal.setVolume;

        this.getTrackPosition = this.internal.getTrackPosition;
        this.seek = this.internal.seek;

        this.isMute = this.internal.isMute;
        this.setMute = this.internal.setMute;
        this.toggleMute = function () {
            this.setMute(!this.isMute());
            return this.isMute;
        };

        this.isPlayingMusic = this.internal.isPlaying;
        this.tts = this.internal.say;
    };
    var _audio = false;

    function getAudio() {
        if (_audio)
            return _audio;
        return _audio = new Audio();
    }

// Format
    var Format = function () {
        this.internal = require('format');

        this.color = this.internal.color;
        this.italic = this.internal.italic;
        this.bold = this.internal.bold;
        this.underline = this.internal.underline;
        this.code = this.internal.code;
        this.url = function (url, text) {
            if (text) {
                return "[URL url=" + url + "]" + text + "[/URL]";
            } else
                return "[URL]" + url + "[/URL]";
        }
    };

    var _format = false;

    function getFormat() {
        if (_format)
            return _format;
        return _format = new Format();
    }

// Helpers
    var Helpers = function () {
        this.internal = require('helpers');

        this.getRandom = function (min, max) {
            if (max) {
                return min + this.internal.getRandom(max - min);
            } else {
                return this.internal.getRandom(min)
            }
        };
        this.base64Encode = this.internal.base64Encode;
        this.base64Decode = this.internal.base64Decode;
        this.hexEncode = this.internal.hexEncode;
        this.md5sum = this.internal.MD5Sum;
        this.shaSum = this.internal.SHASum;
        this.sha256sum = this.internal.SHA256Sum;
    };

    var _helpers = false;

    function getHelpers() {
        if (_helpers)
            return _helpers;
        return _helpers = new Format();
    }

    function getClient(client) {
        var Client = function () {
            this.build = function(internal){
                this.getName = internal.name;
                this.getNick = internal.nick;
                this.getPhoneticName = internal.phoneticName;
                this.getID = internal.id;
                this.getUID = internal.uid;
                this.getDatabaseID = internal.databaseID;
                this.getCountryName = internal.country;
                this.getDescription = internal.description; // Broken
                this.setDescription = internal.setDescription;
                this.isInstance = internal.isSelf;
                this.isRecording = internal.isRecording;
                this.isMuted = internal.isMuted;
                this.isDeaf = internal.isDeaf;
                this.isAway = internal.isAway;
                this.getAwayMessage = internal.getAwayMessage;
                this.getPing = internal.getPing;
                this.getIPAddress = internal.getIPAddress;
                this.getOnlineTime = internal.getOnlineTime;
                this.getIdleTime = internal.getIdleTime;
                this.getPacketLoss = internal.getPacketLoss;
                this.getBytesReceived = internal.getBytesReceived;
                this.getBytesSent = internal.getBytesSent;
                this.getTotalConnections = function () {
                    var res = internal.getTotalConnections();
                    if (res <= 0)
                        return null;
                    return res;
                };
                this.getCreationTime = internal.getCreationTime;
                this.getChannels = internal.getChannels; // TODO should we ever need this?
                this.getChannel = internal.getChannel;

                this.getServerGroups = function () {
                    var groups = internal.getServerGroups();
                    return upgrade(groups, getServerGroup);
                };

                this.getClientGroups = function () {
                    var groups = internal.getClientGroups();
                    return upgrade(groups, getClientGroup);
                };

                this.message = internal.chat;
                this.poke = internal.poke;
                this.ban = internal.ban;
                this.kickFromServer = internal.kickFromServer;
                this.kickFromChannel = internal.kickFromChannel;
                this.addToServerGroup = function (group) {
                    var thi = this;
                    loop(group, function (k, v) {
                        thi.internal.addToServerGroup(getServerGroup(v).getID()());
                    });
                };
                this.removeFromServerGroup = function (group) {
                    var thi = this;
                    loop(group, function (k, v) {
                        thi.internal.removeFromServerGroup(getServerGroup(v).getID()());
                    });
                };

                this.setServerGroups = function (groups) {
                    this.removeFromServerGroup(this.getServerGroups());
                    this.addToServerGroup(groups);
                };

                this.moveTo = function (dest, pass) {
                    internal.moveTo(getChannel(dest).getID(), pass);
                };

                this.setSubscribed = internal.setSubscription;

                this.onChat = function(cb, filter) {
                    var thi = this;
                    getEvents().onChat(cb, function(ev) {
                        if (filter && !filter(ev))
                            return false;
                        return ev.source === ChatSources.CHANNEL && ev.channel.getID() === thi.getID();
                    });
                }
            }
        };

        return buildUnit(new Client(), client, 'Client', true, {
            'number': getBackend().internal.getClientByID,
            'string': getBackend().internal.getClientByUniqueID,
            'object': true
        });
    }

    function getChannel(channel) {
        var Channel = function () {

            this.build = function(internal){
                this.getID = internal.id;
                this.getName = internal.name;
                this.getParent = function () {
                    return getChannel(internal.parent());
                };
                this.getPosition = internal.position;
                this.moveTo = function (channel, order) {
                    // TODO Figure out how to move to root
                    internal.moveTo(getChannel(channel).getID(), order);
                };
                this.moveAfter = function (channel) {
                    channel = getChannel(channel);
                    this.moveTo(channel.getParent(), channel.getPosition() + 1);
                };
                this.moveBefore = function (channel) {
                    channel = getChannel(channel);
                    this.moveTo(channel.getParent(), channel.getPosition() - 1);
                };

                this.setName = internal.setName;
                this.getType = internal.type;
                this.getTopic = internal.topic;
                this.setTopic = internal.setTopic;
                this.getDescription = internal.description;
                this.setDescription = internal.setDescription;
                this.getCodec = internal.codec; // TODO Enum it!
                this.setCodec = internal.setCodec;
                this.getCodecQuality = internal.codecQuality; // 0 - 10
                this.setCodecQuality = internal.setCodecQuality;
                this.getMaxClients = internal.maxClients;
                this.setMaxClients = internal.setMaxClients;
                this.isPermanent = internal.isPermanent;
                this.isSemiPermanent = internal.isSemiPermanent;
                this.isTemporary = function () {
                    return this.getPermanence() === ChannelPermanence.TEMPORARY;
                };

                this.getPermanence = function () {
                    if (this.isPermanent())
                        return ChannelPermanence.PERMANENT;
                    if (this.isSemiPermanent())
                        return ChannelPermanence.SEMI_PERMANENT;
                    return ChannelPermanence.TEMPORARY;
                };

                this.isDefault = internal.isDefault;
                this.isPasswordProtected = internal.isPassworded;
                this.isEncrypted = internal.isEncrypted;

                this.message = internal.chat;
                this.getClients = function () {
                    return upgrade(internal.getClients(), getClient);
                };
                this.getClientCount = internal.getClientCount;
                this.setSubscription = internal.setSubscription;
                this.setChannelGroupFor = function (client, group) {
                    internal.setChannelGroup(getClient(client).getID(), getChannelGroup(group).getID());
                };

                this.update = internal.update;
            }
        };
        return buildUnit(new Channel(), channel, 'Channel', true, {
            'number': getBackend().internal.getChannelByID,
            'string': getBackend().internal.getChannelByName,
            'object': true
        });
    }

    var ChannelPermanence = {
        PERMANENT: 1,
        SEMI_PERMANENT: 2,
        TEMPORARY: 3
    };

    function getServerGroup(group) {
        var ServerGroup = function () {
            this.build = function(internal) {
                this.getID = internal.id;
                this.getName = internal.name;
            }
        };

        return buildUnit(new ServerGroup(), group, 'ServerGroup', true, {
            'number': getBackend().internal.getServerGroupByID,
            'object': true
        });
    }

    function getChannelGroup(group) {
        var ChannelGroup = function () {
            this.build = function(internal) {
                this.getID = internal.id;
                this.getName = internal.name;
            }
        };

        return buildUnit(new ChannelGroup(), group, 'ChannelGroup', true, {
            'number': getBackend().internal.getServerGroupByID,
            'object': true
        });
    }

    function getTrack(track) {
        var Track = function () {
            this.build = function(){
                this.getID = internal.id;
                this.getURL = internal.url;
                this.getType = internal.type;
                this.getTitle = internal.title;
                this.getArtist = internal.artist;
                this.getTempTitle = internal.tempTitle;
                this.getTempArtist = internal.tempArtist;
                this.getAlbum = internal.album;
                this.getGenre = internal.genre;
                this.getDuration = internal.duration;
                this.getTrackNumber = internal.trackNumber;
                this.getThumbnail = internal.duration;
                this.getFilename = internal.filename;
                this.play = internal.play;
                this.enqueue = internal.enqueue;
                this.setThumbnail = internal.setThumbnailFromURL;
                this.removeThumbnail = internal.removeThumbnail;
            };
        };

        return buildUnit(new Track(), track, 'Track', true, {
            'number': getMedia().getTrackByID,
            'object': true
        })
    }

    function getPlaylist(playlist) {
        var Playlist = function () {
            this.build = function (internal) {
                this.getID = internal.id;
                this.getName = internal.name;
                this.getTracks = function () {
                    var tracks = internal.getTracks();
                    return upgrade(tracks, getPlaylistTrack);
                };

                this.setActive = internal.setActive;
            }
        };

        return buildUnit(new Playlist(), playlist, 'Playlist', true, {
            'number': getMedia().getPlaylistByID,
            'object': true
        });
    }

    function getPlaylistTrack(playlistTrack) {
        var PlaylistTrack = function () {
            this.build = function(internal){
                this.getTitle = internal.title;
                this.getArtist = internal.artist;
                this.getAlbum = internal.album;
                this.getURL = internal.url;
                this.play = internal.play;
            }
        };

        return buildUnit(new PlaylistTrack(), playlistTrack, 'PlaylistTrack', true, {
            'object': true
        });
    }

// Utils
    function loop(arr, cb) {
        if (typeof arr === "object") {
            for (var i in arr) {
                if (arr.hasOwnProperty(i)) {
                    var res = cb(i, arr[i]);
                    if (res !== undefined)
                        return res;
                }
            }
        } else
            return cb(undefined, arr);
    }

    getEvents().chat(function(ev) {
        if (!ev.client.isInstance()) {
            sinusbot.log(ev.msg);
            return JSON.stringify(eval(ev.msg));
        }
    });
});