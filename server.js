//*** PickIt Server ***//

//server definitions:
var express = require("express");
var server  = express();

//read files definitions:
var fs = require('fs');
var id3 = require('id3js');
const songsFolder = './songs/';
var player = require('play-sound')({player: "C:/Users/yottam/Desktop/mplayer-svn-37940/mplayer"});
var mp3Duration = require('mp3-duration');

//socket io
var io = require('socket.io').listen(1994).sockets;

//parameters
var songsArray = [];
var songID = 0;
var clients = [];
var songsDurations = [];
var currentSong;

//Common functions:
function sortSongArray() {
    songsArray.sort(function (songA, songB) {
        if( parseInt(songA.pickIts) > parseInt(songB.pickIts)){
        return -1;
        }

        else {
            return 1 ;
        }
    });
}

function emitAllClients(message) {
    if(message != null && clients.length > 0 ) {
        for(i = 0; i < clients.length; i++ ) {
            clients[i].emit(message);
        }
    }
}

function writeImageToFile(file, data) {
    return fs.writeFile(file, data,'base64', function (error) {
        if(error != null) {console.log(error);}
    });
}

function getDurationBySongName(songName) {
    for (i = 0; i < songsDurations.length ; i++) {

        if(songName === songsDurations[i]["songName"]) {
            return parseInt(songsDurations[i]["duration"]);
        }
    }
}

function playSongs() {
    if(currentSong != null) {
        songsArray.push(currentSong);
    }

    currentSong = songsArray[0];
    var currentSongIndex = songsArray.indexOf(currentSong);
    songsArray.splice(currentSongIndex,currentSongIndex + 1);

    emitAllClients("true");

    var path =  __dirname + songsFolder + currentSong["songName"];
    currentSong["pickIts"] = "0";
    var songDuration = getDurationBySongName(currentSong["songName"]) * 1000 + 1000;

    console.log("Now Playing : " + path );
    player.play(path,{maxBuffer: 1024 * 200000000000}, function(err){
        if (err) throw err
    });

    setTimeout(playSongs, songDuration)
}

if(songsArray.length == 0) {
    fs.readdir(songsFolder, function (err, files) {
        files.forEach(function( file) {
            id3({ file: songsFolder + file, type: id3.OPEN_LOCAL }, function(err, tags) {

                mp3Duration(songsFolder + file , function (err, duration) {
                    if (err) return console.log(err.message);
                    console.log('Your file is ' + file + "time:" + duration + ' seconds long');
                    var songsDurationJson = {};
                    songsDurationJson["songName"] = file;
                    songsDurationJson["duration"] = duration;
                    songsDurations.push(songsDurationJson);
                });

                var songsJson = {};

                songID ++;
                songsJson["songName"] = file;
                songsJson["artist"] = tags["artist"];
                songsJson["pickIts"] =  "0";
                songsJson["songID"] = songID.toString();

                songsArray.push(songsJson);
            });
        });
    })
}

setTimeout(playSongs, 20000);

//Server Services:
io.on('connection', function(socket){
    clients.push(socket);
});

server.get("/getAllSongs",function(request,response) {
    var songJson = {};
    songJson["songs"] = songsArray;
    response.send(songJson);
});

server.get("/getCurrentPlayingSong",function (request, response) {
    var messageToSend = [];
    var songJson = {};
    messageToSend.push(currentSong);
    songJson["songs"] = messageToSend;
    response.send(songJson);
});

server.get("/searchSong",function (request, response) {
    var songName = request.query.songName.toLowerCase();
    var searchResolt = [];

    for(i = 0; i < songsArray.length; i++) {
        var currentSongName = songsArray[i].songName.toLowerCase();

        if(currentSongName.includes(songName)) {
            searchResolt.push(songsArray[i]);
        }
    }

    response.send(searchResolt);
});

server.get("/updatePickIt",function (request, response) {
    var songID = request.query.id;
    for(i = 0; i < songsArray.length; i++) {
        if(parseInt(songsArray[i].songID) == songID) {
            var pickIts = parseInt(songsArray[i].pickIts);
            songsArray[i].pickIts = JSON.stringify(pickIts += 1);
        }
    }

    sortSongArray();
    emitAllClients("true");

    response.send({status: "true"});
});

server.get("/2",function (request, response) {
    setTimeout(function(){
        var songsToSend =[];

        for(i = 0; i < 6; i++) {
            var song = songsArray[i];
            if(song != null){
                songsToSend.push(song);
            }
        }
        response.send(songsToSend);

    },100);
});

server.listen(1995);
console.log("Port 1995");