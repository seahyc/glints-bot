
// Auth Token - You can generate your token from 
// https://<slack_name>.slack.com/services/new/bot
var token = process.env.TOKEN;
var request = require('request');
// This is the main Bot interface
var superscript = require("superscript");
var mongoose = require("mongoose");
mongoose.connect('mongodb://localhost/superscriptDB');

// slack-client provides auth and sugar around dealing with the RealTime API.
var Slack = require("slack-client");

var debug = require('debug')("Slack Client");
var facts = require("sfacts");
var factSystem = facts.explore("botfacts");
var TopicSystem = require("superscript/lib/topics/index")(mongoose, factSystem);

// How should we reply to the user? 
// direct - sents a DM
// atReply - sents a channel message with @username
// public sends a channel reply with no username
var replyType = "atReply";

var atReplyRE = /<@(.*?)>/;
var options = {};
options['factSystem'] = factSystem;
options['mongoose'] = mongoose;

var slack = new Slack(token, true, true);

var botHandle = function(err, bot) {
  slack.login();

  slack.on('error', function(error) {
    console.error("Error:");
    console.log(error);
  });

  slack.on('open', function(){
    var channel, channels, group, groups, id, messages, unreads;
    channels = [];
    groups = [];
    unreads = slack.getUnreadCount();
    channels = (function() {
      var _ref, _results;
      _ref = slack.channels;
      _results = [];
      for (id in _ref) {
        channel = _ref[id];
        if (channel.is_member) {
          _results.push("#" + channel.name + ' ('+id+')');
        }
      }
      return _results;
    })();
    groups = (function() {
      var _ref, _results;
      _ref = slack.groups;
      _results = [];
      for (id in _ref) {
        group = _ref[id];
        if (group.is_open && !group.is_archived) {
          _results.push(group.name + ' ('+id+')');
        }
      }
      return _results;
    })();
    console.log("Welcome to Slack. You are %s of %s", slack.self.name, slack.team.name);
    console.log('You are in: ' + channels.join(', '));
    console.log('As well as: ' + groups.join(', '));
    messages = unreads === 1 ? 'message' : 'messages';
    console.log("You have " + unreads + " unread " + messages);
    var startDate = new Date("2015-09-02T16:00:00");
    var endDate = new Date("2015-09-03T16:00:00");
    if (new Date()>= startDate && new Date() <= endDate){
      var channel = slack.getChannelGroupOrDMByID('G08BVV1MY');
      setInterval(function(){
        if (new Date().getMinutes() === 0 || new Date().getMinutes() === 30){
          request.get('http://api.icndb.com/jokes/random?escape=javascript', function (err, res, body){
            var results = JSON.parse(body);
            var joke = results.value.joke;
            joke = joke.replace('Chuck Norris', 'Wong Yong Jie');
            // console.log(results);
            channel.send('@yjwong: :sensei: Glints wishes you a *Happy Birthday* :birthday:!\n*Here\'s a true story:* :scream_cat: ' + joke);
          })
        }
      }, 60000);
    }
  });

  slack.on('close', function() {
    console.warn("Disconnected");
  });

  slack.on('message', function(data) {
    receiveData(slack, bot, data);
  });
};

var receiveData = function(slack, bot, data) {

  // Fetch the user who sent the message;
  var user = data._client.users[data.user];
  var channel;
  var messageData = data.toJSON();
  var message = "";

  if (messageData && messageData.text) {
    message = "" + messageData.text.trim();
  }

  var keywordMatch = message.match(/./);
  
  
  var match = message.match(atReplyRE);
  
  // Are they talking to us?
  if (match && match[1] === slack.self.id || keywordMatch) {
    message = message.replace(atReplyRE, '').trim();
    if (message[0] == ':') {
        message = message.substring(1).trim();
    }

    bot.reply(user.name, message, function(err, reply){
      // We reply back direcly to the user
      if (!reply.string) {
        replyType = 'public';
       }

      switch (replyType) {
        case "direct":
          channel = slack.getChannelGroupOrDMByName(user.name);
          break;
        case "atReply":
          reply.string = "@" + user.name  + " " + reply.string;
          channel = slack.getChannelGroupOrDMByID(messageData.channel);
          break;
        case "public":
          channel = slack.getChannelGroupOrDMByID(messageData.channel);
          break;
      }

      if (reply.string && user.id != slack.self.id) {
        channel.send(reply.string);
      }
        
    });

  } else if (messageData.channel[0] == "D") {
    bot.reply(user.name, message, function(err, reply){
      channel = slack.getChannelGroupOrDMByName(user.name);
      if (reply.string) {
        channel.send(reply.string);
      }
    });
  } else {
    console.log("Ignoring...", messageData);
  }
};

// Main entry point
TopicSystem.importerFile('./data.json', function(){
  new superscript(options, function(err, botInstance){
    botHandle(null, botInstance);
  });
});
