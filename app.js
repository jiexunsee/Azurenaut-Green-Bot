// Reference the packages we require so that we can use them in creating the bot
var restify = require('restify');
var builder = require('botbuilder');

var rp = require('request-promise');
var locationDialog = require('botbuilder-location');

// Static variables that we can use anywhere in app.js
var BINGNEWSKEY = 'cbfe538a5a9a44b0ae989bdaa13507df';
var BINGCVKEY = 'a5ac77a11c4d4143be4b902dfd0724e8';

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
// Listen for any activity on port 3978 of our local server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: 'd8e5c6ce-401d-4443-bf63-75cc48748c23',
    appPassword: 'reicQbSadPVMHV9TtC3ZdQt'
});
var bot = new builder.UniversalBot(connector);
// If a Post request is made to /api/messages on port 3978 of our local server, then we pass it to the bot connector to handle
server.post('/api/messages', connector.listen());

const LuisModelUrl = 'https://api.projectoxford.ai/luis/v2.0/apps/f1fe89c1-2004-4300-bd08-fb0d423a9699?subscription-key=2dd582fbf9de43d8be36029312dc4cd5&verbose=true';
var recogniser = new builder.LuisRecognizer(LuisModelUrl);

var intents = new builder.IntentDialog({recognizers:[recogniser]});
intents.matches(/\b(hi|hello|hey)\b/i,'/sayHi');
intents.matches('getNews', "/giveNews");
intents.matches('analyseImage', "/giveImageAnalysis");
intents.onDefault(builder.DialogAction.send("Sorry, I didn't understand what you said."))



//=========================================================
// Bots Dialogs
//=========================================================

// This is called the root dialog. It is the first point of entry for any message the bot receives

function MessageHandler(context, event) {
    if(event.messageobj.type=='location'){
          var lat = event.messageobj.latitude;
          var lang = event.messageobj.longitude;
          var url = event.message;
          context.sendResponse("Your lat:"+lat+"\n Your lang:"+lang+"\n MapURL:"+url);
    }
}

bot.dialog('/', intents);

//locationDialog.create(bot);
bot.library(locationDialog.createLibrary("Avk7vrPfKhrsEOu4Gmzx1ASa7eIEvEWqvrtkFjh0VBxuZ9RNj_FHeW2emKD57XFU"));
var options = {
    prompt: "Where should I ship your order? Type or say an address.",
    useNativeControl: true,
    reverseGeocode: false
};


bot.dialog('/sayHi', [
    function (session){
        locationDialog.getLocation(session, options);
        //builder.Prompts.text(session, "Send me your current location.");
    },
    function (session, results) {
        session.endDialog("end"+results.point[1]);
    },
    function (session) {
        if(session.message.entities.length != 0){
            session.userData.lat = session.message.entities[0].geo.latitude;
            var lon = session.message.entities[0].geo.longitude;
            //var lattt = session.message.entities[0].geo.longitude;
            session.endDialog(lon);
        }else{
            session.endDialog("Sorry, I didn't get your location.");
        }
    }
]);

bot.dialog('/giveNews', [
    function (session){
        // Ask the user which category they would like
        // Choices are separated by |
        builder.Prompts.choice(session, "Which category would you like?", "Technology|Science|Sports|Business|Entertainment|Politics|Health|World|(quit)");
    }, function (session, results, next){
        // The user chose a category
        if (results.response && results.response.entity !== '(quit)') {
           //Show user that we're processing their request by sending the typing indicator
            session.sendTyping();
            // Build the url we'll be calling to get top news
            var url = "https://api.cognitive.microsoft.com/bing/v5.0/news/?" 
                + "category=" + results.response.entity + "&count=10&mkt=en-US&originalImg=true";
            // Build options for the request
            var options = {
                uri: url,
                headers: {
                    'Ocp-Apim-Subscription-Key': BINGNEWSKEY
                },
                json: true // Returns the response in json
            }
            //Make the call
                rp(options).then(function (body){
                    // The request is successful
                    console.log(body);
                    sendTopNews(session, results, body);
                }).catch(function (err){
                    // An error occurred and the request failed
                    console.log(err.message);
                    session.send("Argh, something went wrong. :( Try again?");
                }).finally(function () {
                    // This is executed at the end, regardless of whether the request is successful or not
                    session.endDialog();
                });
        } else {
            // The user choses to quit
            session.endDialog("Ok. Mission Aborted.");
        }
    }
]);

function sendTopNews(session, results, body){
    session.send("Top news in " + results.response.entity + ": ");
    //Show user that we're processing by sending the typing indicator
    session.sendTyping();
    // The value property in body contains an array of all the returned articles
    var allArticles = body.value;
    var cards = [];
    // Iterate through all 10 articles returned by the API
    for (var i = 0; i < 10; i++){
        var article = allArticles[i];
        // Create a card for the article and add it to the list of cards we want to send
        cards.push(new builder.HeroCard(session)
            .title(article.name)
            .subtitle(article.datePublished)
            .images([
                //handle if thumbnail is empty
                builder.CardImage.create(session, article.image.contentUrl)
            ])
            .buttons([
                // Pressing this button opens a url to the actual article
                builder.CardAction.openUrl(session, article.url, "Full article")
            ]));
    }
    var msg = new builder.Message(session)
        .textFormat(builder.TextFormat.xml)
        .attachmentLayout(builder.AttachmentLayout.carousel)
        .attachments(cards);
    session.send(msg);
}

bot.dialog('/giveImageAnalysis', [
    function (session){
        // Ask the user which category they would like
        // Choices are separated by |
        builder.Prompts.choice(session, "Which category would you like?", "Technology|Science|Sports|Business|Entertainment|Politics|Health|World|(quit)");
    }, function (session, results, next){
        // The user chose a category
        if (results.response && results.response.entity !== '(quit)') {
           //Show user that we're processing their request by sending the typing indicator
            session.sendTyping();
            // Build the url we'll be calling to get top news
            var url = "https://developers.onemap.sg/privateapi/themesvc/retrieveTheme?queryName=recyclingbins&token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjI4MSwidXNlcl9pZCI6MjgxLCJlbWFpbCI6Im9uZ2ppYXJ1aUBob3RtYWlsLmNvbSIsImZvcmV2ZXIiOmZhbHNlLCJpc3MiOiJodHRwOlwvXC8xMC4wLjMuMTE6ODA4MFwvYXBpXC92MlwvdXNlclwvc2Vzc2lvbiIsImlhdCI6MTQ4NDI4Mzk1NCwiZXhwIjoxNDg0NzE1OTU0LCJuYmYiOjE0ODQyODM5NTQsImp0aSI6IjIxYjhlODgxODQ1MmVlODVkZmU2NjRlOTU1YjI5M2I4In0.E7DM-ism_4Vt6JE4zElfsC6-QhAsldmPSGuMZH9AvgQ&extents=1.291789,%20103.7796402,1.3290461,%20103.8726032";
            // Build options for the request
            var options = {
                uri: url,
                // headers: {
                //     'Ocp-Apim-Subscription-Key': BINGNEWSKEY
                // },
                json: true // Returns the response in json
            }
            //Make the call
                rp(options).then(function (body){
                    // The request is successful
                    console.log(body);
                    //sendTopNews(session, results, body);
                }).catch(function (err){
                    // An error occurred and the request failed
                    console.log(err.message);
                    session.send("Argh, something went wrong. :( Try again?");
                }).finally(function () {
                    // This is executed at the end, regardless of whether the request is successful or not
                    session.endDialog();
                });
        } else {
            // The user choses to quit
            session.endDialog("Ok. Mission Aborted.");
        }
    }
]);

// bot.dialog('/', function (session) {
//     // Send 'hello world' to the user
//     session.send("Hello World");
// });