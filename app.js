// Reference the packages we require so that we can use them in creating the bot
var restify = require('restify');
var builder = require('botbuilder');

var rp = require('request-promise');

// Static variables that we can use anywhere in app.js
var BINGNEWSKEY = 'cbfe538a5a9a44b0ae989bdaa13507df';
var BINGCVKEY = 'a5ac77a11c4d4143be4b902dfd0724e8';
var lat;
var lon;

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

var _eQuatorialEarthRadius = 6378.1370;
var _d2r = (Math.PI / 180.0);

function HaversineInKM(lat1, long1, lat2, long2)
{
    var dlong = (long2 - long1) * _d2r;
    var dlat = (lat2 - lat1) * _d2r;
    var a = Math.pow(Math.sin(dlat / 2.0), 2.0) + Math.cos(lat1 * _d2r) * Math.cos(lat2 * _d2r) * Math.pow(Math.sin(dlong / 2.0), 2.0);
    var c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
    var d = _eQuatorialEarthRadius * c;

    return d;
}

function createHeroCard(session, block, street, postal, lat1, lon1, lat2, lon2) {
    var distance = HaversineInKM(lat1, lon1, lat2, lon2);
    var cards = [];
    return new builder.HeroCard(session)
        .title(block+" "+street)
        .subtitle("Postal code: "+postal)
        .text("Distance from here: "+distance)
        .images([
                //handle if thumbnail is empty
                builder.CardImage.create(session, "http://www.shunvmall.com/data/out/193/47806048-random-image.png")
            ])
        .buttons([
                // Pressing this button opens a url to google maps
                builder.CardAction.openUrl(session, "", "Go there")
    ]);
}

bot.dialog('/', intents);

bot.dialog('/sayHi', [
    function (session){
        builder.Prompts.text(session, "Send me your current location.");
    },
    function (session) {
        session.send("Getting your coordinates...");
        if(session.message.entities.length != 0){
            session.sendTyping();
            lat = session.message.entities[0].geo.latitude;
            lon = session.message.entities[0].geo.longitude;
            // session.endDialog(lat+", "+lon);
            var upplat = lat+0.2;
            var lowlat = lat-0.2;
            var upplon = lon+0.2;
            var lowlon = lon-0.2;
           // var results = 0;
            var url = "https://developers.onemap.sg/privateapi/themesvc/retrieveTheme?queryName=recyclingbins&token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjI4MSwidXNlcl9pZCI6MjgxLCJlbWFpbCI6Im9uZ2ppYXJ1aUBob3RtYWlsLmNvbSIsImZvcmV2ZXIiOmZhbHNlLCJpc3MiOiJodHRwOlwvXC8xMC4wLjMuMTE6ODA4MFwvYXBpXC92MlwvdXNlclwvc2Vzc2lvbiIsImlhdCI6MTQ4NDI4Mzk1NCwiZXhwIjoxNDg0NzE1OTU0LCJuYmYiOjE0ODQyODM5NTQsImp0aSI6IjIxYjhlODgxODQ1MmVlODVkZmU2NjRlOTU1YjI5M2I4In0.E7DM-ism_4Vt6JE4zElfsC6-QhAsldmPSGuMZH9AvgQ&extents="+lowlat+",%20"+lowlon+","+upplat+",%20"+upplon;
            // Build options for the request
            var options = {
                    uri: url,
                    json: true // Returns the response in json
            }
            rp(options).then(function (body){
                    console.log(body);
                    //results = body.SrchResults.length;
                    showLocationCards(session, body);
            }).catch(function (err){
                    // An error occurred and the request failed
                    console.log(err.message);
                    session.send("Argh, something went wrong. :( Try again?");
            }).finally(function () {
                    // This is executed at the end, regardless of whether the request is successful or not
                    session.endDialog();
            });
            
        }
        else{
            session.endDialog("Sorry, I didn't get your location.");
        }
    }
]);

// bot.dialog('/sayHi', [
//     function (session){
//         builder.Prompts.text(session, "Send me your current location.");
//     },
//     function (session) {
//         session.send("Getting your coordinates...");
//         if(session.message.entities.length != 0){
//             session.sendTyping();
//             lat = session.message.entities[0].geo.latitude;
//             lon = session.message.entities[0].geo.longitude;
//             // session.endDialog(lat+", "+lon);
//             var upplat = lat+0.1;
//             var lowlat = lat-0.1;
//             var upplon = lon+0.1;
//             var lowlon = lon-0.1;
//             var results = 0;
//             while (results < 5) {
//                 session.send("in while loop");
//                 var url = "https://developers.onemap.sg/privateapi/themesvc/retrieveTheme?queryName=recyclingbins&token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjI4MSwidXNlcl9pZCI6MjgxLCJlbWFpbCI6Im9uZ2ppYXJ1aUBob3RtYWlsLmNvbSIsImZvcmV2ZXIiOmZhbHNlLCJpc3MiOiJodHRwOlwvXC8xMC4wLjMuMTE6ODA4MFwvYXBpXC92MlwvdXNlclwvc2Vzc2lvbiIsImlhdCI6MTQ4NDI4Mzk1NCwiZXhwIjoxNDg0NzE1OTU0LCJuYmYiOjE0ODQyODM5NTQsImp0aSI6IjIxYjhlODgxODQ1MmVlODVkZmU2NjRlOTU1YjI5M2I4In0.E7DM-ism_4Vt6JE4zElfsC6-QhAsldmPSGuMZH9AvgQ&extents="+lowlat+",%20"+lowlon+","+upplat+",%20"+upplon;
//                 // Build options for the request
//                 var options = {
//                     uri: url,
//                     json: true // Returns the response in json
//                 }
//                 rp(options).then(function (body){
//                     console.log(body);
//                     results = body.SrchResults.length;
//                     if (body.SrchResulfs.length >= 5) {showLocationCards(session, body);}
//                 }).catch(function (err){
//                     // An error occurred and the request failed
//                     console.log(err.message);
//                     session.send("Argh, something went wrong. :( Try again?");
//                 }).finally(function () {
//                     // This is executed at the end, regardless of whether the request is successful or not
//                     session.endDialog();
//                 });
//                 upplat += 0.01;
//                 lowlat -= 0.01;
//                 upplon += 0.01;
//                 lowlon -= 0.01;
//             } 
//         }
//         else{
//             session.endDialog("Sorry, I didn't get your location.");
//         }
//     }
// ]);

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

function showLocationCards(session, body) {
    session.send("These are some nearby recycling bin locations.");
    session.sendTyping();
    var cards = [];
    for (i = 1; i < 6; i++) {
        var str = body.SrchResults[i].LatLng;
        var res = str.split(",");
        var distance = HaversineInKM(lat, lon, res[0], res[1]).toFixed(2);
        
        cards.push(new builder.HeroCard(session)
            .title(body.SrchResults[i].ADDRESSBLOCKHOUSENUMBER+" "+body.SrchResults[i].ADDRESSSTREETNAME)
            .subtitle("Distance from here: "+distance+" km")
            .images([
                    //handle if thumbnail is empty
                    builder.CardImage.create(session, "https://maps.googleapis.com/maps/api/streetview?size=600x300&location="+res[0]+","+res[1]+"&heading=151.78&pitch=-0.76&key=AIzaSyCJkSMIsK3ZPQHrBByW_nJTlamB3Bqe5JY")
                ])
            .buttons([
                    // Pressing this button opens a url to google maps
                    builder.CardAction.openUrl(session, "https://www.google.com/maps?saddr=My+Location&daddr="+res[0]+","+res[1], "Go there")
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
        builder.Prompts.text(session, "Please send me the url of the Image");
    }, function (session, results, next){
        // The user chose a category
        if (true) {
           //Show user that we're processing their request by sending the typing indicator
            session.sendTyping();
            // Build the url we'll be calling to get top news
            var url = "https://api.projectoxford.ai/vision/v1.0/tag";
            // Build options for the request
            var options = {
                method: 'POST', // thie API call is a post request
                uri: url,
                headers: {
                    'Ocp-Apim-Subscription-Key': '8f8a8f6cc5904b67ae4ac8e0f8d5dbcc',
                    'Content-Type': 'application/json'
                },
                body: {
                    url: session.message.attachments[0].contentUrl
                },
                json: true
            }
            
            //Make the call
                rp(options).then(function (body){
                    // The request is successful
                    console.log(body);
                    imageresults(session, results, body);
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

function imageresults(session, results, body){
    //session.send("Top news in " + results.response.entity + ": ");
    //Show user that we're processing by sending the typing indicator
    session.sendTyping();
    // The value property in body contains an array of all the returned articles
    var allArticles = body.tags;
    var finalresults = false;
    var leng = allArticles.length;
    console.log(leng);
    // Iterate through all 10 articles returned by the API
    for (var i = 0; i < leng; i++){
        var article = allArticles[i].name;
        var confid = allArticles[i].confidence;
        if (confid > 0.5){
            if(article == "drink" || article == "beverage" || article == "soft drink"){
                finalresults = true;
            }
        }
    }
    if(finalresults){
        session.endDialog("Recycle");
    }
    else{
        session.endDialog("oh its nothing");
    }  
}

